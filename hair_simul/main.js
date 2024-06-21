import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const anchoredParticles = [];

class HairSimulation {
    constructor(numParticles, restLength, gravity, damping, constraintIterations, root, sphere) {
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
        this.invMass = [];
        this.tmpVec3 = new THREE.Vector3();
        this.p = new THREE.Vector3();
        this.isP = false;
        this.anchored = false;
        this.radius = 3;
        this.sphere = sphere;
        this.initParticles();
    }

    initParticles() {
        for (let i = 0; i < this.numParticles; i++) {
            const position = new THREE.Vector3(this.root.x, this.root.y - i * this.restLength, this.root.z);
            this.pos.push(position.clone());
            this.pos1.push(position.clone());
            this.vel.push(new THREE.Vector3());
            this.d.push(new THREE.Vector3());
            this.invMass.push(1.0); // Default inverse mass
        }
        
        this.invMass[0] = 0.0; // Root particle is fixed
    }

    FTL(index) {
        const leader = this.pos1[index - 1];
        const follower = this.pos1[index];
        let dist = 1;
        if(follower === undefined){
            console.log('error!');
        }else{
            dist = leader.distanceTo(follower);
            
        }
        const diff = dist - this.restLength;
        const direction = this.tmpVec3.copy(leader).sub(follower).normalize();
        const adjustment = direction.multiplyScalar(diff * 0.5);
        this.d[index].copy(adjustment);
        this.pos1[index].add(adjustment);
        this.pos1[index - 1].sub(adjustment);
    }

    solveConstraints() {
        for (let i = 1; i < this.numParticles; i++) {
            this.FTL(i);
        }
        this.pos1[0].copy(this.pos[0]);
        if(this.grabId>0.0, this.isP == true){
            this.pos1[this.grabId].copy(this.p);
            if(isAdown){
                anchoredParticles.push([this.grabId,this.p.clone()])
                isAdown = false;
                this.anchored = true;
            }
        }
        if(anchoredParticles.length > 0){
            for(let i=0 ; i < anchoredParticles.length; i++){
                this.pos1[anchoredParticles[i][0]].copy(anchoredParticles[i][1]);
                this.invMass[anchoredParticles[i][0]] = 0.0;
            }
        }
     
    }
    
    startGrab(pos) {
        this.p.set(pos.x, pos.y, pos.z);
        this.isP = true;
        let minD2 = Infinity;
        this.grabId = -1;

        for (let i = 0; i < this.numParticles; i++) {
            if (!this.pos[i]) {
                continue;
            }
            let d2 = this.p.distanceToSquared(this.pos[i]);
            if (d2 < minD2) {
                minD2 = d2;
                this.grabId = i;
            }
        }
    
        if (this.grabId >= 0) {
            this.invMass[this.grabId] = 0.0;
            this.pos1[this.grabId].copy(this.p);
            this.vel[this.grabId].set(0, 0, 0);

        } else {
            console.log("Error: No particle grabbed.");
        }
    }
    

    moveGrabbed(pos, vel) {
        if (this.grabId >= 0) {
            this.p.set(pos.x, pos.y, pos.z);
            this.pos1[this.grabId].copy(this.p);
            this.vel[this.grabId].copy(vel);
        }

        
    }

    endGrab() {
        if (this.grabId >= 0) {
            this.invMass[this.grabId] = 1.0;
            this.pos[this.grabId].copy(this.pos1[this.grabId]);
        }
        this.grabId = -1;
        this.isP = false;
    }

    collisionDetection() {
        for (let i = 0; i < this.numParticles - 1; i++) {
            const p0 = this.pos1[i].clone();
            const p1 = this.pos1[i + 1].clone();
            const spherePos = this.sphere.position.clone();
    
            const diff_p0Sphere = p0.clone().sub(spherePos);
            const diff_p1Sphere = p1.clone().sub(spherePos);
            const diff = diff_p0Sphere.clone().sub(diff_p1Sphere);
    
            const t = -(diff_p0Sphere.dot(diff)) / diff.length();
            const clampedT = Math.min(Math.max(t, 0.0), 1.0);
    
            const p = diff_p0Sphere.add(diff.clone().multiplyScalar(clampedT));
    
            if (p.length() < this.radius) {
                const normal = p.clone().normalize().multiplyScalar(this.radius - p.length());
                this.pos1[i].add(normal);
                this.pos1[i+1].add(normal);
            }
        }
    }
    
    

    integrate(dt) {
        for (let i = 1; i < this.numParticles; i++) {
            if (this.invMass[i] == 0.0) {
                this.pos[i].copy(this.pos1[i]);
            }

            const dp = this.tmpVec3.copy(this.pos1[i]).sub(this.pos[i]);
            this.vel[i].copy(dp.multiplyScalar(1 / dt));
            this.pos[i].copy(this.pos1[i]);
        }
    }

    applyExternalForces(dt) {
        for (let i = 1; i < this.numParticles; i++) {
            if (this.invMass[i] == 0.0) continue;

            this.vel[i].add(this.gravity.clone().multiplyScalar(dt));
            this.vel[i].multiplyScalar(this.damping);
            this.pos1[i].add(this.vel[i].clone().multiplyScalar(dt));
        }
    }

    simulationStep(dt) {
        this.applyExternalForces(dt);
        for (let i = 0; i < this.constraintIterations; i++) {
            this.solveConstraints();
        }
        this.integrate(dt);
        this.collisionDetection();
    }

    getPositions() {
        return this.pos1;
    }
}

class Hair {
    constructor(numStrands, sphere) {
        this.numStrands = numStrands;
        this.hairSims = [];
        this.materials = [];
        this.sphere = sphere;
    }

    initStrand(scene) {
        let cx = 0;
        let cz = 0;
        let radius = 0.2;

        for (let i = 0; i < this.numStrands; i++) {
            let angle = Math.random() * Math.PI * 2;
            let distance = Math.random() * radius * 3;

            let x = cx + distance * Math.cos(angle);
            let z = cz + distance * Math.sin(angle);

            const root = new THREE.Vector3(x, 10, z);
            const hairSim = new HairSimulation(25, 1, new THREE.Vector3(0, -9.8, 0), 0.99, 5, root, sphere);
            this.hairSims.push(hairSim);

            const color = new THREE.Color(0xffffff);
            color.setHex(Math.random() * 0xffffff);
            const material = new THREE.MeshPhongMaterial({ color: color});
            this.materials.push(material);

            let tubeMesh = Hair.createTube(hairSim.getPositions(), material);
            tubeMesh.castShadow = true;
            tubeMesh.userData = hairSim; // Set userData for raycaster
            scene.add(tubeMesh);
        }
    }

    updateStrand() {
        for (const hairSim of this.hairSims) {
            hairSim.simulationStep(1/32);
        }
    }

    updateTube(scene) {
        let i = 0;
        const materials = this.getMaterials();

        // Clear previous strands
        while (scene.children.length > 5) {
            
            scene.remove(scene.children[5]);
        }

        // Create and add new strands
        for (const hairSim of this.hairSims) {
            const tubeMesh = Hair.createTube(hairSim.getPositions(), materials[i]);
            tubeMesh.castShadow = true;
            tubeMesh.userData = hairSim;
            scene.add(tubeMesh);
            i++;
        }
    }

    getMaterials() {
        return this.materials;
    }

    static createTube(positions, material) {
        const curve = new THREE.CatmullRomCurve3(positions);
        const tubeGeo = new THREE.TubeGeometry(curve, 70, 0.05, 30, false);
        const mesh = new THREE.Mesh(tubeGeo, material);
        return mesh;
    }
}

class Grabber {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 0.1; 
        this.physicsObject = null;
        this.nearbyObjects = [];
        this.distance = 0.0;
        this.prevPos = new THREE.Vector3();
        this.vel = new THREE.Vector3();
        this.time = 0.0;
        this.scopeWidth = 10;
        this.scopeHeight = 10;
        this.proximityRange = 5.0; // Define a proximity range to detect nearby objects

    }

    increaseTime(dt) {
        this.time += dt;
    }

    updateRaycaster(x, y) {
        var rect = renderer.domElement.getBoundingClientRect();
        this.mousePos = new THREE.Vector2();
        this.mousePos.x = ((x - rect.left) / rect.width) * 2 - 1;
        this.mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mousePos, camera);
    }

    findNearbyObjects(target) {
        this.nearbyObjects = [];
        for (const child of scene.children) {
            if (child.userData && child.userData instanceof HairSimulation) {
                const hairSim = child.userData;
                for (let i = 0; i < hairSim.numParticles; i++) {
                    if (hairSim.pos[i].distanceTo(target) < this.proximityRange) {
                        this.nearbyObjects.push(hairSim);
                        break;
                    }
                }
            }
        }
    }

    start(x, y) {
        this.physicsObject = null;

        this.updateRaycaster(x, y);
        var intersects = this.raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            var obj = intersects[0].object.userData;
            if (obj) {
                this.physicsObject = obj;
                this.distance = intersects[0].distance;
                var pos = this.raycaster.ray.origin.clone();
                pos.addScaledVector(this.raycaster.ray.direction, this.distance);
                this.physicsObject.startGrab(pos);
                this.findNearbyObjects(pos);
                for (const nearbyObject of this.nearbyObjects) {
                    nearbyObject.startGrab(pos);
                }
                this.prevPos.copy(pos);
                this.vel.set(0.0, 0.0, 0.0);
                this.time = 0.0;
            }
        }

    }

    move(x, y) {
        if (this.physicsObject) {
            this.updateRaycaster(x, y);
            const pos = this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction, this.distance);
            this.vel.copy(pos).sub(this.prevPos).multiplyScalar(1 / this.time);
            this.physicsObject.moveGrabbed(pos, this.vel);
            for (const nearbyObject of this.nearbyObjects) {
                nearbyObject.moveGrabbed(pos, this.vel);
            }
            this.prevPos.copy(pos);
            this.time = 0.0;
        }
    }

    end() {
        if (this.physicsObject) {
            this.physicsObject.endGrab(this.prevPos, this.vel);
            for (const nearbyObject of this.nearbyObjects) {
                nearbyObject.endGrab(this.prevPos, this.vel);
            }
            this.physicsObject = null;
        }
    }
}

function onPointer(evt) {
    evt.preventDefault();
    if (evt.type === "pointerdown") {
        grabber.start(evt.clientX, evt.clientY);
        mouseDown = true;
        if (grabber.physicsObject) {
            controls.saveState();
            controls.enabled = false;
        }
    } else if (evt.type === "pointermove" && mouseDown) {
        grabber.move(evt.clientX, evt.clientY);
   
    } else if (evt.type === "pointerup") {
        if (grabber.physicsObject) {
            grabber.end();
            controls.reset();
        }
        mouseDown = false;
        controls.enabled = true;
    }
}

function onKeyUp( evt ) {

    switch ( evt.keyCode ) {

        case 16: isAdown = true; break;

    }

}

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 3, 0);
dirLight.castShadow = true;
dirLight.shadow.bias = -0.01;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
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

camera.position.set(0, 10, 20);
controls.update();
scene.add( new THREE.AmbientLight( 0x505050 ) );
scene.fog = new THREE.Fog( 0x000000, 0, 200 );

const spotLight = new THREE.SpotLight( 0xffffff, 500 );
spotLight.position.set( 0, 10, 15 );
spotLight.angle = 1;
spotLight.penumbra = 1;
spotLight.decay = 2;
spotLight.distance = 0;
spotLight.shadow.mapSize.width = 1023;
spotLight.shadow.mapSize.height = 1023;
spotLight.shadow.camera.near = 1;
spotLight.shadow.camera.far = 10;
spotLight.shadow.focus = 1;
scene.add( spotLight );

const geometry = new THREE.SphereGeometry( 3, 16, 16 ); 
const material = new THREE.MeshPhongMaterial( { color: 0xD3D3D3, shininess: 30, specular: 0x505050 } ); 
const sphere = new THREE.Mesh( geometry, material );
sphere.castShadow = true; 
sphere.translateX(-5);
scene.add( sphere );

const planeGeo = new THREE.PlaneGeometry(1500,500);
const planeMaterial = new THREE.MeshPhongMaterial( { color: 0x808080, shininess: 150, side: THREE.DoubleSide} ); 
const plane = new THREE.Mesh( planeGeo, planeMaterial );
plane.castShadow = true; 
plane.receiveShadow = true;
plane.translateY(-30);
plane.rotateX(1.5707963267948967);
scene.add( plane );

const hair = new Hair(30,sphere); // Initialize Hair with 20 strands
hair.initStrand(scene);
spotLight.target = sphere;

let mouseDown = false;
let isAdown = false;
const grabber = new Grabber();
window.addEventListener("pointerdown", onPointer, false);
window.addEventListener("pointermove", onPointer, false);
window.addEventListener("pointerup", onPointer, false);
window.addEventListener( "keyup", onKeyUp );

function animate() {
    hair.updateStrand();
    hair.updateTube(scene);
    grabber.increaseTime(1/32);
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
