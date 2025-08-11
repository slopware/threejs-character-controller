import * as THREE from 'three';
import { System } from '../System.js';
import { Camera, Transform, Input } from '../Component.js';

export class CameraSystem extends System {
  getRequiredComponents() {
    return [Camera, Input];
  }

  update(deltaTime) {
    this.entities.forEach(entity => {
      const camera = entity.getComponent(Camera);
      const input = entity.getComponent(Input);

      // Update camera rotation based on mouse input
      if (input.mouse.movementX !== 0 || input.mouse.movementY !== 0) {
        camera.targetYaw -= input.mouse.movementX * camera.config.mouseSensitivity;
        
        const newPitch = camera.targetPitch - input.mouse.movementY * camera.config.mouseSensitivity;
        camera.targetPitch = Math.max(
          camera.config.minPitch,
          Math.min(camera.config.maxPitch, newPitch)
        );
      }

      // Handle zoom
      if (input.mouse.deltaY !== 0) {
        const newDistance = camera.camera.position.z + input.mouse.deltaY * camera.config.zoomSpeed;
        camera.camera.position.z = Math.max(
          camera.config.minDistance,
          Math.min(camera.config.maxDistance, newDistance)
        );
      }

      // Smooth camera rotations
      if (camera.rig.yaw && camera.rig.pitch) {
        camera.rig.yaw.rotation.y += 
          (camera.targetYaw - camera.rig.yaw.rotation.y) * camera.config.rotationSmoothing;
        camera.rig.pitch.rotation.x += 
          (camera.targetPitch - camera.rig.pitch.rotation.x) * camera.config.rotationSmoothing;
      }

      // Follow target if set
      if (camera.target && camera.rig.pivot) {
        const targetTransform = camera.target.getComponent(Transform);
        if (targetTransform) {
          const targetPivotPosition = new THREE.Vector3(
            targetTransform.position.x,
            targetTransform.position.y + camera.config.heightOffset,
            targetTransform.position.z
          );

          camera.rig.pivot.position.lerp(
            targetPivotPosition,
            1 - Math.pow(0.001, deltaTime * camera.config.followSpeed)
          );
        }
      }
    });
  }

  // Helper method to get camera yaw for movement calculations
  getCameraYaw(cameraEntity) {
    const camera = cameraEntity.getComponent(Camera);
    return camera.rig.yaw ? camera.rig.yaw.rotation.y : 0;
  }
}