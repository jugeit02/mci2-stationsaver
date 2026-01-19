import * as THREE from 'three';
import { Pipe } from './Pipe.js';

function createCastIronTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#666666'; ctx.fillRect(0,0,size,size);
    for(let i=0; i<5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#777777' : '#555555';
        ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
    }
    return new THREE.CanvasTexture(canvas);
}
const ironTexture = createCastIronTexture();

export class PipeSystem {
    constructor(scene) {
        this.scene = scene;
        this.pipes = [];
        this.initLevel();
    }

    initLevel() {
        const startZ = -8.75;
        const segmentLength = 2.5;
        const mapL = [0, 1, 0, 1, 0, 1, 0, 1]; 
        const mapR = [1, 0, 1, 0, 1, 0, 1, 0]; 
        const HIGH_Y = 1.9; const LOW_Y = 0.9;

        for (let i = 0; i < 8; i++) {
            const zPos = startZ + (i * segmentLength);
            const yL = mapL[i] === 1 ? HIGH_Y : LOW_Y;
            const yR = mapR[i] === 1 ? HIGH_Y : LOW_Y;

            this.pipes.push(new Pipe(this.scene, zPos, true, yL, 2.5, false));
            if (i > 0) {
                const prevYL = mapL[i-1] === 1 ? HIGH_Y : LOW_Y;
                if (prevYL !== yL) {
                    this.addVerticalPipe(-1.45, prevYL, yL, zPos - 1.25, true);
                    this.createElbow(-1.45, prevYL, zPos - 1.25);
                    this.createElbow(-1.45, yL, zPos - 1.25);
                }
            }

            this.pipes.push(new Pipe(this.scene, zPos, false, yR, 2.5, false));
            if (i > 0) {
                const prevYR = mapR[i-1] === 1 ? HIGH_Y : LOW_Y;
                if (prevYR !== yR) {
                    this.addVerticalPipe(1.45, prevYR, yR, zPos - 1.25, false);
                    this.createElbow(1.45, prevYR, zPos - 1.25);
                    this.createElbow(1.45, yR, zPos - 1.25);
                }
            }
        }
    }

    addVerticalPipe(x, yStart, yEnd, z, isLeft) {
        const midY = (yStart + yEnd) / 2;
        const height = Math.abs(yEnd - yStart) - 0.12; 
        this.pipes.push(new Pipe(this.scene, z, isLeft, midY, height, true));
    }

    createElbow(x, y, z) {
        const jointGeo = new THREE.SphereGeometry(0.075, 32, 32); 
        const jointMat = new THREE.MeshStandardMaterial({ 
            color: 0x666666, roughness: 0.8, metalness: 0.6,
            bumpMap: ironTexture, bumpScale: 0.01
        }); 
        const joint = new THREE.Mesh(jointGeo, jointMat);
        joint.position.set(x, y, z);
        this.scene.add(joint);
    }

    reset() {
        this.pipes.forEach(p => {
            p.repair();
            if (p.spareGroup) p.spareGroup.visible = false;
        });
    }

    breakRandom() {
        const healthyPipes = this.pipes.filter(p => !p.isBroken);
        
        if (healthyPipes.length === 0) return;

        const randomPipe = healthyPipes[Math.floor(Math.random() * healthyPipes.length)];
        randomPipe.breakPipe();
    }

    getBrokenCount() {
        return this.pipes.filter(p => p.isBroken).length;
    }

    update() {
        this.pipes.forEach(pipe => pipe.update());
    }
}