import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/Addons.js';
import RAPIER from '@dimforge/rapier3d-compat';

// ECS imports
import { World } from './ecs/World.js';
import { 
  Transform, 
  Mesh, 
  Movement, 
  Input, 
  Animation, 
  Physics, 
  Camera 
} from './ecs/Component.js';

// System imports
import { InputSystem } from './ecs/systems/InputSystem.js';
import { MovementSystem } from './ecs/systems/MovementSystem.js';
import { PhysicsSystem } from './ecs/systems/PhysicsSystem.js';
import { AnimationSystem } from './ecs/systems/AnimationSystem.js';
import { CameraSystem } from './ecs/systems/CameraSystem.js';
import { RenderSystem } from './ecs/systems/RenderSystem.js';

// Global variables
let scene, renderer, camera;
let ecsWorld;
let rapierWorld, characterController;
let playerEntity, cameraEntity;

const clock = new THREE.Clock();

init();

async function init() {
  // Setup Three.js scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x88ccee, 0, 50);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x88ccee);
  document.body.appendChild(renderer.domElement);

  setupLighting();

  // Setup physics
  const physics = await setupPhysics();
  rapierWorld = physics.world;
  characterController = physics.characterController;

  // Create ECS world
  ecsWorld = new World();

  // Add systems to ECS world
  const inputSystem = new InputSystem(ecsWorld);
  const movementSystem = new MovementSystem(ecsWorld);
  const physicsSystem = new PhysicsSystem(ecsWorld, rapierWorld, characterController);
  const animationSystem = new AnimationSystem(ecsWorld);
  const cameraSystem = new CameraSystem(ecsWorld);
  const renderSystem = new RenderSystem(ecsWorld, renderer, scene, camera);

  ecsWorld.addSystem(inputSystem);
  ecsWorld.addSystem(movementSystem);
  ecsWorld.addSystem(physicsSystem);
  ecsWorld.addSystem(animationSystem);
  ecsWorld.addSystem(cameraSystem);
  ecsWorld.addSystem(renderSystem);

  // Create player entity
  await createPlayerEntity();

  // Create camera entity
  createCameraEntity();

  // Create environment
  createEnvironment();

  // Setup window resize handler
  window.addEventListener('resize', onWindowResize);

  animate();
}

async function createPlayerEntity() {
  // Load player model
  const playerMesh = await loadFBXModel('./models/Y Bot.fbx');
  playerMesh.scale.set(0.01, 0.01, 0.01);

  // Create player entity
  playerEntity = ecsWorld.createEntity();

  // Add components
  playerEntity
    .addComponent(new Transform({ x: 0, y: 0, z: 0 }))
    .addComponent(new Mesh(playerMesh))
    .addComponent(new Movement())
    .addComponent(new Input())
    .addComponent(new Physics());

  // Setup physics for player
  const physics = playerEntity.getComponent(Physics);
  const playerShape = RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 1, 0);
  physics.collider = rapierWorld.createCollider(playerShape);
  physics.characterController = characterController;

  // Setup animations
  const animationComponent = new Animation();
  playerEntity.addComponent(animationComponent);

  const mixer = new THREE.AnimationMixer(playerMesh);
  animationComponent.mixer = mixer;

  // Load animations
  const idle = await loadFBXAnimation('./animations/idle.fbx');
  const walk = await loadFBXAnimation('./animations/walking.fbx');
  const run = await loadFBXAnimation('./animations/running.fbx');

  const idleAction = mixer.clipAction(idle);
  const walkAction = mixer.clipAction(walk);
  const runAction = mixer.clipAction(run);

  idleAction.play();
  walkAction.play();
  runAction.play();

  idleAction.setEffectiveWeight(1);
  walkAction.setEffectiveWeight(0);
  runAction.setEffectiveWeight(0);

  animationComponent.actions.set('idle', idleAction);
  animationComponent.actions.set('walk', walkAction);
  animationComponent.actions.set('run', runAction);

  // Notify ECS world of component changes
  ecsWorld.onEntityChanged(playerEntity);
}

function createCameraEntity() {
  cameraEntity = ecsWorld.createEntity();

  const cameraComponent = new Camera(camera);
  
  // Setup camera rig
  cameraComponent.rig.pivot = new THREE.Object3D();
  cameraComponent.rig.yaw = new THREE.Object3D();
  cameraComponent.rig.pitch = new THREE.Object3D();

  scene.add(cameraComponent.rig.pivot);
  cameraComponent.rig.pivot.add(cameraComponent.rig.yaw);
  cameraComponent.rig.yaw.add(cameraComponent.rig.pitch);
  cameraComponent.rig.pitch.add(camera);

  camera.position.set(0, 0, cameraComponent.config.defaultDistance);

  // Set camera target to player
  cameraComponent.target = playerEntity;

  cameraEntity
    .addComponent(cameraComponent)
    .addComponent(new Input());

  ecsWorld.onEntityChanged(cameraEntity);
}

function createEnvironment() {
  // Add ground
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add grid
  const gridHelper = new THREE.GridHelper(50, 50);
  scene.add(gridHelper);

  // Add reference cubes as entities
  for (let i = 0; i < 10; i++) {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshLambertMaterial({ 
      color: Math.random() * 0xffffff 
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    
    const position = {
      x: (Math.random() - 0.5) * 20,
      y: 0.5,
      z: (Math.random() - 0.5) * 20
    };
    
    cube.position.set(position.x, position.y, position.z);
    cube.castShadow = true;
    cube.receiveShadow = true;

    // Create cube entity
    const cubeEntity = ecsWorld.createEntity();
    cubeEntity
      .addComponent(new Transform(position))
      .addComponent(new Mesh(cube));

    // Add physics collider
    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setTranslation(position.x, position.y, position.z);
    rapierWorld.createCollider(cubeColliderDesc);

    ecsWorld.onEntityChanged(cubeEntity);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Update ECS world
  ecsWorld.update(deltaTime);

  // Handle camera movement direction transformation
  const cameraSystem = ecsWorld.systems.find(s => s instanceof CameraSystem);
  if (cameraSystem && playerEntity) {
    const movement = playerEntity.getComponent(Movement);
    const cameraYaw = cameraSystem.getCameraYaw(cameraEntity);
    
    // Transform movement direction by camera yaw
    if (movement.direction.x !== 0 || movement.direction.z !== 0) {
      const euler = new THREE.Euler(0, cameraYaw, 0, 'XYZ');
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const direction = new THREE.Vector3(movement.direction.x, 0, movement.direction.z);
      direction.applyQuaternion(quaternion);
      
      movement.direction.x = direction.x;
      movement.direction.z = direction.z;
    }
  }
}

async function setupPhysics() {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  const characterController = world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);
  
  return { world, characterController };
}

function loadFBXModel(filepath) {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      filepath,
      (fbxGroup) => {
        fbxGroup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(fbxGroup);
      },
      (progress) => {
        console.log((progress.loaded / progress.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('Error loading model:', error);
        reject(error);
      }
    );
  });
}

function loadFBXAnimation(filepath) {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      filepath,
      (fbx) => {
        const animationClip = fbx.animations[0];
        animationClip.tracks = animationClip.tracks.filter((track) => {
          return (
            !track.name.includes('.position') ||
            (!track.name.includes('Hips') && !track.name.includes('mixamorig:Hips'))
          );
        });
        resolve(animationClip);
      },
      (progress) => {
        console.log((progress.loaded / progress.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('Error loading animation:', error);
        reject(error);
      }
    );
  });
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
  scene.add(hemiLight);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}