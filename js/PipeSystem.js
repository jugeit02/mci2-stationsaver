import * as THREE from 'three';
import { Pipe } from './Pipe.js';

export class PipeSystem {
    constructor(scene) {
        this.scene = scene;
        this.pipes = [];
        this.initLevel();
    }

    initLevel() {
        const startZ = -8.75;
        const segmentLength = 2.5;
        const heightMap = [1, 0, 1, 0, 1, 0, 1, 0]; 
        const HIGH_Y = 1.3;
        const LOW_Y = 0.75;

        for (let i = 0; i < 8; i++) {
            const zPos = startZ + (i * segmentLength);
            const yLeft = heightMap[i] === 1 ? HIGH_Y : LOW_Y;
            const yRight = heightMap[i] === 1 ? HIGH_Y : LOW_Y;
            
            this.pipes.push(new Pipe(this.scene, zPos, true, yLeft, 2.5, false));
            
            if (i > 0) {
                const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
                if (prevY !== yLeft) this.addVerticalPipe(-1.45, prevY, yLeft, zPos - 1.25, true);
            }

            this.pipes.push(new Pipe(this.scene, zPos, false, yRight, 2.5, false));
            
            if (i > 0) {
                const prevY = heightMap[i-1] === 1 ? HIGH_Y : LOW_Y;
                if (prevY !== yRight) this.addVerticalPipe(1.45, prevY, yRight, zPos - 1.25, false);
            }
        }
    }

    addVerticalPipe(x, yStart, yEnd, z, isLeft) {
        const midY = (yStart + yEnd) / 2;
        const height = Math.abs(yEnd - yStart);
        
        this.pipes.push(new Pipe(this.scene, z, isLeft, midY, height, true));
        
        const jointGeo = new THREE.SphereGeometry(0.075, 16, 16);
        const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const topJoint = new THREE.Mesh(jointGeo, jointMat);
        topJoint.position.set(x, yEnd, z); this.scene.add(topJoint);
        const botJoint = new THREE.Mesh(jointGeo, jointMat);
        botJoint.position.set(x, yStart, z); this.scene.add(botJoint);
    }

    reset() {
        this.pipes.forEach(p => {
            p.repair();
            if (p.spareGroup) p.spareGroup.visible = false;
        });
    }

    breakRandom() {
        const randomPipe = this.pipes[Math.floor(Math.random() * this.pipes.length)];
        randomPipe.breakPipe();
    }

    getBrokenCount() {
        return this.pipes.filter(p => p.isBroken).length;
    }

    update() {
        this.pipes.forEach(pipe => pipe.update());
    }
}