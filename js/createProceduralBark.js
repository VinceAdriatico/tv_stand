import * as THREE from 'three';

export function createProceduralBark() {
    // 1. Create a Standard Material so it reacts to your EXR and lights
    const material = new THREE.MeshStandardMaterial({
        roughness: 0.9, // Bark is rough, not shiny
        metalness: 0.0
    });

    // Force Three.js to compile the shader with UVs enabled
    material.defines = { USE_UV: '' };

    // 2. Inject our custom math into the standard shader
    material.onBeforeCompile = (shader) => {
        // Add our custom uniforms
        shader.uniforms.noiseScale = { value: 15.0 };
        shader.uniforms.baseColor = { value: new THREE.Color(0x4a3018) };
        shader.uniforms.stripeColor = { value: new THREE.Color(0x1e1208) };

        // Inject the noise functions at the top of the fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            
            uniform float noiseScale;
            uniform vec3 baseColor;
            uniform vec3 stripeColor;

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
            `
        );

        // Inject the color mixing logic right before the lighting gets calculated
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            
            // Stretch the UVs vertically (Y-axis) to create long bark-like grain
            vec2 st = vUv * vec2(noiseScale, noiseScale * 0.1);
            
            // Layer the noise to create rougher turbulence
            float n = noise(st);
            n += 0.5 * noise(st * 2.0);
            n += 0.25 * noise(st * 4.0);
            n = n / 1.75; // Normalize
            
            // Override the standard material's diffuse color with our procedural bark
            diffuseColor = vec4(mix(stripeColor, baseColor, n), 1.0);
            `
        );
    };

    return material;
}