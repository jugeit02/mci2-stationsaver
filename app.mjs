import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Environment } from './js/Environment.js';
import { VRControls } from './js/VRControls.js';
import { PipeSystem } from './js/PipeSystem.js';
import { GameMenu } from './js/GameMenu.js'; 

console.log("Station Saver VR v2.5 - Final Clean Release");

let gameState = 'MENU'; 
let timeLeft = 120.0;
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

const environment = new Environment(scene, renderer);
const menu = new GameMenu(scene, cameraGroup); 
const pipeSystem = new PipeSystem(scene);

const controls = new VRControls(renderer, scene, cameraGroup, onInteract);
const clock = new THREE.Clock();
let lastBreakTime = 0;

menu.showStart();

function startGame() {
    timeLeft = 120.0;
    oxygen = 100.0;
    pipeSystem.reset();
    cameraGroup.position.set(0, 0, 0);
    menu.hide();
    gameState = 'PLAYING';
    
    setTimeout(() => {
        if(gameState === 'PLAYING') pipeSystem.breakRandom();
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

    pipeSystem.reset();

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

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (gameState !== 'PLAYING') {
        checkInputForStart();
    } 
    else {
        timeLeft -= delta;
        
        const brokenCount = pipeSystem.getBrokenCount();

        if (brokenCount > 0) {
            const lossRate = 0.5 + (brokenCount * 1.0);
            oxygen -= lossRate * delta;
        } else {
            oxygen += 2.0 * delta; 
        }
        oxygen = Math.min(100, oxygen);

        if (oxygen <= 0) endGame(false, "OXYGEN DEPLETED");
        else if (timeLeft <= 0) endGame(true, "TIME UP - YOU SURVIVED");

        const timePlayed = 120.0 - timeLeft;
        let spawnInterval = 8; 
        if (timePlayed > 40) spawnInterval = 7; 
        if (timePlayed > 80) spawnInterval = 6; 

        if (time - lastBreakTime > spawnInterval) { 
            lastBreakTime = time;
            pipeSystem.breakRandom();
        }
        
        pipeSystem.update();
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