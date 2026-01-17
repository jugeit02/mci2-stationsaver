import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        // --- 1. Helligkeit & Materialien (Nicht mehr düster!) ---
        
        // Viel stärkeres Grundlicht
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); 
        this.scene.add(ambientLight);

        // Texturen
        const spaceTexture = this.createSpaceTexture();
        const floorTexture = this.createGrateTexture();
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(2, 5);

        // Materialien: Viel helleres Grau für alles
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: floorTexture, 
            color: 0xaaaaaa, // Hellgrau
            roughness: 0.5, 
            metalness: 0.4 
        });

        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0xdddddd, // Fast Weißgrau
            roughness: 0.4, 
            side: THREE.DoubleSide 
        });

        const slantMat = new THREE.MeshStandardMaterial({ 
            color: 0xbbbbbb, // Leicht dunklerer Akzent
            roughness: 0.5,
            side: THREE.DoubleSide
        });

        const glassMat = new THREE.MeshPhysicalMaterial({ 
            color: 0xaaddff, // Hellblaues Glas
            transparent: true, opacity: 0.3, 
            roughness: 0.1, metalness: 0.5, transmission: 0.6 
        });

        const ribMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
        const spaceMat = new THREE.MeshBasicMaterial({ map: spaceTexture });


        // --- 2. Geometrie-Aufbau ---
        const floorW = 2.0;
        const wallH = 1.6;
        const slantS = 0.8; 
        
        // Mathe für die Positionen (45 Grad)
        const offset = slantS * 0.707; 
        const totalH = wallH + 2 * offset;
        const xWall = floorW / 2 + offset / 2;


        // A) BODEN & DECKE (Wie vorher)
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorW, 20), wallMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = totalH;
        this.scene.add(ceiling);

        // B) SCHRÄGEN (Das Herzstück - Repariert)
        const slantGeo = new THREE.PlaneGeometry(slantS, 20);

        // -- OBEN (Die funktionierten ja, also Logik von früher wiederhergestellt) --
        // Oben Links
        const sl_TL = new THREE.Mesh(slantGeo, slantMat);
        sl_TL.position.set(-(floorW/2 + offset/2), totalH - offset/2, 0);
        sl_TL.rotation.x = Math.PI / 2; // Von der Decke...
        sl_TL.rotation.y = Math.PI / 4; // ...45 Grad runterklappen
        this.scene.add(sl_TL);

        // Oben Rechts
        const sl_TR = new THREE.Mesh(slantGeo, slantMat);
        sl_TR.position.set((floorW/2 + offset/2), totalH - offset/2, 0);
        sl_TR.rotation.x = Math.PI / 2;
        sl_TR.rotation.y = -Math.PI / 4; 
        this.scene.add(sl_TR);

        // -- UNTEN (Die Sorgenkinder - Jetzt symmetrisch zu oben angepasst) --
        // Unten Links
        const sl_BL = new THREE.Mesh(slantGeo, slantMat);
        sl_BL.position.set(-(floorW/2 + offset/2), offset/2, 0);
        sl_BL.rotation.x = -Math.PI / 2; // Vom Boden...
        sl_BL.rotation.y = -Math.PI / 4; // ...45 Grad hochklappen (Minus, weil Boden gedreht ist)
        this.scene.add(sl_BL);

        // Unten Rechts
        const sl_BR = new THREE.Mesh(slantGeo, slantMat);
        sl_BR.position.set((floorW/2 + offset/2), offset/2, 0);
        sl_BR.rotation.x = -Math.PI / 2;
        sl_BR.rotation.y = Math.PI / 4; 
        this.scene.add(sl_BR);


        // C) WÄNDE & FENSTER (Modular)
        const segmentLength = 2.5; 
        const segments = 8;
        const startZ = -8.75; 

        for (let i = 0; i < segments; i++) {
            const z = startZ + i * segmentLength;
            const isWindow = (i === 2 || i === 5);

            if (isWindow) {
                // Fenster mit dickeren Rahmen
                this.createDetailedWindow(z, segmentLength, wallH, xWall + offset/2, offset + wallH/2, true, ribMat, glassMat, spaceMat);
                this.createDetailedWindow(z, segmentLength, wallH, -(xWall + offset/2), offset + wallH/2, false, ribMat, glassMat, spaceMat);
            } else {
                // Normale Wand
                const wGeo = new THREE.PlaneGeometry(wallH, segmentLength);
                
                // Links (Drehung angepasst, damit sie glatt steht)
                const wL = new THREE.Mesh(wGeo, wallMat);
                wL.rotation.y = Math.PI / 2;
                wL.rotation.z = Math.PI / 2; 
                wL.position.set(-(floorW/2 + offset), offset + wallH/2, z);
                this.scene.add(wL);

                // Rechts
                const wR = new THREE.Mesh(wGeo, wallMat);
                wR.rotation.y = -Math.PI / 2;
                wR.rotation.z = Math.PI / 2;
                wR.position.set((floorW/2 + offset), offset + wallH/2, z);
                this.scene.add(wR);
            }
        }

        // --- 3. Enden & Details ---
        this.createDoorEnd(10, totalH, wallMat, ribMat);
        this.createWindowEnd(-10, totalH, ribMat, glassMat, spaceMat);

        // Rippen (Achteckige Rahmen)
        const ribGeo = new THREE.TorusGeometry(2.1, 0.15, 4, 8); 
        for (let z = -10; z <= 10; z += 2.5) {
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(0, totalH / 2, z);
            rib.rotation.z = Math.PI / 8; 
            this.scene.add(rib);
        }

        // Lichter
        for (let z = -8; z <= 8; z += 5) {
             const pl = new THREE.PointLight(0xffffff, 0.5, 12); // Reichweite erhöht
             pl.position.set(0, totalH - 0.5, z);
             this.scene.add(pl);
        }
    }

    // --- HELPER FUNKTIONEN (Fenster & Texturen) ---

    createDetailedWindow(z, length, height, x, y, isRight, frameMat, glassMat, spaceMat) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        if (!isRight) group.rotation.y = Math.PI;

        // Rahmen
        const t = 0.15; // Dicke
        const w = 0.3;  // Tiefe
        
        // Oben/Unten
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, length), frameMat);
        top.position.y = height/2 - t/2;
        group.add(top);
        
        const bot = new THREE.Mesh(new THREE.BoxGeometry(w, t, length), frameMat);
        bot.position.y = -height/2 + t/2;
        group.add(bot);

        // Pfosten
        const post = new THREE.Mesh(new THREE.BoxGeometry(w, height, t), frameMat);
        post.position.z = length/2 - t/2;
        group.add(post);
        
        const post2 = new THREE.Mesh(new THREE.BoxGeometry(w, height, t), frameMat);
        post2.position.z = -length/2 + t/2;
        group.add(post2);

        // Glas
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(length - 0.2, height - 0.2), glassMat);
        glass.rotation.y = -Math.PI / 2;
        group.add(glass);

        // Weltraum dahinter
        const space = new THREE.Mesh(new THREE.PlaneGeometry(length+1, height+1), spaceMat);
        space.rotation.y = -Math.PI / 2;
        space.position.x = 2; // Abstand
        group.add(space);

        this.scene.add(group);
    }

    createWindowEnd(z, totalH, frameMat, glassMat, spaceMat) {
        const group = new THREE.Group();
        group.position.set(0, totalH/2, z); 
        if (z > 0) group.rotation.y = Math.PI;

        const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.4), frameMat);
        group.add(frame);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.8), glassMat);
        glass.position.z = -0.1;
        group.add(glass);
        const space = new THREE.Mesh(new THREE.PlaneGeometry(15, 10), spaceMat);
        space.position.z = -4; 
        group.add(space);
        this.scene.add(group);
    }

    createDoorEnd(z, totalH, wallMat, frameMat) {
        const group = new THREE.Group();
        group.position.set(0, 0, z);
        group.rotation.y = Math.PI;

        // Wand
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), wallMat);
        wall.position.set(0, totalH/2, 0.1);
        group.add(wall);

        // Rahmen & Tür
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.3), frameMat);
        frame.position.set(0, 1.2, 0); 
        group.add(frame);
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.1), new THREE.MeshStandardMaterial({color: 0x555555}));
        door.position.set(0, 1.2, -0.1);
        group.add(door);

        this.scene.add(group);
    }

    createSpaceTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black'; ctx.fillRect(0,0,512,512);
        ctx.fillStyle = 'white';
        for(let i=0; i<400; i++) {
            const x = Math.random() * 512; y = Math.random() * 512;
            const r = Math.random() * 1.5;
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
        return new THREE.CanvasTexture(canvas);
    }

    createGrateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#bbbbbb'; // Viel Heller
        ctx.fillRect(0,0,512,512);
        ctx.strokeStyle = '#888888'; 
        ctx.lineWidth = 4;
        for(let i=0; i<=512; i+=32) {
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
        }
        ctx.strokeRect(0,0,512,512);
        return new THREE.CanvasTexture(canvas);
    }
}