import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';

console.log("Station Saver VR v1.4 - Vertical Pipes & Regen");

let hasSparePart = false;

// --- GAME STATS ---
let timeLeft = 180.0;
let oxygen = 100.0;
let isGameOver = false;

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

const environment = new Environment(scene);

const pipes = [];
const startZ = -8.75;
const segmentLength = 2.5;
const heightMap = [1, 0, 1, 0, 1, 0, 1, 0]; 

const HIGH_Y = 1.3;
const LOW_Y = 0.75; 

// Neue Funktion: Erstellt eine ECHTE Pipe (interaktiv) statt nur Deko
function addVerticalPipe(x, yStart, yEnd, z, isLeft) {
    const midY = (yStart + yEnd) / 2;
    // Wir erstellen eine Pipe mit isVertical = true
    // Pipe Constructor: (scene, positionZ, isLeftWall, heightY, isVertical)
    // Achtung: positionZ ist hier z - 1.25 (die Kante zwischen Segmenten)
    
    // Wir fügen sie zur Liste hinzu, damit sie kaputt gehen kann!
    pipes.push(new Pipe(scene, z, isLeft, midY, true));

    // Gelenke bleiben Deko (Kugeln), die gehen nicht kaputt
    const jointGeo = new THREE.SphereGeometry(0.075, 16, 16);
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
    
    // Horizontale Rohre
    pipes.push(new Pipe(scene, zPos, true, yLeft, false));
    
    // Vertikale Verbindungen (Links)
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yLeft) {
            // Hier nutzen wir jetzt die neue Funktion
            addVerticalPipe(-1.45, prevY, yLeft, zPos - 1.25, true);
        }
    }

    // Horizontale Rohre (Rechts)
    pipes.push(new Pipe(scene, zPos, false, yRight, false));
    
    // Vertikale Verbindungen (Rechts)
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yRight) {
            addVerticalPipe(1.45, prevY, yRight, zPos - 1.25, false);
        }
    }
}

function isAligned(controller, targetPipe) {
    // Wenn Pipe vertikal ist, muss Controller nach OBEN/UNTEN zeigen (Y-Achse)
    // Wenn Pipe horizontal ist, muss Controller nach RECHTS/LINKS zeigen (X-Achse, weil quer gehalten)
    
    // Wir nehmen die lokale X-Achse des Controllers (da Rohr quer in Hand)
    const controllerVector = new THREE.Vector3(1, 0, 0); 
    controllerVector.applyQuaternion(controller.quaternion); 

    let targetVector;
    if (targetPipe.isVertical) {
        targetVector = new THREE.Vector3(0, 1, 0); // Y-Achse
    } else {
        targetVector = new THREE.Vector3(0, 0, 1); // Z-Achse
    }

    const angle = controllerVector.angleTo(targetVector);
    const tolerance = THREE.MathUtils.degToRad(20); // 20 Grad Toleranz

    return angle < tolerance || angle > (Math.PI - tolerance);
}


function onInteract(object, actionType, controller) {
    if (isGameOver) return;

    if (actionType === 'start') {
        if (object && object.name === 'spare_part') {
            const pipeRef = object.userData.pipe;
            if (!controller.userData.hasPart && pipeRef.pickupPart()) {
                controller.userData.hasPart = true;
                controller.userData.heldPipeRef = pipeRef; 
                controls.pickupPart(controller); 
            }
        }
    }

    if (actionType === 'end') {
        if (controller.userData.hasPart) {
            
            if (object && object.name === 'pipe_gap') {
                const targetPipe = object.userData.pipe;
                if (targetPipe.isBroken && isAligned(controller, targetPipe)) { 
                    targetPipe.repair();
                    //controller.userData.hasPart = false;  <-- Fehler im vorherigen Snippet (doppelt)
                    //controller.userData.heldPipeRef = null;
                    controls.dropPart(controller);
                    // Wir müssen hier returnen, damit der Respawn Code unten nicht ausgeführt wird
                    controller.userData.hasPart = false; 
                    controller.userData.heldPipeRef = null;
                    return; 
                }
            }

            // FALLEN LASSEN (Safe Respawn)
            const originalPipe = controller.userData.heldPipeRef;
            if (originalPipe) {
                // WICHTIG: Kein Argument mehr! Es spawnt automatisch sicher.
                originalPipe.respawnPart(); 
            }
            
            controller.userData.hasPart = false; 
            controller.userData.heldPipeRef = null;
            controls.dropPart(controller);
        }
    }
}

const controls = new VRControls(renderer, scene, cameraGroup, onInteract);

const clock = new THREE.Clock();
let lastBreakTime = 0;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (!isGameOver) {
        timeLeft -= delta;
        
        let brokenCount = 0;
        pipes.forEach(p => { if(p.isBroken) brokenCount++; });
        
        if (brokenCount > 0) {
            // Wenn etwas kaputt ist: Sauerstoff sinkt
            const lossRate = 0.5 + (brokenCount * 1.0);
            oxygen -= lossRate * delta;
        } else {
            // Wenn ALLES ganz ist: Sauerstoff steigt langsam wieder an
            // z.B. 5% pro Sekunde
            oxygen += 5.0 * delta;
        }

        // Limits
        if (timeLeft <= 0 || oxygen <= 0) {
            isGameOver = true;
            oxygen = Math.max(0, oxygen);
            timeLeft = Math.max(0, timeLeft);
        }
        oxygen = Math.min(100, oxygen); // Max 100%

        // ZUFALLS-SCHADEN: ETWAS SCHNELLER (10s statt 12s)
        if (time - lastBreakTime > 10) { 
            lastBreakTime = time;
            const randomPipe = pipes[Math.floor(Math.random() * pipes.length)];
            randomPipe.breakPipe();
        }
        environment.updateInfoScreen(timeLeft, oxygen);
    }

    // Farbe für Alignment prüfen (muss jetzt auch Vertikal checken)
    controls.controllers.forEach(controller => {
        const target = controller.userData.hoveredObject;
        if (controller.userData.hasPart && target?.name === 'pipe_gap') {
            const pipe = target.userData.pipe;
            if (isAligned(controller, pipe)) {
                controls.setPartColor(controller, 0x00ff00); 
            } else {
                controls.setPartColor(controller, 0xff0000); 
            }
        } else {
            controls.setPartColor(controller, 0x444444);
        }
    });

    if (controls) controls.update();
    pipes.forEach(pipe => pipe.update());
    
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});