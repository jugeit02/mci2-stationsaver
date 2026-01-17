import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        // --- 1. Materialien (Viel Heller) ---
        // Stärkeres Umgebungslicht
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1); 
        this.scene.add(ambientLight);

        // Texturen
        const floorTexture = this.createGrateTexture();
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(2, 8);

        const floorMat = new THREE.MeshStandardMaterial({ 
            map: floorTexture, 
            color: 0xaaaaaa, // Helleres Grau für den Boden
            roughness: 0.7, 
            metalness: 0.4 
        });

        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0xbbbbbb, // Helleres Grau für Wände
            roughness: 0.5, 
            metalness: 0.2, 
            side: THREE.DoubleSide 
        });

        const slantMat = new THREE.MeshStandardMaterial({ 
            color: 0x999999, // Mittleres Grau
            roughness: 0.6, 
            side: THREE.DoubleSide
        });

        const ribMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
        

        // --- 2. Geometrie-Maße ---
        const floorW = 2.0;    
        const wallH = 1.6;     
        const slantS = 0.8;    
        const offset = slantS * 0.707; 
        const totalH = wallH + 2 * offset;


        // --- 3. Der Tunnel-Bau ---
        
        // A) BODEN & DECKE
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), floorMat);
        floor.rotation.x = -Math.PI / 2; 
        floor.name = 'floor'; 
        this.scene.add(floor);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), wallMat);
        ceiling.rotation.x = Math.PI / 2; 
        ceiling.position.y = totalH;
        this.scene.add(ceiling);

        // B) SCHRÄGEN
        const slantGeo = new THREE.PlaneGeometry(slantS, 20);
        
        // Oben
        this.addSlant(-(floorW/2+offset/2), totalH-offset/2, Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), totalH-offset/2, Math.PI/2, -Math.PI/4, slantGeo, slantMat);
        // Unten
        this.addSlant(-(floorW/2+offset/2), offset/2, -Math.PI/2, Math.PI/4, slantGeo, slantMat);
        this.addSlant( (floorW/2+offset/2), offset/2, -Math.PI/2, -Math.PI/4, slantGeo, slantMat);

        // C) WÄNDE
        const wGeo = new THREE.PlaneGeometry(wallH, 20); 

        // Links
        const wL = new THREE.Mesh(wGeo, wallMat);
        wL.rotation.y = Math.PI / 2; 
        wL.rotation.z = Math.PI / 2; 
        wL.position.set(-(floorW/2 + offset), offset + wallH/2, 0);
        this.scene.add(wL);

        // Rechts
        const wR = new THREE.Mesh(wGeo, wallMat);
        wR.rotation.y = -Math.PI / 2;
        wR.rotation.z = Math.PI / 2;
        wR.position.set((floorW/2 + offset), offset + wallH/2, 0);
        this.scene.add(wR);


        // --- 4. Strukturen ---

        // Rippen
        const ribGeo = new THREE.TorusGeometry(2.1, 0.15, 4, 8); 
        for (let z = -10; z <= 10; z += 2.5) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(0, totalH / 2, z);
            rib.rotation.z = Math.PI / 8; 
            this.scene.add(rib);
        }

        // Enden
        this.createWallEnd(10, totalH, wallMat, true); // Tür
        this.createWallEnd(-10, totalH, wallMat, false); // Wand

        // Lichter
        for (let z = -8; z <= 8; z += 4) {
             const pl = new THREE.PointLight(0xffffff, 0.5, 10);
             pl.position.set(0, totalH - 0.5, z);
             this.scene.add(pl);
        }
    }

    addSlant(x, y, rotX, rotY, geo, mat) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        mesh.rotation.x = rotX;
        mesh.rotation.y = rotY;
        this.scene.add(mesh);
    }

    createWallEnd(z, totalH, wallMat, hasDoor) {
        const group = new THREE.Group();
        group.position.set(0, 0, z);
        if (z > 0) group.rotation.y = Math.PI;

        // Wand - WICHTIG: Leicht nach hinten verschoben (-0.02)
        // Das verhindert das Flackern mit dem Türrahmen
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), wallMat);
        wall.position.set(0, totalH/2, -0.02); 
        group.add(wall);

        if (hasDoor) {
            // Rahmen beginnt bei z=0 und geht bis +0.2
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.2), new THREE.MeshStandardMaterial({color:0x333333}));
            frame.position.set(0, 1.2, 0.1); // Mitte bei 0.1
            group.add(frame);
            
            // Türblatt
            const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), new THREE.MeshStandardMaterial({color:0x555555}));
            door.position.set(0, 1.2, 0.15); // Etwas weiter vorne als die Rahmenmitte
            group.add(door);
        }
        this.scene.add(group);
    }

    createGrateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        // Hellerer Hintergrund
        ctx.fillStyle = '#999999'; 
        ctx.fillRect(0,0,512,512);
        // Dunklere Linien
        ctx.strokeStyle = '#666666'; 
        ctx.lineWidth = 5;
        for(let i=0; i<=512; i+=64) {
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
        }
        ctx.strokeRect(0,0,512,512);
        return new THREE.CanvasTexture(canvas);
    }
}