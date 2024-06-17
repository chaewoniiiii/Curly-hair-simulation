import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class HairSimulation {
    constructor(numParticles, restLength, gravity, damping, constraintIterations, root) {
        this.numParticles = numParticles;
        this.restLength = restLength;
        this.gravity = gravity;
        this.damping = damping;
        this.constraintIterations = constraintIterations;
        this.root = root;
        this.pos = [];
        this.pos1 = [];
        this.vel = [];
        this.d = [];
        this.tmpVec3 = new THREE.Vector3();

        this.initParticles();
    }

    initParticles() {
        for (let i = 0; i < this.numParticles; i++) {
            const position = new THREE.Vector3(this.root.x + i * this.restLength, this.root.y, this.root.z);
            this.pos.push(position.clone());
            this.pos1.push(position.clone());
            this.vel.push(new THREE.Vector3());
            this.d.push(new THREE.Vector3());
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

//--------------------------
class Hair {
    constructor(numStrands) {
        this.numStrands = numStrands;
        this.hairSims = [];
        this.materials = [];
    }

    initStrand(scene) {
        let cx = 0;
        let cz = 0;
        let radius = 0.5;

        for (let i = 0; i < this.numStrands; i++) {
            let angle = Math.random() * Math.PI * 2;
            let distance = Math.random() * radius * 2;

            let x = cx + distance * Math.cos(angle);
            let z = cz + distance * Math.sin(angle);

            const root = new THREE.Vector3(x, 25, z);
            const hairSim = new HairSimulation(16, 3, new THREE.Vector3(0, -9.8, 0), 0.99, 15, root);
            this.hairSims.push(hairSim);

            const color = new THREE.Color(0xffffff);
            color.setHex(Math.random() * 0xffffff);
            const material = new THREE.MeshBasicMaterial({ color: color });
            this.materials.push(material);

            let tubeMesh = createTube(hairSim.getPositions(), material);
            tubeMesh.castShadow = true;
            scene.add(tubeMesh);
        }
    }

    generateSpiral(){

    }

    updateStrand() {
        for (const hairSim of this.hairSims) {
            hairSim.simulationStep(0.06);
        }
    }

    getMaterials() {
        return this.materials;
    }
}

//--------------------------

const container = document.body;

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

const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 10, 40);
controls.update();

const hair = new Hair(10); // Initialize Hair with 10 strands
hair.initStrand(scene);

function createTube(positions, material) {
    const curve = new THREE.CatmullRomCurve3(positions);
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.2, 20, false);
    const mesh = new THREE.Mesh(tubeGeo, material);
    return mesh;
}

function updateTube(hair) {
    const materials = hair.getMaterials();
    let i = 0;
    // Clear previous strands
    while (scene.children.length > 1) {
        scene.remove(scene.children[1]);
    }
    // Create and add new strands
    for (const hairSim of hair.hairSims) {
        const tubeMesh = createTube(hairSim.getPositions(), materials[i]);
        scene.add(tubeMesh);
        i++;
    }
}

function animate() {
    hair.updateStrand();
    updateTube(hair);
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
