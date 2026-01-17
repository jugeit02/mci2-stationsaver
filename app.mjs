import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';

console.log("Station Saver VR v0.7 - UI Screen");

let hasSparePart = false;

// --- GAME STATS ---
let timeLeft = 120.0; // 2 Minuten
let oxygen = 100.0;
let isGameOver = false;

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

// --- ROHRE ---
const pipes = [];
const startZ = -8.75;
const segmentLength = 2.5;
const heightMap = [1, 1, 0, 0, 1, 1, 1, 1]; 
const HIGH_Y = 1.3;
const LOW_Y = 0.75; 

function createVerticalConnector(x, yStart, yEnd, z) {
    const height = Math.abs(yEnd - yStart);
    const midY = (yStart + yEnd) / 2;
    
    const geo = new THREE.CylinderGeometry(0.07, 0.07, height, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, midY, z);
    scene.add(mesh);

    const jointGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const topJoint = new THREE.Mesh(jointGeo, jointMat);
    topJoint.position.set(x, yEnd, z); scene.add(topJoint);
    const botJoint = new THREE.Mesh(jointGeo, jointMat);
    botJoint.position.set(x, yStart, z); scene.add(botJoint);
}

for (let i = 0; i < 8; i++) {
    const zPos = startZ + (i * segmentLength);
    const yLeft = heightMap[i] === 1 ? HIGH_Y : LOW_Y;
    const yRight = heightMap[i] === 1 ? HIGH_Y : LOW_Y;

    pipes.push(new Pipe(scene, zPos, true, yLeft));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yLeft) createVerticalConnector(-1.45, prevY, yLeft, zPos - 1.25);
    }

    pipes.push(new Pipe(scene, zPos, false, yRight));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yRight) createVerticalConnector(1.45, prevY, yRight, zPos - 1.25);
    }
}

function onObjectClicked(object) {
    if (isGameOver) return; // Nichts mehr tun wenn Game Over

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
            // Kleiner Bonus: Sauerstoff etwas auffüllen?
            oxygen = Math.min(100, oxygen + 5); 
        }
    }
}

const controls = new VRControls(renderer, scene, cameraGroup, onObjectClicked);

// Loop
const clock = new THREE.Clock();
let lastBreakTime = 0;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta(); // Zeit seit letztem Frame in Sekunden
    const time = clock.getElapsedTime();

    if (!isGameOver) {
        // 1. Zeit runterzählen
        timeLeft -= delta;

        // 2. Anzahl kaputter Rohre zählen
        let brokenCount = 0;
        pipes.forEach(p => { if(p.isBroken) brokenCount++; });

        // 3. Sauerstoff berechnen
        // Basis-Verlust: 0.5 pro Sekunde
        // Pro kaputtes Rohr: +1.5 pro Sekunde
        const lossRate = 0.5 + (brokenCount * 1.5);
        oxygen -= lossRate * delta;

        // Game Over Bedingungen
        if (timeLeft <= 0 || oxygen <= 0) {
            isGameOver = true;
            oxygen = Math.max(0, oxygen);
            timeLeft = Math.max(0, timeLeft);
            // Optional: Hier könnte man den Screen rot färben
        }

        // 4. Rohre kaputt machen (Generator)
        if (time - lastBreakTime > 6) { 
            lastBreakTime = time;
            const randomPipe = pipes[Math.floor(Math.random() * pipes.length)];
            randomPipe.breakPipe();
        }

        // 5. Screen Update
        // Wir übergeben die Werte an Environment, damit es den Canvas malt
        environment.updateInfoScreen(timeLeft, oxygen);
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