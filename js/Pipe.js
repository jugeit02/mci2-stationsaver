import * as THREE from 'three';

export class Pipe {
    constructor(scene, positionZ, isLeftWall, heightY, isVertical = false) {
        this.scene = scene;
        this.isBroken = false;
        this.isVertical = isVertical; 
        
        const xPos = isLeftWall ? -1.45 : 1.45;
        const yPos = heightY; 
        
        this.group = new THREE.Group();
        this.group.position.set(xPos, yPos, positionZ);
        
        if (!isLeftWall) {
            this.group.rotation.y = Math.PI;
        }

        this.init();
        this.scene.add(this.group);
    }

    init() {
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.6 });
        const pipeRadius = 0.055;
        const jointRadius = 0.075;

        const sideGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1.0, 16);
        const middleGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.5, 16);

        const innerGroup = new THREE.Group();
        if (this.isVertical) {
            innerGroup.rotation.x = 0; 
        } else {
            innerGroup.rotation.x = Math.PI / 2;
        }
        this.group.add(innerGroup);

        // 1. Seitenteile
        const part1 = new THREE.Mesh(sideGeo, pipeMat);
        part1.position.y = 0.75; 
        innerGroup.add(part1);

        const part2 = new THREE.Mesh(sideGeo, pipeMat);
        part2.position.y = -0.75; 
        innerGroup.add(part2);

        // Muffe
        const jStart = new THREE.Mesh(new THREE.CylinderGeometry(jointRadius, jointRadius, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        jStart.position.y = -1.25; 
        innerGroup.add(jStart);

        // 2. Trigger
        const gapBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({visible:false}));
        gapBox.name = 'pipe_gap'; gapBox.userData = { pipe: this };
        innerGroup.add(gapBox); 

        // 3. Heiles Stück
        this.healthyPart = new THREE.Mesh(middleGeo, pipeMat);
        innerGroup.add(this.healthyPart);

        // 4. ERSATZTEIL
        this.spareGroup = new THREE.Group();
        const randomZ = (Math.random() - 0.5) * 1.0; 
        this.spareGroup.position.set(1.0, -this.group.position.y + 0.05, randomZ);
        this.spareGroup.rotation.y = Math.random() * Math.PI;
        this.spareGroup.visible = false;
        this.group.add(this.spareGroup);

        const spareMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 });
        const visualPart = new THREE.Mesh(middleGeo, spareMat);
        visualPart.rotation.z = Math.PI / 2; 
        visualPart.name = 'spare_part';       
        visualPart.userData = { pipe: this }; 
        this.spareGroup.add(visualPart);

        const hitBoxMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0, depthWrite: false });
        const hitBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), hitBoxMat);
        hitBox.name = 'spare_part'; 
        hitBox.userData = { pipe: this }; 
        this.spareGroup.add(hitBox);

        // 5. Dampf
        this.createSteam();
        this.steam.position.set(0,0,0);
        this.steam.rotation.set(0,0, -Math.PI/2); 
        this.group.add(this.steam);
    }

    createSteam() {
        const particleCount = 100;
        const geo = new THREE.BufferGeometry();
        const positions = [];
        const speeds = [];
        for (let i = 0; i < particleCount; i++) {
            positions.push(0, 0, 0);
            speeds.push((Math.random()-0.5)*0.15, Math.random()*0.2+0.05, (Math.random()-0.5)*0.15);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.userData = { speeds: speeds };
        const mat = new THREE.PointsMaterial({
            color: 0xdddddd, 
            size: 0.12, // Kleiner (vorher 0.15)
            transparent: true, 
            opacity: 0.0,
            blending: THREE.AdditiveBlending, 
            depthWrite: false
        });
        this.steam = new THREE.Points(geo, mat);
    }

    breakPipe() {
        if (this.isBroken) return;
        this.isBroken = true;
        this.healthyPart.visible = false;
        this.respawnPart(); 
        
        // WENIGER DAMPF: Opacity runter auf 0.15 (vorher 0.4)
        this.steam.material.opacity = 0.15;
    }

    pickupPart() {
        if (this.spareGroup.visible) {
            this.spareGroup.visible = false; 
            return true; 
        }
        return false;
    }

    respawnPart() {
        const randomZ = (Math.random() - 0.5) * 1.0; 
        this.spareGroup.position.set(1.0, -this.group.position.y + 0.05, randomZ);
        this.spareGroup.rotation.y = Math.random() * Math.PI;
        this.spareGroup.visible = true;
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
                const dist = Math.sqrt(pos[i*3]*pos[i*3] + pos[i*3+1]*pos[i*3+1] + pos[i*3+2]*pos[i*3+2]);
                if(dist > 0.8) { pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0; }
            }
            this.steam.geometry.attributes.position.needsUpdate = true;
        }
    }
}