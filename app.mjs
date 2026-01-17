import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';

console.log("Station Saver VR v0.6 - Smooth Joints");

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

// --- ROHR LOGIK ---
const pipes = [];
const startZ = -8.75;
const segmentLength = 2.5;
const heightMap = [1, 1, 0, 0, 1, 1, 1, 1]; 

const HIGH_Y = 1.3;
// WICHTIG: Erhöht auf 0.75, damit es NICHT mehr in der Schräge steckt
const LOW_Y = 0.75; 

// Neue Funktion für saubere Verbindungen mit Kugel-Gelenken
function createVerticalConnector(x, yStart, yEnd, z) {
    const height = Math.abs(yEnd - yStart);
    const midY = (yStart + yEnd) / 2;
    
    // Das vertikale Rohr
    const geo = new THREE.CylinderGeometry(0.07, 0.07, height, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, midY, z);
    scene.add(mesh);

    // KUGEL-GELENKE (Oben und Unten)
    // Radius 0.09 passt zur Muffe und ist dicker als das Rohr (0.07)
    const jointGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const topJoint = new THREE.Mesh(jointGeo, jointMat);
    topJoint.position.set(x, yEnd, z); // Oben am Anschluss
    scene.add(topJoint);

    const botJoint = new THREE.Mesh(jointGeo, jointMat);
    botJoint.position.set(x, yStart, z); // Unten am Anschluss
    scene.add(botJoint);
}

for (let i = 0; i < 8; i++) {
    const zPos = startZ + (i * segmentLength);
    const yLeft = heightMap[i] === 1 ? HIGH_Y : LOW_Y;
    const yRight = heightMap[i] === 1 ? HIGH_Y : LOW_Y;

    pipes.push(new Pipe(scene, zPos, true, yLeft));
    
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yLeft) {
            createVerticalConnector(-1.45, prevY, yLeft, zPos - 1.25);
        }
    }

    pipes.push(new Pipe(scene, zPos, false, yRight));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yRight) {
            createVerticalConnector(1.45, prevY, yRight, zPos - 1.25);
        }
    }
}

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