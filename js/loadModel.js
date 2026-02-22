import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadModel({ scene, modelPath, onLoad }) {
    const loader = new GLTFLoader();
    // Vite serves /public files from the root
    loader.load(modelPath, (gltf) => {
        scene.add(gltf.scene);
        if (onLoad) onLoad(gltf.scene);
    }, undefined, (err) => console.error("GLB Load Error:", err));
}