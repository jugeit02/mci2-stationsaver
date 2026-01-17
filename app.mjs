import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';

console.log("Station Saver VR v0.5 - Wave Pipes");

let hasSparePart = false;

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 0, 15); 

const cameraGroup = new THREE.Group();
scene.add(cameraGroup);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); 
cameraGroup.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; 
document.body.appendChild(renderer.domElement);
document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));

renderer.xr.addEventListener('sessionstart', () => document.getElementById('overlay').style.display = 'none');
renderer.xr.addEventListener('sessionend', () => document.getElementById('overlay').style.display = 'flex');


// --- SZENE ---
const environment = new Environment(scene);

// --- ROHR GENERATOR MIT HÖHEN-PROFIL ---
const pipes = [];
const startZ = -8.75;
const segmentLength = 2.5;

// Das Muster: 1 = Oben (Standard), 0 = Unten (Boden-nah)
// Index:     0  1  2  3  4  5  6  7 
const heightMap = [1, 1, 0, 0, 1, 1, 1, 1]; 

// Die echten Höhen in Metern
const HIGH_Y = 1.3;
const LOW_Y = 0.5;

// Hilfsfunktion für vertikale Verbindungen
function createVerticalConnector(x, yStart, yEnd, z) {
    const height = Math.abs(yEnd - yStart);
    const midY = (yStart + yEnd) / 2;
    
    const geo = new THREE.CylinderGeometry(0.07, 0.07, height, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, midY, z);
    
    // Schwarze Ringe an den Enden des Vertikal-Stücks
    const jointGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    
    const topJoint = new THREE.Mesh(jointGeo, jointMat);
    topJoint.position.y = height/2;
    mesh.add(topJoint);
    
    const botJoint = new THREE.Mesh(jointGeo, jointMat);
    botJoint.position.y = -height/2;
    mesh.add(botJoint);

    scene.add(mesh);
}

// Wir gehen durch die 8 Segmente
for (let i = 0; i < 8; i++) {
    const zPos = startZ + (i * segmentLength);
    
    // Höhe bestimmen
    const yLeft = heightMap[i] === 1 ? HIGH_Y : LOW_Y;
    // Für Rechts machen wir es vielleicht versetzt? Nein, symmetrisch sieht technischer aus.
    const yRight = heightMap[i] === 1 ? HIGH_Y : LOW_Y;

    // --- LINKE SEITE ---
    // 1. Das horizontale Rohr
    pipes.push(new Pipe(scene, zPos, true, yLeft));
    
    // 2. Verbindung zum VORGÄNGER prüfen (ab i=1)
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        // Wenn sich die Höhe geändert hat, brauchen wir ein vertikales Rohr
        if (prevY !== yLeft) {
            // Verbindung sitzt genau am Anfang dieses Segments (zPos - 1.25)
            createVerticalConnector(-1.45, prevY, yLeft, zPos - 1.25);
        }
    }

    // --- RECHTE SEITE ---
    pipes.push(new Pipe(scene, zPos, false, yRight));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yRight) {
            createVerticalConnector(1.45, prevY, yRight, zPos - 1.25);
        }
    }
}


// Interaktions-Logik
function onObjectClicked(object) {
    const pipeRef = object.userData.pipe; 
    if (object.name === 'spare_part') {
        if (!hasSparePart && pipeRef.pickupPart()) {
            hasSparePart = true;
        }
    }
    if (object.name === 'pipe_gap') {
        if (hasSparePart && pipeRef.isBroken) {
            pipeRef.repair();
            hasSparePart = false;
        }
    }
}

const controls = new VRControls(renderer, scene, cameraGroup, onObjectClicked);

// Loop
const clock = new THREE.Clock();
let lastBreakTime = 0;

renderer.setAnimationLoop(() => {
    const time = clock.getElapsedTime();

    if (time - lastBreakTime > 6) { 
        lastBreakTime = time;
        const randomPipe = pipes[Math.floor(Math.random() * pipes.length)];
        randomPipe.breakPipe();
    }

    if (controls) controls.update();
    pipes.forEach(pipe => pipe.update());
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});