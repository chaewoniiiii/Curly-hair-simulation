import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Spring extends THREE.Mesh{
    constructor(radius, turns, segmentsPerTurn, height, growth, material){
      let g = new THREE.CylinderGeometry(0.1, 0.1, 1, 16, sT * T).translate(0, 0.5, 0).rotateX(Math.PI * 0.5);
      let initPos = g.attributes.position.clone();
      super(g, material);
      this.radius = radius;
      this.turns = turns;
      this.segmentsPerTurn = segmentsPerTurn;
      this.height = height;
      this.growth = growth;
      
      this.update = () => {
        let _n = new THREE.Vector3(0, 1, 0), _v3 = new THREE.Vector3(), _s = new THREE.Vector3();
  
        let pos = g.attributes.position;
        for(let i = 0; i < initPos.count; i++){
          let ratio = initPos.getZ(i) * this.growth;
          let angle = this.turns * Math.PI * 2 * ratio;
          _v3.fromBufferAttribute(initPos, i).setZ(0);
          _v3.applyAxisAngle(_n, angle + Math.PI * 0.5);
          _v3.add(_s.setFromCylindricalCoords(this.radius, angle, this.height * ratio));
          pos.setXYZ(i, ... _v3);
        }
        g.computeVertexNormals();
        pos.needsUpdate = true;
        
      }
    }
  }

let raycaster;
let intersection = null;

const container = document.body.id;

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
dirLight.position.set( 0, 0, 1 );
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = -10; 
dirLight.shadow.camera.far = 100; 
dirLight.shadow.camera.top = 30
dirLight.shadow.camera.right = 30
dirLight.shadow.camera.bottom = - 30
dirLight.shadow.camera.left = - 30
scene.add( dirLight );

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

camera.position.z = 40;

const controls = new OrbitControls( camera, renderer.domElement );

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set( 0, 10, 30 );
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

const positions = new Float32Array(numParticles * 3);
for (let i = 0; i < numParticles; i++) {
    positions[i * 3] = pos[i].x;
    positions[i * 3 + 1] = pos[i].y;
    positions[i * 3 + 2] = pos[i].z;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({ size: 6, sizeAttenuation: false });
const particles = new THREE.Points(geometry, material);
scene.add(particles);

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

function simulation(dt) {
    applyExternalForces(dt);
    for (let i = 0; i < constraintIterations; i++) {
        solveConstraints();
    }
    integrate(dt);

    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < numParticles; i++) {
        positions[i * 3] = pos[i].x;
        positions[i * 3 + 1] = pos[i].y;
        positions[i * 3 + 2] = pos[i].z;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

const curve = new THREE.CatmullRomCurve3( pos );
curve.mesh = new THREE.Line( geometry, new THREE.LineBasicMaterial( {
    color: 0x0000ff,
    opacity: 1
} ) );
curve.mesh.castShadow = true;

scene.add(curve.mesh);

let R = 2;
let T = 7;
let sT = 100;
let H = 50;
let spring = new Spring(R, T, sT, H, 0, new THREE.MeshNormalMaterial());
spring.update();
scene.add(spring);

function animate() {
    const dt = 0.06; // Fixed time step
    simulation(dt);
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

//--------------------------------------

class hair extends THREE.Mesh{
    constructor(radius, height, material, position, numParticles){

        this.radius = radius;
        this.height = height;
        this.material = material;
        this.numParticles = numParticles;
        this.Cpos = pos.copy();

        let geometry = new THREE.CylinderGeometry(radius, radius, height, numParticles - 1);
        let initpos = geometry.attributes.position;

    }

    curlyHairGenerator(pos){
        for(i = this.pos ; i < numParticles; i++){
            let cx = Cpos.x;
            let cz = Cpos.z;
        }
    }

    SpiralStrand(){

    }
}
