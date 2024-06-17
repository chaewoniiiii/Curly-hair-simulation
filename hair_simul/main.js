import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vec3 } from 'three/examples/jsm/nodes/Nodes.js';

class HairSimulation {
    constructor(numParticles, restLength, gravity, damping, constraintIterations, root) {
        this.numParticles = numParticles;
        this.restLength = restLength;
        this.gravity = gravity;
        this.damping = damping;
        this.constraintIterations = constraintIterations;
        this.x = root.x;
        this.y = root.y;
        this.z = root.z;
        this.pos = [];
        this.pos1 = [];
        this.vel = [];
        this.d = [];
        this.tmpVec3 = new THREE.Vector3();

        this.initParticles();
    }

    initParticles() {
        let dx = 0;
        for (let i = 0; i < this.numParticles; i++) {
            this.pos.push(new THREE.Vector3(this.x + dx, this.y, this.z));
            this.pos1.push(this.pos[i].clone());
            this.vel.push(new THREE.Vector3());
            this.d.push(new THREE.Vector3());
            dx += this.restLength;
        }
    }

    FTL(index) {
        const leader = this.pos1[index - 1];
        const follower = this.pos1[index];

        const dist = leader.distanceTo(follower);
        const diff = dist - this.restLength;
        const direction = this.tmpVec3.copy(leader).sub(follower).normalize();
        const tmp = direction.multiplyScalar(diff * 0.5);
        this.d[index].copy(tmp);
        this.pos1[index].add(tmp);
        this.pos1[index - 1].sub(tmp);
    }

    solveConstraints() {
        for (let i = 1; i < this.numParticles; i++) {
            this.FTL(i);
        }
        this.pos1[0].copy(this.pos[0]);
    }

    integrate(dt) {
        for (let i = 1; i < this.numParticles; i++) {
            const dp = this.tmpVec3.copy(this.pos1[i]).sub(this.pos[i]);
            const val1 = dp.multiplyScalar(1 / dt);
            if (i < this.numParticles - 1) {
                const tmp = this.d[i + 1].clone().multiplyScalar((-1 / dt) * this.damping);
                val1.add(tmp);
            } else {
                val1.multiplyScalar(this.damping);
            }
            this.vel[i].copy(val1);
            this.pos[i].copy(this.pos1[i]);
        }
        this.vel[0].set(0, 0, 0);
    }

    applyExternalForces(dt) {
        for (let i = 1; i < this.numParticles; i++) {
            this.vel[i].add(this.gravity.clone().multiplyScalar(dt));
            this.pos1[i].add(this.vel[i].clone().multiplyScalar(dt));
        }
    }

    simulationStep(dt) {
        this.applyExternalForces(dt);
        for (let i = 0; i < this.constraintIterations; i++) {
            this.solveConstraints();
        }
        this.integrate(dt);
    }

    getPositions() {
        return this.pos;
    }
}

const hairSim = new HairSimulation(16, 3, new THREE.Vector3(0, -9.8, 0), 0.99, 15, new THREE.Vector3(0,25,0));
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

class Hair {
    constructor(numStrands) {

        this.numStrands = numStrands;
        this.numParticles = 100;
    }

    initStrand() {
        let cx = 0;
        let cz = 0;
        let radius = 0.01;

        for (let i = 0; i < numStrands; i++) {
            let angle = Math.random() * Math.PI * 2;
            let distance = Math.random() * radius;

            let x = cx + distance * Math.cos(angle);
            let z = cz + distance * Math.sin(angle);

            const hairSim = new HairSimulation(16, 3, new THREE.Vector3(0, -9.8, 0), 0.99, 15, new vec3(x,25,z));
            let tubeMesh = createTube(hairSim.getPositions());
            scene.add(tubeMesh);
        }
    }

    generateSpiralStrand(length, radius, root) {
        let angle = length / ((this.numParticles - 1) * radius);
        let step = 1;

        let dirX = new THREE.Vector3(1, 0, 0);
        let dirY = new THREE.Vector3(0,-1,0);
        let dirZ = new THREE.Vector3(0,1,1);

        let w = (Math.random() - 0.5) * 0.03;
        angle += w;

        for(let i=0; i < numParticles; i++){
            let curl_p = dirX.copy().multiplyScalar(Math.cos(i * angle)).add(dirZ.copy().multiplyScalar(Math.sin(i * angle))).sub(dirX).multiplyScalar(radius);
            curl_p.add(dirY.copy().multiplyScalar(i * step));

            let t = i / this.numParticles - 1;
        }
        
    }

    updateStrand(){
        hairSim.simulationStep(0.06);
        updateTube();
    }
}

//--------------------------

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 0, 1);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = -10;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.camera.left = -30;
scene.add(dirLight);

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

camera.position.z = 40;

const controls = new OrbitControls(camera, renderer.domElement);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 10, 30);
controls.update();

function createTube(positions) {
    const curve = new THREE.CatmullRomCurve3(positions);
    const tubeGeo = new THREE.TubeGeometry(curve, 200, 0.2, 20, false);
    const mesh = new THREE.Mesh(tubeGeo, material);
    return mesh;
}

function updateTube() {
    scene.remove(tubeMesh);
    tubeMesh = createTube(hairSim.getPositions());
    scene.add(tubeMesh);
}

let hair = new Hair(10);

function animate() {
    const dt = 0.06; // Fixed time step
    hair.initStrand();
    hair.updateStrand();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
