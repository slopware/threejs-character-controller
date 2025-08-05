import * as THREE from "three";

export class CameraController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    // Camera rig system
    this.rig = {
      pivot: new THREE.Object3D(),
      yaw: new THREE.Object3D(),
      pitch: new THREE.Object3D(),
    };

    // Camera control variables
    this.targetYaw = 0;
    this.targetPitch = 0;

    // Configuration
    this.config = {
      followSpeed: 3,
      rotationSmoothing: 1.0,
      heightOffset: 1.5,
      defaultDistance: 5,
      minDistance: 0,
      maxDistance: 10,
      minPitch: -1,
      maxPitch: 0.1,
      mouseSensitivity: 0.0025,
      zoomSpeed: 0.005,
    };

    this.setupCameraHierarchy();
  }

  setupCameraHierarchy() {
    // Build camera hierarchy
    this.scene.add(this.rig.pivot);
    this.rig.pivot.add(this.rig.yaw);
    this.rig.yaw.add(this.rig.pitch);
    this.rig.pitch.add(this.camera);

    // Position camera back from pivot
    this.camera.position.set(0, 0, this.config.defaultDistance);
  }

  update(deltaTime, targetPosition) {
    // Smooth camera rotations
    this.rig.yaw.rotation.y +=
      (this.targetYaw - this.rig.yaw.rotation.y) *
      this.config.rotationSmoothing;
    this.rig.pitch.rotation.x +=
      (this.targetPitch - this.rig.pitch.rotation.x) *
      this.config.rotationSmoothing;

    // Update camera pivot to follow target
    const targetPivotPosition = targetPosition.clone();
    targetPivotPosition.y += this.config.heightOffset;

    // Smooth camera follow
    this.rig.pivot.position.lerp(
      targetPivotPosition,
      1 - Math.pow(0.001, deltaTime * this.config.followSpeed)
    );
  }

  onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;

    // Update rotation targets
    this.targetYaw -= event.movementX * this.config.mouseSensitivity;

    const newPitch =
      this.targetPitch - event.movementY * this.config.mouseSensitivity;
    this.targetPitch = Math.max(
      this.config.minPitch,
      Math.min(this.config.maxPitch, newPitch)
    );
  }

  onMouseWheel(event) {
    event.preventDefault();

    const newDistance =
      this.camera.position.z + event.deltaY * this.config.zoomSpeed;
    this.camera.position.z = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, newDistance)
    );
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // Get camera's current yaw rotation for movement calculations
  getYawRotation() {
    return this.rig.yaw.rotation.y;
  }
}
