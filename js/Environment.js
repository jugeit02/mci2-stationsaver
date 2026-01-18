import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        
        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = 512;
        this.screenCanvas.height = 256;
        this.screenContext = this.screenCanvas.getContext('2d');
        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        
        this.init();
    }

    init() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1); 
        this.scene.add(ambientLight);

        const floorTexture = this.createGrateTexture();
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(2, 8);

        const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, color: 0xaaaaaa, roughness: 0.7, metalness: 0.4 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
        const slantMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, side: THREE.DoubleSide });
        const ribMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });

        const floorW = 2.0;    
        const wallH = 1.6;     
        const slantS = 0.8;    
        const offset = slantS * 0.707; 
        const totalH = wallH + 2 * offset;

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), floorMat);
        floor.rotation.x = -Math.PI / 2; 
        floor.name = 'floor'; 
        this.scene.add(floor);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), wallMat);
        ceiling.rotation.x = Math.PI / 2; 
        ceiling.position.y = totalH;
        this.scene.add(ceiling);

        const slantGeo = new THREE.PlaneGeometry(slantS, 20);
        this.addSlant(-(floorW/2+offset/2), totalH-offset/2, Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), totalH-offset/2, Math.PI/2, -Math.PI/4, slantGeo, slantMat);
        this.addSlant(-(floorW/2+offset/2), offset/2, -Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), offset/2, -Math.PI/2, -Math.PI/4, slantGeo, slantMat);

        const wGeo = new THREE.PlaneGeometry(wallH, 20); 
        const wL = new THREE.Mesh(wGeo, wallMat);
        wL.rotation.y = Math.PI / 2; wL.rotation.z = Math.PI / 2; 
        wL.position.set(-(floorW/2 + offset), offset + wallH/2, 0);
        this.scene.add(wL);

        const wR = new THREE.Mesh(wGeo, wallMat);
        wR.rotation.y = -Math.PI / 2; wR.rotation.z = Math.PI / 2;
        wR.position.set((floorW/2 + offset), offset + wallH/2, 0);
        this.scene.add(wR);

        const ribGeo = new THREE.TorusGeometry(2.1, 0.15, 4, 8); 
        for (let z = -10; z <= 10; z += 2.5) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(0, totalH / 2, z);
            rib.rotation.z = Math.PI / 8; 
            this.scene.add(rib);
        }

        this.createDoorWall(10, totalH, wallMat, true); 
        this.createDoorWall(-10, totalH, wallMat, false); 
        this.createScreen(0, totalH/2, -9.95);

        for (let z = -8; z <= 8; z += 4) {
             const pl = new THREE.PointLight(0xffffff, 0.5, 10);
             pl.position.set(0, totalH - 0.5, z);
             this.scene.add(pl);
        }
    }

    createScreen(x, y, z) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 }));
        frame.position.set(x, y, z);
        this.scene.add(frame);

        const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshBasicMaterial({ map: this.screenTexture }));
        screen.position.set(0, 0, 0.06); 
        frame.add(screen);
    }

    updateInfoScreen(timeLeft, oxygenLevel) {
        const ctx = this.screenContext;
        const w = this.screenCanvas.width;
        const h = this.screenCanvas.height;

        ctx.fillStyle = '#001122';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, w-20, h-20);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'center';
        ctx.fillText("STATION STATUS", w/2, 50);

        ctx.font = 'bold 60px Courier New';
        ctx.fillStyle = timeLeft < 30 ? '#ff3333' : '#ffffff';
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60).toString().padStart(2, '0');
        ctx.fillText(`TIME: ${minutes}:${seconds}`, w/2, 130);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`OXYGEN: ${Math.round(oxygenLevel)}%`, w/2, 190);

        const barW = 300;
        const barH = 20;
        const barX = (w - barW) / 2;
        const barY = 210;

        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = oxygenLevel > 30 ? '#00ff00' : '#ff0000';
        ctx.fillRect(barX, barY, barW * (oxygenLevel / 100), barH);

        this.screenTexture.needsUpdate = true;
    }

    addSlant(x, y, rotX, rotY, geo, mat) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0); mesh.rotation.x = rotX; mesh.rotation.y = rotY;
        this.scene.add(mesh);
    }

    createDoorWall(z, totalH, wallMat, hasDoor) {
        const group = new THREE.Group();
        group.position.set(0, 0, z);
        if (z > 0) group.rotation.y = Math.PI;

        const doorW = 1.6; const doorH = 2.4; const wallFullW = 5.0; const wallFullH = 5.0;
        const w1 = (wallFullW - doorW) / 2;

        const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(w1, wallFullH), wallMat);
        wallLeft.position.set(-(doorW/2 + w1/2), totalH/2, 0); group.add(wallLeft);
        const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(w1, wallFullH), wallMat);
        wallRight.position.set((doorW/2 + w1/2), totalH/2, 0); group.add(wallRight);
        const wallTop = new THREE.Mesh(new THREE.PlaneGeometry(doorW, 2.6), wallMat);
        wallTop.position.set(0, doorH + 1.3, 0); group.add(wallTop);

        if (hasDoor) {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.1), new THREE.MeshStandardMaterial({color:0x333333}));
            frame.position.set(0, doorH/2, 0); group.add(frame);
            const door = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.2, doorH - 0.2, 0.05), new THREE.MeshStandardMaterial({color:0x555555}));
            door.position.set(0, doorH/2, 0.05); group.add(door);
        } else {
            const filler = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), wallMat);
            filler.position.set(0, doorH/2, 0); group.add(filler);
        }
        this.scene.add(group);
    }

    createGrateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#999999'; ctx.fillRect(0,0,512,512);
        ctx.strokeStyle = '#666666'; ctx.lineWidth = 5;
        for(let i=0; i<=512; i+=64) {
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
        }
        ctx.strokeRect(0,0,512,512);
        return new THREE.CanvasTexture(canvas);
    }
}