import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadModel } from './loadModel.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { createProceduralBark } from './createProceduralBark.js'; 
import { createProceduralMetal } from './createProceduralMetal.js'; 

let camera, scene, renderer, controls;

init();

async function init() {
    const container = document.getElementById('container');

    // 1. RENDERER SETUP
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 2. SCENE & CAMERA
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(100, 40, 20);

    // 3. DEBUG HELPERS
    // const gridHelper = new THREE.GridHelper(20, 20);
    // scene.add(gridHelper);

    // Increased intensity (3.0) to mimic high-noon sun
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0); 

    // Position it high and at an angle
    sunLight.position.set(50, 100, 50); 

    // Enable shadows (Essential for the "Sun" feel)
    sunLight.castShadow = true;

    // Improve shadow quality
    sunLight.shadow.mapSize.width = 2048; 
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;

    scene.add(sunLight);

    // Ambient light acts as the "Sky Tint" (fill light)
    // Set it to a slight blue to mimic sky bounce
    scene.add(new THREE.AmbientLight(0xddeeff, 0.4));

    // 4. EXR HDRI LOAD
    new EXRLoader().load('default.exr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        console.log("✅ EXR HDRI Loaded");
    });

    // 5. GLB LOAD
    loadModel({
        scene,
        modelPath: 'coffee-table_tv-stand-top.glb',
        onLoad: (model) => {
            console.log("✅ GLB Loaded");
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            // Enable the automatic spin
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5; // Adjust this for faster/slower spinning
            controls.target.copy(center);

            model.traverse((child) => {
                if (child.isMesh) {
                    // Swap whatever material came from the GLB with your procedural math material!
                    child.material = createProceduralBark();
                }
            });

        }
    });

    // 5. COFFEE TABLE LOAD
    loadModel({
        scene,
        modelPath: 'coffee-table_tv-stand-bottom.glb',
        onLoad: (model) => {
            console.log("✅ Coffee Table Loaded");

            // 1. Center camera on the new model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            controls.target.copy(center);

            // 2. Apply Bark to all parts of the table
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = createProceduralMetal();
                    
                    // Allow the Sun to cast shadows ON the table
                    // and the table to cast shadows on the floor
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(model);
        }
    });

    // 6. CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        controls.update();
        if (controls.enabled) {
            // console.log(`Camera Pos: x:${camera.position.x.toFixed(2)}, y:${camera.position.y.toFixed(2)}, z:${camera.position.z.toFixed(2)}`);
        }
    }

    renderer.render(scene, camera);
}