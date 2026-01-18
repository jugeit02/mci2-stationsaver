import * as THREE from 'three';

export class GameMenu {
    constructor(scene, cameraGroup) {
        this.scene = scene;
        this.cameraGroup = cameraGroup;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 2048;
        this.canvas.height = 1024;
        this.ctx = this.canvas.getContext('2d');
        
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        
        this.initMesh();
    }

    initMesh() {
        const geometry = new THREE.PlaneGeometry(2.0, 1.0);
        const material = new THREE.MeshBasicMaterial({ 
            map: this.texture,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1.6, -2.5); 
        this.scene.add(this.mesh);
    }

    showStart() {
        this.mesh.visible = true;
        this.drawBackground();
        
        // Titel (Etwas höher: Y=150)
        this.drawText("STATION SAVER", 150, '#00ff00', 'bold 180px "Courier New"');
        
        // --- NEU: Story / Erklärung ---
        this.drawText("Emergency! Pipes are bursting.", 260, '#00ffff', '60px "Courier New"');
        this.drawText("Fix leaks before oxygen runs out!", 330, '#00ffff', '60px "Courier New"');

        // Anleitung (Box etwas tiefer schieben)
        this.ctx.textAlign = 'left';
        const leftM = 200;
        
        this.drawTextSimple("- GRIP (Side Button): Teleport", leftM, 500, '#ffffff', '70px "Courier New"');
        this.drawTextSimple("- TRIGGER (Front Button): Grab & Fix", leftM, 600, '#ffffff', '70px "Courier New"');
        this.drawTextSimple("- Rotate hand to align pipe!", leftM, 700, '#ffff00', '70px "Courier New"');

        // Start Prompt
        this.ctx.textAlign = 'center';
        this.drawText("PRESS [ A ] or [ X ] TO START", 900, '#00ffff', 'bold 100px "Courier New"');
        
        this.texture.needsUpdate = true;
    }

    showGameOver(reason) {
        this.mesh.visible = true;
        this.drawBackground('#330000'); 

        this.drawText("GAME OVER", 300, '#ff0000', 'bold 200px "Courier New"');
        this.drawText(reason, 550, '#ffffff', '100px "Courier New"');
        
        this.drawText("PRESS [ A ] TO RESTART", 850, '#ffff00', '100px "Courier New"');
        this.texture.needsUpdate = true;
    }

    showWin(oxygenLeft) {
        this.mesh.visible = true;
        this.drawBackground('#003300'); 

        this.drawText("SUCCESS!", 300, '#00ff00', 'bold 200px "Courier New"');
        this.drawText(`Oxygen: ${Math.round(oxygenLeft)}%`, 550, '#ffffff', '100px "Courier New"');
        
        this.drawText("PRESS [ A ] TO RESTART", 850, '#ffff00', '100px "Courier New"');
        this.texture.needsUpdate = true;
    }

    hide() {
        this.mesh.visible = false;
    }

    drawBackground(color = '#111111') {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, w-20, h-20);
    }

    drawText(text, y, color, font) {
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center'; 
        this.ctx.fillText(text, this.canvas.width / 2, y);
    }
    
    drawTextSimple(text, x, y, color, font) {
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }
}