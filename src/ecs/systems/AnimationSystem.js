import { System } from '../System.js';
import { Animation, Movement, Input } from '../Component.js';

export class AnimationSystem extends System {
  getRequiredComponents() {
    return [Animation, Movement];
  }

  update(deltaTime) {
    this.entities.forEach(entity => {
      const animation = entity.getComponent(Animation);
      const movement = entity.getComponent(Movement);
      const input = entity.getComponent(Input);

      if (animation.mixer) {
        animation.mixer.update(deltaTime);
        this.updateAnimationWeights(animation, movement, input, deltaTime);
      }
    });
  }

  updateAnimationWeights(animation, movement, input, deltaTime) {
    const walkStartSpeed = 0.1;
    const walkFullSpeed = movement.moveSpeed;
    const runFullSpeed = movement.moveSpeed * movement.sprintMultiplier;
    const currentSpeed = movement.currentSpeed;

    let idleWeight = 0;
    let walkWeight = 0;
    let runWeight = 0;

    if (currentSpeed < walkStartSpeed) {
      idleWeight = 1;
    } else if (currentSpeed < walkFullSpeed) {
      const t = (currentSpeed - walkStartSpeed) / (walkFullSpeed - walkStartSpeed);
      idleWeight = 1 - t;
      walkWeight = t;
    } else if (currentSpeed < runFullSpeed && input && input.keyboard.shift) {
      const t = (currentSpeed - walkFullSpeed) / (runFullSpeed - walkFullSpeed);
      walkWeight = 1 - t;
      runWeight = t;
    } else if (!input || !input.keyboard.shift) {
      walkWeight = 1;
    } else {
      runWeight = 1;
    }

    // Apply weights with smoothing
    const smoothingSpeed = 5.0;
    
    if (animation.actions.has('idle')) {
      const idleAction = animation.actions.get('idle');
      const currentWeight = idleAction.getEffectiveWeight();
      const newWeight = currentWeight + (idleWeight - currentWeight) * smoothingSpeed * deltaTime;
      idleAction.setEffectiveWeight(newWeight);
    }

    if (animation.actions.has('walk')) {
      const walkAction = animation.actions.get('walk');
      const currentWeight = walkAction.getEffectiveWeight();
      const newWeight = currentWeight + (walkWeight - currentWeight) * smoothingSpeed * deltaTime;
      walkAction.setEffectiveWeight(newWeight);
    }

    if (animation.actions.has('run')) {
      const runAction = animation.actions.get('run');
      const currentWeight = runAction.getEffectiveWeight();
      const newWeight = currentWeight + (runWeight - currentWeight) * smoothingSpeed * deltaTime;
      runAction.setEffectiveWeight(newWeight);
    }
  }
}