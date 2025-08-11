import * as THREE from 'three';
import { System } from '../System.js';
import { Transform, Movement, Physics, Mesh } from '../Component.js';

export class PhysicsSystem extends System {
  constructor(world, rapierWorld, characterController) {
    super(world);
    this.rapierWorld = rapierWorld;
    this.characterController = characterController;
  }

  getRequiredComponents() {
    return [Transform, Movement, Physics];
  }

  update(deltaTime) {
    // Step physics world
    this.rapierWorld.step();

    this.entities.forEach(entity => {
      const transform = entity.getComponent(Transform);
      const movement = entity.getComponent(Movement);
      const physics = entity.getComponent(Physics);
      const mesh = entity.getComponent(Mesh);

      if (physics.characterController && physics.collider) {
        // Apply movement using character controller
        if (movement.velocity.x !== 0 || movement.velocity.y !== 0 || movement.velocity.z !== 0) {
          const velocity = new THREE.Vector3(
            movement.velocity.x,
            movement.velocity.y,
            movement.velocity.z
          );

          this.characterController.computeColliderMovement(physics.collider, velocity);
          const computedMovement = this.characterController.computedMovement();
          
          // Update transform
          transform.position.x += computedMovement.x;
          transform.position.y += computedMovement.y;
          transform.position.z += computedMovement.z;

          // Update collider position
          physics.collider.setTranslation({
            x: transform.position.x,
            y: transform.position.y,
            z: transform.position.z
          });

          // Update mesh position if it exists
          if (mesh && mesh.mesh) {
            mesh.mesh.position.set(
              transform.position.x,
              transform.position.y,
              transform.position.z
            );

            // Handle rotation towards movement direction
            if (movement.currentSpeed > 0.01) {
              const lookAtPosition = new THREE.Vector3(
                transform.position.x + movement.direction.x,
                transform.position.y,
                transform.position.z + movement.direction.z
              );

              const rotationMatrix = new THREE.Matrix4();
              rotationMatrix.lookAt(
                lookAtPosition,
                new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z),
                mesh.mesh.up
              );

              const targetQuaternion = new THREE.Quaternion();
              targetQuaternion.setFromRotationMatrix(rotationMatrix);

              mesh.mesh.quaternion.rotateTowards(
                targetQuaternion,
                movement.rotationSpeed * deltaTime
              );
            }
          }
        }
      }
    });
  }
}