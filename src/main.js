import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { FBXLoader, TrackballControls } from "three/examples/jsm/Addons.js";
import { CameraController } from "./CameraController.js";
import { AnimationController } from "./AnimationController.js";
import { transition } from "three/examples/jsm/tsl/display/TransitionNode.js";
import RAPIER from "@dimforge/rapier3d-compat";

//model loading
let object;

//animation
let animationController;

// Camera and scene components
let camera, scene, renderer;
let playerMesh;
let cameraController;

// Movement system variables
const inputVelocity = new THREE.Vector3();
const worldVelocity = new THREE.Vector3();
const euler = new THREE.Euler();
const cameraQuaternion = new THREE.Quaternion();
const targetQuaternion = new THREE.Quaternion();

// Smooth acceleration variables
let currentSpeed = 0;
let targetSpeed = 0;
const movementDirection = new THREE.Vector3();

// Input tracking
let keyboardState = {
  w: false, // Move forward
  s: false, // Move backward
  a: false, // Move left
  d: false, // Move right
  shift: false, // Sprint
};

// Movement constants
const MOVE_SPEED = 1.5; // Units per second
const SPRINT_MULTIPLIER = 4.0;
const ROTATION_SPEED = 5.0; // How fast character rotates to face movement
const ACCELERATION_SPEED = 15.0; // How quickly to reach target speed
const DECELERATION_SPEED = 10.0; // How quickly to stop
const RUN_SPEED = MOVE_SPEED * SPRINT_MULTIPLIER;
// Time management
const clock = new THREE.Clock();

let world, characterController, playerCollider;

init();

async function init() {
  scene = new THREE.Scene();

  scene.fog = new THREE.Fog(0x88ccee, 0, 50);

  setupLighting();

  const physics = await setupPhysics();
  world = physics.world;
  characterController = physics.characterController;
  playerCollider = physics.playerCollider;

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  // Initialize camera controller
  cameraController = new CameraController(camera, scene);

  playerMesh = await loadFBXModel("./models/Y Bot.fbx");
  playerMesh.scale.set(0.01, 0.01, 0.01);
  scene.add(playerMesh);

  animationController = new AnimationController(playerMesh);
  await animationController.init();

  // Add ground
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({
    color: 0x808080,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add grid for reference
  const gridHelper = new THREE.GridHelper(50, 50);
  scene.add(gridHelper);

  // Add some reference cubes
  for (let i = 0; i < 10; i++) {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(
      (Math.random() - 0.5) * 20,
      0.5,
      (Math.random() - 0.5) * 20
    );
    cube.castShadow = true;
    cube.receiveShadow = true;
    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(
      0.5,
      0.5,
      0.5
    ).setTranslation(cube.position.x, cube.position.y, cube.position.z);
    world.createCollider(cubeColliderDesc);
    scene.add(cube);
  }

  // Setup renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x88ccee);
  document.body.appendChild(renderer.domElement);

  // Setup input handlers
  setupInputHandlers();

  animate();
}

function animate() {
  if (!renderer) return;
  if (!playerMesh) {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    return; // Skip update if model not loaded yet
  }
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  world.step();

  // Update animations
  if (animationController) {
    animationController.update(deltaTime);
  }

  // Calculate input direction from WASD keys
  inputVelocity.set(0, 0, 0);

  if (keyboardState.w) inputVelocity.z = -1;
  if (keyboardState.s) inputVelocity.z = 1;
  if (keyboardState.a) inputVelocity.x = -1;
  if (keyboardState.d) inputVelocity.x = 1;

  // Determine target speed based on input
  if (inputVelocity.length() > 0) {
    // Normalize diagonal movement
    inputVelocity.normalize();

    // Set target speed
    targetSpeed = MOVE_SPEED * (keyboardState.shift ? SPRINT_MULTIPLIER : 1.0);

    // Store movement direction in camera space
    movementDirection.copy(inputVelocity);

    // Apply camera's yaw rotation to get world space direction
    euler.set(0, cameraController.getYawRotation(), 0, "XYZ");
    cameraQuaternion.setFromEuler(euler);
    movementDirection.applyQuaternion(cameraQuaternion);
  } else {
    // No input - decelerate to stop
    targetSpeed = 0;
  }

  // Smooth acceleration/deceleration
  if (currentSpeed < targetSpeed) {
    // Accelerating
    currentSpeed += ACCELERATION_SPEED * deltaTime;
    currentSpeed = Math.min(currentSpeed, targetSpeed);
  } else if (currentSpeed > targetSpeed) {
    // Decelerating
    currentSpeed -= DECELERATION_SPEED * deltaTime;
    currentSpeed = Math.max(currentSpeed, targetSpeed);
  }

  // Apply movement only if we have speed
  if (currentSpeed > 0.01) {
    // Calculate actual velocity
    const velocity = movementDirection
      .clone()
      .multiplyScalar(currentSpeed * deltaTime);

    characterController.computeColliderMovement(playerCollider, velocity);
    const movement = characterController.computedMovement();
    playerMesh.position.add(movement);
    playerCollider.setTranslation({
      x: playerMesh.position.x,
      y: playerMesh.position.y,
      z: playerMesh.position.z,
    });
    // Apply movement to player
    //playerMesh.position.add(velocity);

    // Calculate rotation to face movement direction
    const lookAtPosition = playerMesh.position.clone().add(movementDirection);
    lookAtPosition.y = playerMesh.position.y; // Keep rotation on horizontal plane

    // Create rotation matrix looking in movement direction
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.lookAt(lookAtPosition, playerMesh.position, playerMesh.up);
    targetQuaternion.setFromRotationMatrix(rotationMatrix);

    // Smoothly rotate character to face movement direction
    playerMesh.quaternion.rotateTowards(
      targetQuaternion,
      ROTATION_SPEED * deltaTime
    );
  }

  // Update camera
  cameraController.update(deltaTime, playerMesh.position);

  if (animationController) {
    animationController.updateAnimationsBlended(
      deltaTime,
      currentSpeed,
      keyboardState
    );
  }

  renderer.render(scene, camera);
}

async function setupPhysics() {
  await RAPIER.init();

  world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

  // Character controller for better player movement
  characterController = world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);

  // Create character collider (not a rigid body for character controller)
  const playerShape = RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(
    0,
    1,
    0
  );
  const playerCollider = world.createCollider(playerShape);

  return { world, characterController, playerCollider };
}

function loadFBXModel(filepath) {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      filepath,
      (fbxGroup) => {
        // Setup shadows
        fbxGroup.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(fbxGroup);
      },
      (progress) => {
        // Optional: show loading progress
        console.log((progress.loaded / progress.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("Error loading model:", error);
      }
    );
  });
}

function setupInputHandlers() {
  // Keyboard controls
  document.addEventListener("keydown", (event) => {
    const key = event.code.replace("Key", "").toLowerCase();
    if (keyboardState[key] !== undefined) {
      keyboardState[key] = true;
    }
    if (event.key === "Shift") {
      keyboardState.shift = true;
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.code.replace("Key", "").toLowerCase();
    if (keyboardState[key] !== undefined) {
      keyboardState[key] = false;
    }
    if (event.key === "Shift") {
      keyboardState.shift = false;
    }
  });

  // Mouse controls
  document.addEventListener("mousemove", (event) =>
    cameraController.onMouseMove(event)
  );
  document.addEventListener("wheel", (event) =>
    cameraController.onMouseWheel(event)
  );

  // Pointer lock
  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  // Window resize
  window.addEventListener("resize", () => {
    cameraController.onWindowResize();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function setupLighting() {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // Main directional light
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

  // Optional: Add hemisphere light for better ambient
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
  scene.add(hemiLight);
}
