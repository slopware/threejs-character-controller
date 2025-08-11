import * as THREE from 'three';
import { System } from '../System.js';
import { Transform, Movement, Input, Physics } from '../Component.js';

export class MovementSystem extends System {
  getRequiredComponents() {
    return [Transform, Movement, Input];
  }

  update(deltaTime) {
    this.entities.forEach(entity => {
      const transform = entity.getComponent(Transform);
      const movement = entity.getComponent(Movement);
      const input = entity.getComponent(Input);
      const physics = entity.getComponent(Physics);

      // Calculate input direction
      const inputVelocity = new THREE.Vector3();
      if (input.keyboard.w) inputVelocity.z = -1;
      if (input.keyboard.s) inputVelocity.z = 1;
      if (input.keyboard.a) inputVelocity.x = -1;
      if (input.keyboard.d) inputVelocity.x = 1;

      // Determine target speed
      if (inputVelocity.length() > 0) {
        inputVelocity.normalize();
        movement.targetSpeed = movement.moveSpeed * (input.keyboard.shift ? movement.sprintMultiplier : 1.0);
        
        // Store movement direction (will be transformed by camera later)
        movement.direction.x = inputVelocity.x;
        movement.direction.y = inputVelocity.y;
        movement.direction.z = inputVelocity.z;
      } else {
        movement.targetSpeed = 0;
      }

      // Smooth acceleration/deceleration
      if (movement.currentSpeed < movement.targetSpeed) {
        movement.currentSpeed += movement.accelerationSpeed * deltaTime;
        movement.currentSpeed = Math.min(movement.currentSpeed, movement.targetSpeed);
      } else if (movement.currentSpeed > movement.targetSpeed) {
        movement.currentSpeed -= movement.decelerationSpeed * deltaTime;
        movement.currentSpeed = Math.max(movement.currentSpeed, movement.targetSpeed);
      }

      // Apply movement (will be handled by PhysicsSystem if physics component exists)
      if (movement.currentSpeed > 0.01) {
        const velocity = new THREE.Vector3(
          movement.direction.x,
          movement.direction.y,
          movement.direction.z
        ).multiplyScalar(movement.currentSpeed * deltaTime);

        movement.velocity.x = velocity.x;
        movement.velocity.y = velocity.y;
        movement.velocity.z = velocity.z;
      } else {
        movement.velocity.x = 0;
        movement.velocity.y = 0;
        movement.velocity.z = 0;
      }
    });
  }
}