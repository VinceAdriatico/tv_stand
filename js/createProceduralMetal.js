import * as THREE from 'three';

export function createProceduralMetal() {
    // 1. Create a Standard Material
    // We set the baseline properties here, which we will alter in the shader
    const material = new THREE.MeshStandardMaterial({
        color: 0x222222, // Dark grey baseline
        roughness: 0.5,  // Baseline roughness
        metalness: 1.0   // It's an outdoor fixture!
    });

    // Force Three.js to compile the shader with UVs enabled
    material.defines = { USE_UV: '' };

    // 2. Inject our custom math into the standard shader
    material.onBeforeCompile = (shader) => {
        // Add our custom uniforms matching the Blender node values
        shader.uniforms.grainScale = { value: 150.0 }; // Fine powder coat
        shader.uniforms.grungeScale = { value: 4.0 };  // Large weather spots
        shader.uniforms.cleanColor = { value: new THREE.Color(0x333333) };
        shader.uniforms.dustColor = { value: new THREE.Color(0x888888) };

        // Inject the noise functions at the top of the fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>

            uniform float grainScale;
            uniform float grungeScale;
            uniform vec3 cleanColor;
            uniform vec3 dustColor;

            // Simple 2D pseudo-random number generator
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            // Basic 2D noise function
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);

                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));

                vec2 u = f * f * (3.0 - 2.0 * f);

                return mix(a, b, u.x) +
                       (c - a)* u.y * (1.0 - u.x) +
                       (d - b) * u.x * u.y;
            }

            // FBM (Fractal Brownian Motion)
            // This layers noise to create that organic, chaotic dirt look
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            `
        );

        // Inject Roughness Logic (The Weathering)
        // This overrides how shiny the material is based on our noise
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            
            // Apply scale (Mapping Node)
            vec2 grungeUV = vUv * grungeScale;
            
            // Domain Warping: Creates the "Distortion" from the Blender Noise node
            vec2 distortion = vec2(fbm(grungeUV), fbm(grungeUV + vec2(5.2, 1.3)));
            float grungeMap = fbm(grungeUV + distortion * 0.8);
            
            // smoothstep is our Color Ramp! (Crunching blacks at 0.4, whites at 0.6)
            float grungeRamp = smoothstep(0.4, 0.6, grungeMap);
            
            // mix is how we assign roughness. Clean metal (0.3), dusty spots (0.8)
            roughnessFactor = mix(0.3, 0.8, grungeRamp);
            `
        );

        // Inject Color and Bump Logic (The Powder Coat)
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            
            // Generate the tiny grain for the powder coat
            float grain = noise(vUv * grainScale);
            
            // Re-calculate the grunge map to color the dusty spots
            vec2 gUV = vUv * grungeScale;
            vec2 dist = vec2(fbm(gUV), fbm(gUV + vec2(5.2, 1.3)));
            float gMap = fbm(gUV + dist * 0.8);
            float gRamp = smoothstep(0.4, 0.6, gMap);

            // Mix base metal color with dust color
            vec3 finalColor = mix(cleanColor, dustColor, gRamp);
            
            // Fake Bump Mapping: Darken the color slightly in the crevices of the grain
            finalColor *= (0.9 + 0.1 * grain);
            
            diffuseColor = vec4(finalColor, 1.0);
            `
        );
    };

    return material;
}