import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Unsere neuen Module importieren
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';

console.log("Station Saver VR v0.1");

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Sehr dunkel
// Nebel, damit das Ende des Tunnels weich aussieht
scene.fog = new THREE.Fog(0x111111, 0, 25); 

// Kamera-Gruppe (Dolly) - Wichtig für Teleportation!
// Wir verschieben nicht die Kamera selbst, sondern den "Wagen" (Group), auf dem sie steht.
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); // Start-Höhe
cameraGroup.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // VR an!
document.body.appendChild(renderer.domElement);

// VR Button
document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));

// UI Overlay Logik
renderer.xr.addEventListener('sessionstart', () => document.getElementById('overlay').style.display = 'none');
renderer.xr.addEventListener('sessionend', () => document.getElementById('overlay').style.display = 'flex');


// --- UNSERE SPIEL-MODULE ---

// 1. Umgebung bauen
const environment = new Environment(scene);

// 2. Steuerung aktivieren
// Wir übergeben cameraGroup, damit der Spieler bewegt werden kann
const controls = new VRControls(renderer, scene, cameraGroup);


// --- LOOP ---
renderer.setAnimationLoop(render);

function render() {
    // Steuerung updaten (für den Raycaster/Zielstrahl)
    if (controls) controls.update();

    renderer.render(scene, camera);
}

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});