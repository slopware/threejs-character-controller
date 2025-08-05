import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/Addons.js";

//model loading
let object;

//animation
let mixer;
let idleAction;
let walkAction;
let runAction;
let currentAction = null;

const animationState = {
  idleWeight: 1,
  walkWeight: 0,
  runWeight: 0,
  transitionSpeed: 3, // How fast weights change
};
// Camera and scene components
let camera, scene, renderer;
let playerMesh;

// Camera rig system
const cameraRig = {
  pivot: new THREE.Object3D(),
  yaw: new THREE.Object3D(),
  pitch: new THREE.Object3D(),
};

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

// Camera control variables
let targetYaw = 0;
let targetPitch = 0;

// Input tracking
let keyboardState = {
  w: false, // Move forward
  s: false, // Move backward
  a: false, // Move left
  d: false, // Move right
  shift: false, // Sprint
};

// Movement constants
const MOVE_SPEED = 1.0; // Units per second
const SPRINT_MULTIPLIER = 5.0;
const ROTATION_SPEED = 5.0; // How fast character rotates to face movement
const ACCELERATION_SPEED = 10.0; // How quickly to reach target speed
const DECELERATION_SPEED = 10.0; // How quickly to stop

// Camera constants
const CAMERA_CONFIG = {
  followSpeed: 5,
  rotationSmoothing: 1.0,
  heightOffset: 1.5,
  defaultDistance: 5,
  minDistance: 1,
  maxDistance: 10,
  minPitch: -1,
  maxPitch: 0.1,
  mouseSensitivity: 0.0025,
  zoomSpeed: 0.005,
};

// Time management
const clock = new THREE.Clock();

init();

async function init() {
  // Setup scene
  scene = new THREE.Scene();

  scene.fog = new THREE.Fog(0x88ccee, 0, 50);

  setupLighting();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  // Build camera hierarchy
  scene.add(cameraRig.pivot);
  cameraRig.pivot.add(cameraRig.yaw);
  cameraRig.yaw.add(cameraRig.pitch);
  cameraRig.pitch.add(camera);

  // Position camera back from pivot
  camera.position.set(0, 0, CAMERA_CONFIG.defaultDistance);

  playerMesh = await loadFBXModel("./models/Y Bot.fbx");
  playerMesh.scale.set(0.01, 0.01, 0.01);
  scene.add(playerMesh);

  mixer = new THREE.AnimationMixer(playerMesh);

  const idle = await loadFBXAnimation("./animations/idle.fbx");
  const walk = await loadFBXAnimation("./animations/walking.fbx");
  const run = await loadFBXAnimation("./animations/running.fbx");

  idleAction = mixer.clipAction(idle);
  walkAction = mixer.clipAction(walk);
  runAction = mixer.clipAction(run);

  idleAction.play();
  walkAction.play();
  runAction.play();

  idleAction.setEffectiveWeight(1);
  walkAction.setEffectiveWeight(0);
  runAction.setEffectiveWeight(0);

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
    const cubeMaterial = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(
      (Math.random() - 0.5) * 20,
      0.5,
      (Math.random() - 0.5) * 20
    );
    cube.castShadow = true;
    cube.receiveShadow = true;
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

  // Update animations
  if (mixer) {
    mixer.update(deltaTime);
  }

  // Smooth camera rotations
  cameraRig.yaw.rotation.y +=
    (targetYaw - cameraRig.yaw.rotation.y) * CAMERA_CONFIG.rotationSmoothing;
  cameraRig.pitch.rotation.x +=
    (targetPitch - cameraRig.pitch.rotation.x) *
    CAMERA_CONFIG.rotationSmoothing;

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
    euler.set(0, cameraRig.yaw.rotation.y, 0, "XYZ");
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

    // Apply movement to player
    playerMesh.position.add(velocity);

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

  // Update camera pivot to follow player
  const targetPivotPosition = playerMesh.position.clone();
  targetPivotPosition.y += CAMERA_CONFIG.heightOffset;

  // Smooth camera follow
  cameraRig.pivot.position.lerp(
    targetPivotPosition,
    1 - Math.pow(0.001, deltaTime * CAMERA_CONFIG.followSpeed)
  );

  updateAnimationSpeed();

  updateAnimationWeights(deltaTime);

  renderer.render(scene, camera);
}

// Update animation weights based on speed
function updateAnimationWeights(deltaTime) {
  // Calculate target weights based on current speed
  let targetIdleWeight = 0;
  let targetWalkWeight = 0;
  let targetRunWeight = 0;

  const walkSpeed = MOVE_SPEED;
  const runSpeed = MOVE_SPEED * SPRINT_MULTIPLIER;

  if (currentSpeed < 0.1) {
    // Idle
    targetIdleWeight = 1;
  } else if (currentSpeed < walkSpeed * 1.5) {
    // Blend between idle and walk
    const blendFactor = currentSpeed / (walkSpeed * 1.5);
    targetIdleWeight = 1 - blendFactor;
    targetWalkWeight = blendFactor;
  } else if (currentSpeed < runSpeed * 0.8) {
    // Full walk
    targetWalkWeight = 1;
  } else {
    // Blend between walk and run
    const blendFactor = (currentSpeed - runSpeed * 0.4) / (runSpeed * 0.4);
    targetWalkWeight = 1 - blendFactor;
    targetRunWeight = blendFactor;
  }

  // Smoothly transition weights
  const lerpSpeed = animationState.transitionSpeed * deltaTime;

  animationState.idleWeight +=
    (targetIdleWeight - animationState.idleWeight) * lerpSpeed;
  animationState.walkWeight +=
    (targetWalkWeight - animationState.walkWeight) * lerpSpeed;
  animationState.runWeight +=
    (targetRunWeight - animationState.runWeight) * lerpSpeed;

  // Apply weights to actions
  idleAction.setEffectiveWeight(animationState.idleWeight);
  walkAction.setEffectiveWeight(animationState.walkWeight);
  runAction.setEffectiveWeight(animationState.runWeight);
}

function updateAnimationSpeed() {
  if (!walkAction || !runAction) return;

  // Scale walk animation if it has weight
  if (animationState.walkWeight > 0) {
    const speedRatio = currentSpeed / MOVE_SPEED;
    walkAction.setEffectiveTimeScale(0.5 + speedRatio * 0.5);
  }

  // Scale run animation if it has weight
  if (animationState.runWeight > 0) {
    const speedRatio = currentSpeed / (MOVE_SPEED * SPRINT_MULTIPLIER);
    runAction.setEffectiveTimeScale(0.8 + speedRatio * 0.2);
  }
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

function loadFBXAnimation(filepath) {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      filepath,
      (fbx) => {
        // The animation is in fbx.animations[0]
        const idleClip = fbx.animations[0];
        idleClip.tracks = idleClip.tracks.filter((track) => {
          // Remove any position tracks for the root/hips
          return (
            !track.name.includes(".position") ||
            (!track.name.includes("Hips") &&
              !track.name.includes("mixamorig:Hips"))
          );
        });
        resolve(idleClip);
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
  document.addEventListener("mousemove", onDocumentMouseMove);
  document.addEventListener("wheel", onDocumentMouseWheel);

  // Pointer lock
  document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  // Window resize
  window.addEventListener("resize", onWindowResize);
}

function onDocumentMouseMove(event) {
  if (document.pointerLockElement !== document.body) return;

  // Update rotation targets
  targetYaw -= event.movementX * CAMERA_CONFIG.mouseSensitivity;

  const newPitch =
    targetPitch - event.movementY * CAMERA_CONFIG.mouseSensitivity;
  targetPitch = Math.max(
    CAMERA_CONFIG.minPitch,
    Math.min(CAMERA_CONFIG.maxPitch, newPitch)
  );
}

function onDocumentMouseWheel(event) {
  event.preventDefault();

  const newDistance =
    camera.position.z + event.deltaY * CAMERA_CONFIG.zoomSpeed;
  camera.position.z = Math.max(
    CAMERA_CONFIG.minDistance,
    Math.min(CAMERA_CONFIG.maxDistance, newDistance)
  );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupLighting() {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Main directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
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
