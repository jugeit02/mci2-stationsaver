import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRControls {
    // onInteract ist eine Funktion, die wir von app.mjs übergeben bekommen
    constructor(renderer, scene, cameraGroup, onInteract) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameraGroup = cameraGroup;
        this.onInteract = onInteract; // Callback speichern

        this.controllers = [];
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        
        this.marker = this.createMarker();
        this.scene.add(this.marker);

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
            
            controller.addEventListener('selectstart', () => controller.userData.isSelecting = true);
            
            // WICHTIG: Hier entscheiden wir: Teleport oder Interaktion?
            controller.addEventListener('selectend', () => this.handleSelect(controller));

            this.cameraGroup.add(controller); 
            this.controllers.push(controller);

            // Strahl
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-5)]));
            line.scale.z = 1;
            line.raycast = () => {}; 
            controller.add(line);
            controller.userData.line = line;

            // Modell
            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            this.cameraGroup.add(grip);
        }
    }

    handleSelect(controller) {
        controller.userData.isSelecting = false;

        // 1. Wenn Marker sichtbar -> TELEPORTIEREN
        if (this.marker.visible) {
            this.cameraGroup.position.set(this.marker.position.x, 0, this.marker.position.z);
            this.marker.visible = false;
        } 
        // 2. Wenn kein Marker, haben wir vielleicht ein Objekt getroffen?
        else {
            // Wir prüfen nochmal kurz, was der Strahl gerade trifft
            this.tempMatrix.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
            
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            // Wenn wir was treffen, das NICHT der Boden ist und nah genug ist
            if (intersects.length > 0) {
                const hit = intersects[0];
                if (hit.object.name !== 'floor' && hit.distance < 3) {
                    // Wir rufen die Funktion in app.mjs auf und sagen: "Hey, User hat auf [Objekt] geklickt!"
                    if (this.onInteract) this.onInteract(hit.object);
                }
            }
        }
    }

    update() {
        this.marker.visible = false;
        
        this.controllers.forEach((controller) => {
            const line = controller.userData.line;
            line.scale.z = 5; 

            this.tempMatrix.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            for (let i = 0; i < intersects.length; i++) {
                const hit = intersects[i];
                
                // Boden -> Marker zeigen
                if (hit.object.name === 'floor') {
                    line.scale.z = hit.distance;
                    this.marker.visible = true;
                    this.marker.position.copy(hit.point);
                    this.marker.position.y += 0.02;
                    return; 
                } 
                // Objekt (z.B. Rohr) -> Strahl stoppen, aber kein Marker
                else if (hit.distance < 5 && hit.distance > 0.1) {
                   line.scale.z = hit.distance;
                   return; 
                }
            }
        });
    }
}