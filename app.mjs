import * as THREE from 'three';
// Wir brauchen den VRButton aus den Addons, die dein Prof auch definiert hat
import { VRButton } from 'three/addons/webxr/VRButton.js';

console.log("ThreeJs Version: " + THREE.REVISION);

const width = window.innerWidth;
const height = window.innerHeight;

// --- INIT ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // Dunkelgrau für Korridor

const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 100);
// In VR ist die Kamera-Position eigentlich egal (das Headset steuert sie), 
// aber für den Browser setzen wir sie auf Kopfhöhe.
camera.position.set(0, 1.6, 3);

// Lichter (wie beim Prof, aber heller für unseren Raum)
scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 2, 0);
scene.add(light);

// Ein Test-Würfel (damit wir sehen, dass es klappt)
const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 1.6, -1); // Schwebt vor deinem Gesicht
scene.add(cube);

// Hilfsgitter am Boden
const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.xr.enabled = true; // WICHTIG: VR aktivieren!
document.body.appendChild(renderer.domElement);

// VR Button ins Menü einfügen
const buttonContainer = document.getElementById('vr-button-container');
if(buttonContainer) {
    buttonContainer.appendChild(VRButton.createButton(renderer));
}

// Menü ausblenden, wenn VR startet
renderer.xr.addEventListener('sessionstart', () => {
    document.getElementById('overlay').style.display = 'none';
});
renderer.xr.addEventListener('sessionend', () => {
    document.getElementById('overlay').style.display = 'flex';
});

// Animations-Loop (startet automatisch)
renderer.setAnimationLoop(animate);

// --- ANIMATION ---

function animate(time) {
    // Würfel drehen
    cube.rotation.x = time / 2000;
    cube.rotation.y = time / 1000;

    renderer.render(scene, camera);
}

// Fenstergröße anpassen
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});