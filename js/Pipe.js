import * as THREE from 'three';

export class Pipe {
    constructor(scene, positionZ, isLeftWall, heightY) {
        this.scene = scene;
        this.isBroken = false;
        
        // Position: 1.45m ist nah an der Wand
        const xPos = isLeftWall ? -1.45 : 1.45;
        
        // NEU: Die Höhe kommt jetzt von außen (für das Hoch/Runter Muster)
        const yPos = heightY; 
        
        this.group = new THREE.Group();
        this.group.position.set(xPos, yPos, positionZ);
        if (!isLeftWall) this.group.rotation.y = Math.PI;

        this.init();
        this.scene.add(this.group);
    }

    init() {
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
        const pipeRadius = 0.07;
        const jointRadius = 0.09;

        const sideGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1.0, 16);
        const middleGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.5, 16);

        // 1. Seitenteile
        const leftPart = new THREE.Mesh(sideGeo, pipeMat);
        leftPart.rotation.x = Math.PI / 2; leftPart.position.z = -0.75; 
        this.group.add(leftPart);

        const rightPart = new THREE.Mesh(sideGeo, pipeMat);
        rightPart.rotation.x = Math.PI / 2; rightPart.position.z = 0.75; 
        this.group.add(rightPart);

        // Muffe
        const jStart = new THREE.Mesh(new THREE.CylinderGeometry(jointRadius, jointRadius, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        jStart.rotation.x = Math.PI / 2; jStart.position.z = -1.25; 
        this.group.add(jStart);

        // 2. Trigger
        const gapBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), new THREE.MeshBasicMaterial({visible:false}));
        gapBox.name = 'pipe_gap'; gapBox.userData = { pipe: this };
        this.group.add(gapBox);

        // 3. Heiles Stück
        this.healthyPart = new THREE.Mesh(middleGeo, pipeMat);
        this.healthyPart.rotation.x = Math.PI / 2;
        this.group.add(this.healthyPart);

        // 4. ERSATZTEIL (Position gefixed)
        const spareMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 });
        this.sparePart = new THREE.Mesh(middleGeo, spareMat);
        this.sparePart.rotation.z = Math.PI / 2;
        this.sparePart.rotation.y = Math.random() * Math.PI; // Zufällige Drehung sieht natürlicher aus
        
        // RECHNUNG FÜR POSITION:
        // Local X = 1.0 bedeutet: 1.45 (Wand) - 1.0 = 0.45 (Welt).
        // Das ist schön mittig auf dem Gitter (Boden geht bis 1.0). Keine Schrägen-Kollision mehr!
        // Local Y: Rohr ist auf Höhe Y. Boden ist 0. Also muss es -Y runter.
        // Local Z: Zufall zwischen -1.0 und 1.0, damit es nicht direkt unterm Leck liegt.
        
        const randomZ = (Math.random() - 0.5) * 1.5; // Zufallversatz entlang des Weges
        this.sparePart.position.set(1.0, -this.group.position.y + 0.05, randomZ); 
        
        this.sparePart.name = 'spare_part';
        this.sparePart.userData = { pipe: this };
        this.sparePart.visible = false;
        this.group.add(this.sparePart);

        // 5. Dampf
        this.createSteam();
    }

    createSteam() {
        const particleCount = 100;
        const geo = new THREE.BufferGeometry();
        const positions = [];
        const speeds = [];
        for (let i = 0; i < particleCount; i++) {
            positions.push(0, 0, 0);
            speeds.push((Math.random()-0.5)*0.15, (Math.random()-0.5)*0.15, Math.random()*0.2+0.05);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.userData = { speeds: speeds };
        const mat = new THREE.PointsMaterial({
            color: 0xdddddd, size: 0.15, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.steam = new THREE.Points(geo, mat);
        this.steam.rotation.y = -Math.PI / 2; 
        this.group.add(this.steam);
    }

    breakPipe() {
        if (this.isBroken) return;
        this.isBroken = true;
        this.healthyPart.visible = false;
        this.sparePart.visible = true;
        this.steam.material.opacity = 0.4;
    }

    pickupPart() {
        if (this.sparePart.visible) {
            this.sparePart.visible = false; return true; 
        }
        return false;
    }

    repair() {
        if (!this.isBroken) return;
        this.isBroken = false;
        this.healthyPart.visible = true;
        this.steam.material.opacity = 0.0;
    }

    update() {
        if (this.isBroken && this.steam) {
            const pos = this.steam.geometry.attributes.position.array;
            const speeds = this.steam.geometry.userData.speeds;
            for(let i=0; i<pos.length/3; i++){
                pos[i*3] += speeds[i*3]; pos[i*3+1] += speeds[i*3+1]; pos[i*3+2] += speeds[i*3+2];
                if(pos[i*3+2] > 0.8) { pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0; }
            }
            this.steam.geometry.attributes.position.needsUpdate = true;
        }
    }
}