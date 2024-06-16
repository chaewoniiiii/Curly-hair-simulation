import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

et raycaster;
let intersection = null;

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

camera.position.z = 40;

const controls = new OrbitControls(camera, renderer.domElement);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 10, 30);
controls.update();

const restLength = 3;
const numParticles = 16;

const pos = [];
const pos1 = [];
const vel = [];
const d = [];

let x = 0;
for (let i = 0; i < numParticles; i++) {
    pos.push(new THREE.Vector3(x, 25, 0));
    pos1.push(pos[i].clone());
    vel.push(new THREE.Vector3());
    d.push(new THREE.Vector3());
    x += restLength;
}

const gravity = new THREE.Vector3(0, -9.8, 0);
const tmpVec3 = new THREE.Vector3();
const damping = 0.99;
const constraintIterations = 15;

function FTL(index) {
    const leader = pos1[index - 1];
    const follower = pos1[index];

    const dist = leader.distanceTo(follower);
    const diff = dist - restLength;
    const direction = tmpVec3.copy(leader).sub(follower).normalize();
    const tmp = direction.multiplyScalar(diff * 0.5);
    d[index].copy(tmp);
    pos1[index].add(tmp);
    pos1[index - 1].sub(tmp);
}

function solveConstraints() {
    for (let i = 1; i < numParticles; i++) {
        FTL(i);
    }
    pos1[0].copy(pos[0]);
}

function integrate(dt) {
    for (let i = 1; i < numParticles; i++) {
        const dp = tmpVec3.copy(pos1[i]).sub(pos[i]);
        const val1 = dp.multiplyScalar(1 / dt);
        if (i < numParticles - 1) {
            const tmp = d[i + 1].clone().multiplyScalar((-1 / dt) * damping);
            val1.add(tmp);
        } else {
            val1.multiplyScalar(damping);
        }
        vel[i].copy(val1);
        pos[i].copy(pos1[i]);
    }
    vel[0].set(0, 0, 0);
}

function applyExternalForces(dt) {
    for (let i = 1; i < numParticles; i++) {
        vel[i].add(gravity.clone().multiplyScalar(dt));
        pos1[i].add(vel[i].clone().multiplyScalar(dt));
    }
}

const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

function createTube() {
    const curve = new THREE.CatmullRomCurve3(pos);
    const tubeGeo = new THREE.TubeGeometry(curve, 200, 0.2, 20, false);
    const mesh = new THREE.Mesh(tubeGeo, material);
    return mesh;
}

let tubeMesh = createTube();
scene.add(tubeMesh);

function updateTube() {
    scene.remove(tubeMesh);
    tubeMesh = createTube();
    scene.add(tubeMesh);
}

function simulation(dt) {
    applyExternalForces(dt);
    for (let i = 0; i < constraintIterations; i++) {
        solveConstraints();
    }
    integrate(dt);
}

function animate() {
    const dt = 0.06; // Fixed time step
    simulation(dt);
    updateTube();
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
