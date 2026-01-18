import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';

console.log("Station Saver VR v1.2 - Floating Pipe");

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

// --- ROTATIONS CHECK HELPER (UPDATED) ---
function isAligned(controller) {
    // Da das Rohr jetzt QUER (Local X) gehalten wird, 
    // müssen wir schauen, wohin die X-Achse des Controllers zeigt.
    
    // 1. Lokale X-Achse (Rechts)
    const controllerSideways = new THREE.Vector3(1, 0, 0);
    controllerSideways.applyQuaternion(controller.quaternion); 

    // 2. Wand-Rohre verlaufen entlang der Welt-Z-Achse (0, 0, 1)
    const pipeDir = new THREE.Vector3(0, 0, 1);

    // 3. Winkel berechnen
    const angle = controllerSideways.angleTo(pipeDir);
    
    // 4. Toleranz (30 Grad)
    const tolerance = THREE.MathUtils.degToRad(30); 

    // Parallel (0 Grad) ODER Anti-Parallel (180 Grad) ist beides ok
    const isAlignedZ = angle < tolerance || angle > (Math.PI - tolerance);

    return isAlignedZ;
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
            
            // Reparatur nur, wenn Winkel stimmt!
            if (object && object.name === 'pipe_gap') {
                const targetPipe = object.userData.pipe;
                if (targetPipe.isBroken && isAligned(controller)) { 
                    targetPipe.repair();
                    oxygen = Math.min(100, oxygen + 10); 
                    controller.userData.hasPart = false;
                    controller.userData.heldPipeRef = null;
                    controls.dropPart(controller);
                    return;
                }
            }

            // Fallenlassen
            const originalPipe = controller.userData.heldPipeRef;
            if (originalPipe) originalPipe.respawnPart(controller.position);
            
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
        const lossRate = 0.2 + (brokenCount * 0.8);
        oxygen -= lossRate * delta;

        if (timeLeft <= 0 || oxygen <= 0) {
            isGameOver = true;
            oxygen = Math.max(0, oxygen);
            timeLeft = Math.max(0, timeLeft);
        }

        if (time - lastBreakTime > 12) { 
            lastBreakTime = time;
            const randomPipe = pipes[Math.floor(Math.random() * pipes.length)];
            randomPipe.breakPipe();
        }
        environment.updateInfoScreen(timeLeft, oxygen);
    }

    // Visuelles Feedback
    controls.controllers.forEach(controller => {
        if (controller.userData.hasPart && controller.userData.hoveredObject?.name === 'pipe_gap') {
            if (isAligned(controller)) {
                controls.setPartColor(controller, 0x00ff00); // Grün
            } else {
                controls.setPartColor(controller, 0xff0000); // Rot
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