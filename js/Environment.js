import * as THREE from 'three';

export class Environment {
    constructor(scene, renderer) {
        this.scene = scene;
        this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = 512;
        this.screenCanvas.height = 256;
        this.screenContext = this.screenCanvas.getContext('2d');
        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        
        this.init();
    }

    init() {
        this.scene.fog = new THREE.FogExp2(0x111111, 0.06); 
        this.scene.background = new THREE.Color(0x111111);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
        this.scene.add(ambientLight);

        const floorTex = this.createFloorPlateTexture();
        floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(2, 10); 
        floorTex.anisotropy = this.maxAnisotropy; 

        const panelTex = this.createPanelTexture();
        panelTex.wrapS = THREE.RepeatWrapping; panelTex.wrapT = THREE.RepeatWrapping;
        panelTex.repeat.set(1, 5);
        panelTex.anisotropy = this.maxAnisotropy;

        const doorTex = this.createDoorTexture();
        doorTex.anisotropy = this.maxAnisotropy;

        const floorMat = new THREE.MeshStandardMaterial({ 
            map: floorTex, color: 0x999999, roughness: 0.5, metalness: 0.4 
        });

        const wallMat = new THREE.MeshStandardMaterial({ 
            map: panelTex, color: 0xcccccc, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide 
        });

        const slantMat = new THREE.MeshStandardMaterial({ 
            map: panelTex, color: 0xbbbbbb, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide
        });

        const ceilMat = new THREE.MeshStandardMaterial({ 
            color: 0x888888, roughness: 0.8 
        });

        const ribMat = new THREE.MeshStandardMaterial({ 
            color: 0x666666, roughness: 0.5, metalness: 0.5
        });
        
        const doorMat = new THREE.MeshStandardMaterial({
            map: doorTex,
            color: 0xc0c0c0, 
            roughness: 0.6,
            metalness: 0.5
        });

        const floorW = 2.0;    
        const wallH = 1.6;     
        const slantS = 0.8;    
        const offset = slantS * 0.707; 
        const totalH = wallH + 2 * offset;

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), floorMat);
        floor.rotation.x = -Math.PI / 2; floor.name = 'floor'; this.scene.add(floor);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), ceilMat);
        ceiling.rotation.x = Math.PI / 2; ceiling.position.y = totalH; this.scene.add(ceiling);

        const slantGeo = new THREE.PlaneGeometry(slantS, 20);
        this.addSlant(-(floorW/2+offset/2), totalH-offset/2, Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), totalH-offset/2, Math.PI/2, -Math.PI/4, slantGeo, slantMat);
        this.addSlant(-(floorW/2+offset/2), offset/2, -Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), offset/2, -Math.PI/2, -Math.PI/4, slantGeo, slantMat);

        const wGeo = new THREE.PlaneGeometry(wallH, 20); 
        const wL = new THREE.Mesh(wGeo, wallMat);
        wL.rotation.y = Math.PI / 2; wL.rotation.z = Math.PI / 2; 
        wL.position.set(-(floorW/2 + offset), offset + wallH/2, 0); this.scene.add(wL);

        const wR = new THREE.Mesh(wGeo, wallMat);
        wR.rotation.y = -Math.PI / 2; wR.rotation.z = Math.PI / 2;
        wR.position.set((floorW/2 + offset), offset + wallH/2, 0); this.scene.add(wR);

        const ribGeo = new THREE.TorusGeometry(2.3, 0.25, 6, 8); 
        
        const lampGeo = new THREE.BoxGeometry(0.8, 0.05, 1.5);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let z = -10; z <= 10; z += 2.5) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(0, totalH / 2, z);
            rib.rotation.z = Math.PI / 8; 
            this.scene.add(rib);
        }

        for (let z = -8; z <= 8; z += 4) {
            const lamp = new THREE.Mesh(lampGeo, lampMat);
            lamp.position.set(0, totalH - 0.05, z); 
            this.scene.add(lamp);

            const pl = new THREE.PointLight(0xffffff, 1.2, 8);
            pl.position.set(0, totalH - 0.5, z);
            this.scene.add(pl);
        }

        this.createFlatEndWall(10, totalH, wallMat, doorMat, true); 
        this.createFlatEndWall(-10, totalH, wallMat, doorMat, false); 
        
        this.createScreen(0, totalH/2, -9.95);
    }

    createFlatEndWall(z, totalH, wallMat, doorMat, hasDoor) {
        const group = new THREE.Group();
        group.position.set(0, 0, z);
        if (z > 0) group.rotation.y = Math.PI;

        const wallWidth = 5.0;
        const wallHeight = 5.0;
        const doorW = 2.0; 
        const doorH = 2.5; 
        
        const sideW = (wallWidth - doorW) / 2;
        
        const wLeft = new THREE.Mesh(new THREE.PlaneGeometry(sideW, wallHeight), wallMat);
        wLeft.position.set(-(doorW/2 + sideW/2), totalH/2, 0);
        group.add(wLeft);

        const wRight = new THREE.Mesh(new THREE.PlaneGeometry(sideW, wallHeight), wallMat);
        wRight.position.set((doorW/2 + sideW/2), totalH/2, 0);
        group.add(wRight);

        const headerH = wallHeight - doorH;
        const wTop = new THREE.Mesh(new THREE.PlaneGeometry(doorW, headerH), wallMat);
        wTop.position.set(0, doorH + headerH/2, 0);
        group.add(wTop);

        if (hasDoor) {
            const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), doorMat);
            door.position.set(0, doorH/2, 0); 
            group.add(door);
        } else {
            const filler = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), wallMat);
            filler.position.set(0, doorH/2, 0);
            group.add(filler);
        }

        this.scene.add(group);
    }

    createScreen(x, y, z) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x888888 }));
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
        
        ctx.fillStyle = '#001133'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, w-20, h-20);

        ctx.font = '30px Arial'; ctx.fillStyle = '#00aaff'; ctx.textAlign = 'center';
        ctx.fillText("STATION STATUS", w/2, 50);

        ctx.font = 'bold 60px Courier New';
        ctx.fillStyle = timeLeft < 30 ? '#ff3333' : '#ffffff';
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60).toString().padStart(2, '0');
        ctx.fillText(`${minutes}:${seconds}`, w/2, 130);

        ctx.font = '30px Arial'; ctx.fillStyle = '#cccccc';
        ctx.fillText(`O2 LEVELS: ${Math.round(oxygenLevel)}%`, w/2, 190);

        const barW = 300; const barH = 20; const barX = (w - barW) / 2; const barY = 210;
        ctx.fillStyle = '#222222'; ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = oxygenLevel > 30 ? '#00aaff' : '#ff3333'; 
        ctx.fillRect(barX, barY, barW * (oxygenLevel / 100), barH);
        this.screenTexture.needsUpdate = true;
    }

    addSlant(x, y, rotX, rotY, geo, mat) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0); mesh.rotation.x = rotX; mesh.rotation.y = rotY;
        this.scene.add(mesh);
    }

    createFloorPlateTexture() {
        const size = 512; 
        const c = document.createElement('canvas'); c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#cccccc'; ctx.fillRect(0,0,size,size);
        
        ctx.strokeStyle = '#999999'; ctx.lineWidth = 6; 
        ctx.beginPath();
        ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
        ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
        ctx.strokeRect(0,0,size,size);
        ctx.stroke();

        ctx.fillStyle = '#bbbbbb';
        for(let i=0; i<500; i++) {
             ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
        }
        return new THREE.CanvasTexture(c);
    }

    createPanelTexture() {
        const size = 512;
        const c = document.createElement('canvas'); c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#eeeeee'; ctx.fillRect(0,0,size,size);
        ctx.lineWidth = 10; ctx.strokeStyle = '#cccccc'; ctx.strokeRect(5,5,size-10,size-10);
        
        ctx.fillStyle = '#dddddd';
        const rivetSize = 8;
        const offset = 30;
        ctx.beginPath(); ctx.arc(offset, offset, rivetSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(size-offset, offset, rivetSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(offset, size-offset, rivetSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(size-offset, size-offset, rivetSize, 0, Math.PI*2); ctx.fill();
        return new THREE.CanvasTexture(c);
    }

    createDoorTexture() {
        const size = 512;
        const c = document.createElement('canvas'); c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#cccccc'; ctx.fillRect(0,0,size,size);
        
        ctx.lineWidth = 20; ctx.strokeStyle = '#aaaaaa'; 
        ctx.strokeRect(0,0,size,size);
        
        ctx.lineWidth = 6; ctx.strokeStyle = '#888888';
        ctx.beginPath(); ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size); ctx.stroke();
        
        return new THREE.CanvasTexture(c);
    }
}