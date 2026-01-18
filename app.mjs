import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { Pipe } from './js/Pipe.js';
import { GameMenu } from './js/GameMenu.js'; 

console.log("Station Saver VR v2.3 - Dynamic Difficulty");

let gameState = 'MENU'; 
let timeLeft = 120.0; // GEÄNDERT: 2 Minuten
let oxygen = 100.0;

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

const environment = new Environment(scene);
const menu = new GameMenu(scene, cameraGroup); 

const pipes = [];
const startZ = -8.75;
const segmentLength = 2.5;
const heightMap = [1, 0, 1, 0, 1, 0, 1, 0]; 
const HIGH_Y = 1.3;
const LOW_Y = 0.75; 

function createVerticalConnector(x, yStart, yEnd, z) {
    const height = Math.abs(yEnd - yStart);
    const midY = (yStart + yEnd) / 2;
    const geo = new THREE.CylinderGeometry(0.055, 0.055, height, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, midY, z);
    scene.add(mesh);
    const jointGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const topJoint = new THREE.Mesh(jointGeo, jointMat);
    topJoint.position.set(x, yEnd, z); scene.add(topJoint);
    const botJoint = new THREE.Mesh(jointGeo, jointMat);
    botJoint.position.set(x, yStart, z); scene.add(botJoint);
}

function addVerticalPipe(x, yStart, yEnd, z, isLeft) {
    const midY = (yStart + yEnd) / 2;
    pipes.push(new Pipe(scene, z, isLeft, midY, true));
    
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
    
    pipes.push(new Pipe(scene, zPos, true, yLeft, false));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yLeft) addVerticalPipe(-1.45, prevY, yLeft, zPos - 1.25, true);
    }

    pipes.push(new Pipe(scene, zPos, false, yRight, false));
    if (i > 0) {
        const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
        if (prevY !== yRight) addVerticalPipe(1.45, prevY, yRight, zPos - 1.25, false);
    }
}

function startGame() {
    timeLeft = 120.0; // GEÄNDERT: 2 Minuten
    oxygen = 100.0;
    
    pipes.forEach(p => {
        p.repair();
        if (p.spareGroup) p.spareGroup.visible = false;
    });

    cameraGroup.position.set(0, 0, 0);
    menu.hide();
    gameState = 'PLAYING';
    
    // Kleiner Initial-Delay
    setTimeout(() => {
        if(gameState === 'PLAYING') pipes[Math.floor(Math.random() * pipes.length)].breakPipe();
    }, 2000);
}

function endGame(win, reason) {
    gameState = win ? 'WIN' : 'GAMEOVER';
    cameraGroup.position.set(0, 0, 0);
    controls.controllers.forEach(c => {
        c.userData.hasPart = false;
        c.userData.heldPipeRef = null;
        controls.dropPart(c);
    });
    if (win) menu.showWin(oxygen);
    else menu.showGameOver(reason);
}

function checkInputForStart() {
    const session = renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
        if (source.gamepad) {
            const pad = source.gamepad;
            if ((pad.buttons[4] && pad.buttons[4].pressed) || 
                (pad.buttons[5] && pad.buttons[5].pressed)) {
                startGame();
                return; 
            }
        }
    }
}

function isAligned(controller, targetPipe) {
    const controllerVector = new THREE.Vector3(1, 0, 0); 
    controllerVector.applyQuaternion(controller.quaternion); 
    let targetVector;
    if (targetPipe.isVertical) {
        targetVector = new THREE.Vector3(0, 1, 0);
    } else {
        targetVector = new THREE.Vector3(0, 0, 1);
    }
    const angle = controllerVector.angleTo(targetVector);
    const tolerance = THREE.MathUtils.degToRad(15); 
    return angle < tolerance || angle > (Math.PI - tolerance);
}

function onInteract(object, actionType, controller) {
    if (gameState !== 'PLAYING') return;

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
                    controller.userData.hasPart = false;
                    controller.userData.heldPipeRef = null;
                    controls.dropPart(controller);
                    return;
                }
            }
            const originalPipe = controller.userData.heldPipeRef;
            if (originalPipe) originalPipe.respawnPart();
            
            controller.userData.hasPart = false; 
            controller.userData.heldPipeRef = null;
            controls.dropPart(controller);
        }
    }
}

const controls = new VRControls(renderer, scene, cameraGroup, onInteract);
const clock = new THREE.Clock();
let lastBreakTime = 0;

menu.showStart();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (gameState !== 'PLAYING') {
        checkInputForStart();
    } 
    else {
        timeLeft -= delta;
        let brokenCount = 0;
        pipes.forEach(p => { if(p.isBroken) brokenCount++; });

        if (brokenCount > 0) {
            const lossRate = 0.5 + (brokenCount * 1.0);
            oxygen -= lossRate * delta;
        } else {
            oxygen += 5.0 * delta; 
        }
        oxygen = Math.min(100, oxygen);

        if (oxygen <= 0) endGame(false, "OXYGEN DEPLETED");
        else if (timeLeft <= 0) endGame(true, "TIME UP - YOU SURVIVED");

        // --- SCHWIERIGKEITSKURVE ---
        // Zeit gespielt: Gesamtzeit (120) - Restzeit
        const timePlayed = 120.0 - timeLeft;
        let spawnInterval = 8; // Standard (0-40s)
        
        if (timePlayed > 40) spawnInterval = 7; // Phase 2 (40-80s)
        if (timePlayed > 80) spawnInterval = 6; // Phase 3 (80-120s)

        if (time - lastBreakTime > spawnInterval) { 
            lastBreakTime = time;
            const randomPipe = pipes[Math.floor(Math.random() * pipes.length)];
            randomPipe.breakPipe();
        }
        
        environment.updateInfoScreen(timeLeft, oxygen);
    }

    controls.controllers.forEach(controller => {
        if (gameState === 'PLAYING' && controller.userData.hasPart && controller.userData.hoveredObject?.name === 'pipe_gap') {
            const pipe = controller.userData.hoveredObject.userData.pipe;
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

renderer.xr.addEventListener('sessionstart', () => {
    document.getElementById('overlay').style.display = 'none';
    if (gameState === 'MENU') menu.showStart();
});
renderer.xr.addEventListener('sessionend', () => document.getElementById('overlay').style.display = 'flex');