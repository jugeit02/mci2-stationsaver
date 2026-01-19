import * as THREE from 'three';

function createBrushedMetalTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4000; i++) {
        const shade = Math.floor(Math.random() * 100 + 100); 
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        const x = Math.random() * size; const y = Math.random() * size;
        const w = Math.random() * 100 + 20; const h = Math.random() * 2 + 0.5;
        ctx.globalAlpha = 0.15; ctx.fillRect(x, y, w, h);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
const sharedMetalTexture = createBrushedMetalTexture();

export class Pipe {
    constructor(scene, positionZ, isLeftWall, heightY, length = 2.5, isVertical = false) {
        this.scene = scene;
        this.isBroken = false;
        this.isVertical = isVertical; 
        
        if (!isVertical && length > 2.0) {
            this.length = length - 0.10; 
        } else {
            this.length = length;
        }
        
        const xPos = isLeftWall ? -1.45 : 1.45;
        this.group = new THREE.Group();
        this.group.position.set(xPos, heightY, positionZ);
        
        if (!isLeftWall) this.group.rotation.y = Math.PI;

        this.init();
        this.scene.add(this.group);
    }

    init() {
        const pipeMat = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,      
            roughness: 0.3,      
            metalness: 0.9,       
            bumpMap: sharedMetalTexture, 
            bumpScale: 0.02,
            roughnessMap: sharedMetalTexture
        });

        const pipeRadius = 0.045;
        const jointRadius = 0.06;

        const midLen = 0.5; 
        let sideLen = (this.length - midLen) / 2;
        if (sideLen < 0) sideLen = 0.01;
        
        const sideOffset = (midLen / 2) + (sideLen / 2);
        const sideGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, sideLen, 32); 
        const middleGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, midLen, 32);

        const innerGroup = new THREE.Group();
        innerGroup.rotation.x = this.isVertical ? 0 : Math.PI / 2;
        this.group.add(innerGroup);

        const part1 = new THREE.Mesh(sideGeo, pipeMat);
        part1.position.y = sideOffset; 
        innerGroup.add(part1);

        const part2 = new THREE.Mesh(sideGeo, pipeMat);
        part2.position.y = -sideOffset; 
        innerGroup.add(part2);

        const jMat = new THREE.MeshStandardMaterial({ 
            color: 0x444444, roughness: 0.8, metalness: 0.4 
        });
        const jGeo = new THREE.CylinderGeometry(jointRadius, jointRadius, 0.06, 32);
        
        const jTop = new THREE.Mesh(jGeo, jMat);
        jTop.position.y = (sideOffset + sideLen/2); 
        innerGroup.add(jTop);

        const jBot = new THREE.Mesh(jGeo, jMat);
        jBot.position.y = -(sideOffset + sideLen/2); 
        innerGroup.add(jBot);

        const gapBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, midLen, 0.35), new THREE.MeshBasicMaterial({visible:false}));
        gapBox.name = 'pipe_gap'; 
        gapBox.userData = { pipe: this };
        innerGroup.add(gapBox); 

        this.healthyPart = new THREE.Mesh(middleGeo, pipeMat);
        innerGroup.add(this.healthyPart);

        this.spareGroup = new THREE.Group();
        this.group.add(this.spareGroup);

        const spareMat = new THREE.MeshStandardMaterial({ 
            color: 0x888888, 
            roughness: 0.5, 
            metalness: 0.6,
            bumpMap: sharedMetalTexture,
            bumpScale: 0.02
        });
        
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

        this.createSteam();
        this.steam.position.set(0,0,0);
        this.steam.rotation.set(0,0, -Math.PI/2); 
        this.group.add(this.steam);
        
        this.respawnPart();
        this.spareGroup.visible = false;
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
            color: 0xdddddd, size: 0.12, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.steam = new THREE.Points(geo, mat);
    }

    breakPipe() {
        if (this.isBroken) return;
        this.isBroken = true;
        this.healthyPart.visible = false;
        this.respawnPart(); 
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