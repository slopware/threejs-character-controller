// function updateAnimationsBlended(deltaTime) {
//   // This approach blends animations based on speed continuously
//   // Creates very smooth transitions but more complex

//   const walkStartSpeed = 0.1;
//   const walkFullSpeed = MOVE_SPEED;
//   const runFullSpeed = MOVE_SPEED * SPRINT_MULTIPLIER;

//   let idleWeight = 0;
//   let walkWeight = 0;
//   let runWeight = 0;

//   if (currentSpeed < walkStartSpeed) {
//     // Pure idle
//     idleWeight = 1;
//   } else if (currentSpeed < walkFullSpeed) {
//     // Blend between idle and walk
//     const t =
//       (currentSpeed - walkStartSpeed) / (walkFullSpeed - walkStartSpeed);
//     idleWeight = 1 - t;
//     walkWeight = t;
//   } else if (currentSpeed < runFullSpeed && keyboardState.shift) {
//     // Blend between walk and run
//     const t = (currentSpeed - walkFullSpeed) / (runFullSpeed - walkFullSpeed);
//     walkWeight = 1 - t;
//     runWeight = t;
//   } else if (!keyboardState.shift) {
//     // Full walk (not sprinting)
//     walkWeight = 1;
//   } else {
//     // Full run
//     runWeight = 1;
//   }

//   // Apply weights with smoothing
//   const smoothingSpeed = 5.0; // How fast weights change

//   idleAction.setEffectiveWeight(
//     THREE.MathUtils.lerp(
//       idleAction.getEffectiveWeight(),
//       idleWeight,
//       smoothingSpeed * deltaTime
//     )
//   );
//   walkAction.setEffectiveWeight(
//     THREE.MathUtils.lerp(
//       walkAction.getEffectiveWeight(),
//       walkWeight,
//       smoothingSpeed * deltaTime
//     )
//   );
//   runAction.setEffectiveWeight(
//     THREE.MathUtils.lerp(
//       runAction.getEffectiveWeight(),
//       runWeight,
//       smoothingSpeed * deltaTime
//     )
//   );
// }

// function updateAnimations() {
//   const SPRINT_SPEED = MOVE_SPEED * SPRINT_MULTIPLIER;
//   //transition time = (final speed - initial speed)/acceleration
//   if (currentSpeed > 0) {
//     //accelerating from idle to walk
//     if (currentSpeed < MOVE_SPEED) {
//       idleAction.setEffectiveWeight(1 - currentSpeed / MOVE_SPEED);
//       walkAction.setEffectiveWeight(currentSpeed / MOVE_SPEED);
//     } else if (currentSpeed > MOVE_SPEED && currentSpeed < SPRINT_SPEED) {
//       walkAction.setEffectiveWeight(1 - currentSpeed / SPRINT_SPEED);
//       runAction.setEffectiveWeight(currentSpeed / SPRINT_SPEED);
//     }
//   } else {
//     idleAction.setEffectiveWeight(1);
//     walkAction.setEffectiveWeight(0);
//     runAction.setEffectiveWeight(0);
//   }
// }

// function transitionAnimation(oldState, newState) {
//   oldState.crossFadeTo(newState, 0.3, true); // 0.3s is more typical than 0.1s
//   animationTransitionFlag = true;
//   setTimeout(() => {
//     animationTransitionFlag = false;
//   }, 300); // Match the crossfade duration in milliseconds
// }

// Update animation weights based on speed
// function updateAnimationWeights(deltaTime) {
//   // Calculate target weights based on current speed
//   let targetIdleWeight = 0;
//   let targetWalkWeight = 0;
//   let targetRunWeight = 0;

//   const walkSpeed = MOVE_SPEED;
//   const runSpeed = MOVE_SPEED * SPRINT_MULTIPLIER;

//   if (currentSpeed < 0.1) {
//     // Idle
//     targetIdleWeight = 1;
//   } else if (keyboardState.shift == true && currentSpeed > 0.1) {
//     targetRunWeight = 1;
//   } else if (currentSpeed < walkSpeed * 1.5) {
//     // Blend between idle and walk
//     const blendFactor = currentSpeed / (walkSpeed * 1.5);
//     targetIdleWeight = 1 - blendFactor;
//     targetWalkWeight = blendFactor;
//   } else if (currentSpeed < runSpeed * 0.8) {
//     // Full walk
//     targetWalkWeight = 1;
//   } else {
//     // Blend between walk and run
//     const blendFactor = (currentSpeed - runSpeed * 0.4) / (runSpeed * 0.4);
//     targetWalkWeight = 1 - blendFactor;
//     targetRunWeight = blendFactor;
//     //targetRunWeight = 1;
//   }

//   // Smoothly transition weights
//   const lerpSpeed = animationState.transitionSpeed * deltaTime;

//   animationState.idleWeight +=
//     (targetIdleWeight - animationState.idleWeight) * lerpSpeed;
//   animationState.walkWeight +=
//     (targetWalkWeight - animationState.walkWeight) * lerpSpeed;
//   animationState.runWeight +=
//     (targetRunWeight - animationState.runWeight) * lerpSpeed;

//   // Apply weights to actions
//   idleAction.setEffectiveWeight(animationState.idleWeight);
//   walkAction.setEffectiveWeight(animationState.walkWeight);
//   runAction.setEffectiveWeight(animationState.runWeight);
// }

// function updateAnimationSpeed() {
//   if (!walkAction || !runAction) return;

//   // Scale walk animation if it has weight
//   if (animationState.walkWeight > 0) {
//     const speedRatio = currentSpeed / MOVE_SPEED;
//     walkAction.setEffectiveTimeScale(0.5 + speedRatio * 0.5);
//   }

//   // Scale run animation if it has weight
//   if (animationState.runWeight > 0) {
//     const speedRatio = currentSpeed / (MOVE_SPEED * SPRINT_MULTIPLIER);
//     runAction.setEffectiveTimeScale(0.8 + speedRatio * 0.2);
//   }
// }
