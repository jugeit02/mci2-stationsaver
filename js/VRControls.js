import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRControls {
    constructor(renderer, scene, cameraGroup, onInteract) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameraGroup = cameraGroup;
        this.onInteract = onInteract;

        this.controllers = [];
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        
        this.marker = this.createMarker();
        this.scene.add(this.marker);

        this.intersectedObject = null; 
        this.currentHex = 0;

        this.initControllers();
    }

    createMarker() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const marker = new THREE.Mesh(geometry, material);
        marker.rotation.x = -Math.PI / 2; 
        marker.visible = false; 
        return marker;
    }

    initControllers() {
        const controllerModelFactory = new XRControllerModelFactory();

        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            controller.addEventListener('selectstart', () => this.onTriggerStart(controller));
            controller.addEventListener('selectend', () => this.onTriggerEnd(controller));
            controller.addEventListener('squeezestart', () => this.onSqueezeStart(controller));
            controller.addEventListener('squeezeend', () => this.onSqueezeEnd(controller));

            this.cameraGroup.add(controller); 
            this.controllers.push(controller);

            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]));
            line.scale.z = 1;
            line.raycast = () => {}; 
            controller.add(line);
            controller.userData.line = line;

            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            this.cameraGroup.add(grip);

            // --- ROHR IN DER HAND (UPDATE) ---
            const partGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
            const partMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
            const handPart = new THREE.Mesh(partGeo, partMat);
            
            // NEUE ROTATION: Quer liegend (Z-Rotation 90 Grad)
            handPart.rotation.set(0, 0, Math.PI / 2); 
            
            // NEUE POSITION: Schwebt 25cm vor dem Controller
            handPart.position.set(0, 0, -0.25); 
            
            handPart.visible = false; 
            controller.add(handPart);
            controller.userData.handPart = handPart;
            
            controller.userData.isTeleporting = false;
            controller.userData.isGripping = false;
        }
    }

    pickupPart(controller) {
        if (controller.userData.handPart) controller.userData.handPart.visible = true;
    }

    dropPart(controller) {
        if (controller.userData.handPart) controller.userData.handPart.visible = false;
    }

    setPartColor(controller, colorHex) {
        if (controller.userData.handPart) {
            controller.userData.handPart.material.color.setHex(colorHex);
        }
    }

    onTriggerStart(controller) {
        controller.userData.isGripping = true;
        if (controller.userData.hoveredObject && this.onInteract) {
            this.onInteract(controller.userData.hoveredObject, 'start', controller);
        }
    }

    onTriggerEnd(controller) {
        controller.userData.isGripping = false;
        if (this.onInteract) {
            const target = controller.userData.hoveredObject; 
            this.onInteract(target, 'end', controller);
        }
    }

    onSqueezeStart(controller) {
        controller.userData.isTeleporting = true;
    }

    onSqueezeEnd(controller) {
        controller.userData.isTeleporting = false;
        if (this.marker.visible) {
            this.cameraGroup.position.set(this.marker.position.x, 0, this.marker.position.z);
        }
        this.marker.visible = false;
    }

    update() {
        if (this.intersectedObject) {
            if (this.intersectedObject.material && this.intersectedObject.material.emissive) {
                this.intersectedObject.material.emissive.setHex(this.currentHex);
            }
            this.intersectedObject = null;
        }
        this.marker.visible = false;

        this.controllers.forEach((controller) => {
            controller.userData.hoveredObject = null;
            const line = controller.userData.line;
            line.scale.z = 5; 

            this.tempMatrix.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (controller.userData.isTeleporting) {
                const floorHit = intersects.find(hit => hit.object.name === 'floor');
                if (floorHit) {
                    line.scale.z = floorHit.distance;
                    this.marker.visible = true;
                    this.marker.position.copy(floorHit.point);
                    this.marker.position.y += 0.02;
                }
            } else {
                const interactHit = intersects.find(hit => 
                    hit.distance < 3 && 
                    hit.distance > 0.1 && 
                    (hit.object.name === 'spare_part' || hit.object.name === 'pipe_gap')
                );

                if (interactHit) {
                    line.scale.z = interactHit.distance;
                    controller.userData.hoveredObject = interactHit.object;
                    if (interactHit.object.material && interactHit.object.material.emissive) {
                        this.intersectedObject = interactHit.object;
                        this.currentHex = this.intersectedObject.material.emissive.getHex();
                        this.intersectedObject.material.emissive.setHex(0x555555);
                    }
                }
            }
        });
    }
}