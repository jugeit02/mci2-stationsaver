import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRControls {
    constructor(renderer, scene, cameraGroup) {
        this.renderer = renderer;
        this.scene = scene;
        this.cameraGroup = cameraGroup; // Die Gruppe, die verschoben wird (der Spieler)

        this.controllers = [];
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4(); // Hilfsvariable für Mathe
        
        // Der Ziel-Marker (Kreis am Boden)
        this.marker = this.createMarker();
        this.scene.add(this.marker);

        this.initControllers();
    }

    createMarker() {
        // Ein einfacher leuchtender Ring
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const marker = new THREE.Mesh(geometry, material);
        marker.rotation.x = -Math.PI / 2; // Flach auf den Boden
        marker.visible = false; // Erst unsichtbar
        return marker;
    }

    initControllers() {
        const controllerModelFactory = new XRControllerModelFactory();

        // Es gibt Controller 0 (meist rechts) und 1 (meist links)
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            // --- Event: Drücken (Select/Trigger) ---
            controller.addEventListener('selectstart', () => {
                this.onSelectStart(controller);
            });
            controller.addEventListener('selectend', () => {
                this.onSelectEnd();
            });

            this.scene.add(controller);
            this.controllers.push(controller);

            // --- Visueller Strahl (Linie) ---
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -5) // 5m lang
            ]);
            const line = new THREE.Line(lineGeo);
            line.scale.z = 1;
            controller.add(line);

            // --- Controller Modell (Die Hände sehen) ---
            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            this.scene.add(grip);
        }
    }

    onSelectStart(controller) {
        this.activeController = controller; // Merken, welcher Controller drückt
    }

    onSelectEnd() {
        // Wenn der Marker sichtbar ist -> TELEPORT!
        if (this.marker.visible) {
            // Wir setzen die Position der Kamera-Gruppe auf den Marker
            const targetX = this.marker.position.x;
            const targetZ = this.marker.position.z;

            // Wichtig: Y (Höhe) nicht ändern, sonst steckt man im Boden!
            this.cameraGroup.position.set(targetX, 0, targetZ);
        }
        this.activeController = null;
        this.marker.visible = false;
    }

    update() {
        // Standardmäßig Marker verstecken
        this.marker.visible = false;

        // Wir nutzen den rechten Controller (Index 0) zum Zielen, oder den aktiven
        const controller = this.controllers[0]; 

        // Strahl berechnen
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        // Prüfen: Trifft der Strahl irgendwas?
        // Performance-Hack: Wir checken gegen ALLES in der Szene. 
        // Sauberer wäre später nur gegen den Boden zu checken.
        const intersects = this.raycaster.intersectObjects(this.scene.children);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Nur teleportieren, wenn wir den BODEN treffen (y ca. 0)
            // oder wenn das Objekt "Boden" heißt. Hier prüfen wir einfach die Höhe.
            if (hit.point.y < 0.5) {
                this.marker.visible = true;
                this.marker.position.copy(hit.point);
                this.marker.position.y += 0.01; // Etwas über dem Boden schweben
            }
        }
    }
}