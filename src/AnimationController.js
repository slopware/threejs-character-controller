import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/Addons.js";

export class AnimationController {
  constructor(playerMesh) {
    this.playerMesh = playerMesh;
    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.runAction = null;
    this.currentAction = null;
    this.keyDownFlag = false;
    this.animationTransitionFlag = false;
    this.currentAnimationState = "idle";

    // Movement constants
    this.MOVE_SPEED = 1.5;
    this.SPRINT_MULTIPLIER = 4.0;
    this.RUN_SPEED = this.MOVE_SPEED * this.SPRINT_MULTIPLIER;
  }

  async init() {
    this.mixer = new THREE.AnimationMixer(this.playerMesh);

    const idle = await this.loadFBXAnimation("./animations/idle.fbx");
    const walk = await this.loadFBXAnimation("./animations/walking.fbx");
    const run = await this.loadFBXAnimation("./animations/running.fbx");

    this.idleAction = this.mixer.clipAction(idle);
    this.walkAction = this.mixer.clipAction(walk);
    this.runAction = this.mixer.clipAction(run);

    this.idleAction.play();
    this.walkAction.play();
    this.runAction.play();

    this.idleAction.setEffectiveWeight(1);
    this.walkAction.setEffectiveWeight(0);
    this.runAction.setEffectiveWeight(0);
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  updateAnimationsBlended(deltaTime, currentSpeed, keyboardState) {
    const walkStartSpeed = 0.1;
    const walkFullSpeed = this.MOVE_SPEED;
    const runFullSpeed = this.MOVE_SPEED * this.SPRINT_MULTIPLIER;

    let idleWeight = 0;
    let walkWeight = 0;
    let runWeight = 0;

    if (currentSpeed < walkStartSpeed) {
      // Pure idle
      idleWeight = 1;
    } else if (currentSpeed < walkFullSpeed) {
      // Blend between idle and walk
      const t =
        (currentSpeed - walkStartSpeed) / (walkFullSpeed - walkStartSpeed);
      idleWeight = 1 - t;
      walkWeight = t;
    } else if (currentSpeed < runFullSpeed && keyboardState.shift) {
      // Blend between walk and run
      const t = (currentSpeed - walkFullSpeed) / (runFullSpeed - walkFullSpeed);
      walkWeight = 1 - t;
      runWeight = t;
    } else if (!keyboardState.shift) {
      // Full walk (not sprinting)
      walkWeight = 1;
    } else {
      // Full run
      runWeight = 1;
    }

    // Apply weights with smoothing
    const smoothingSpeed = 5.0;

    this.idleAction.setEffectiveWeight(
      THREE.MathUtils.lerp(
        this.idleAction.getEffectiveWeight(),
        idleWeight,
        smoothingSpeed * deltaTime
      )
    );
    this.walkAction.setEffectiveWeight(
      THREE.MathUtils.lerp(
        this.walkAction.getEffectiveWeight(),
        walkWeight,
        smoothingSpeed * deltaTime
      )
    );
    this.runAction.setEffectiveWeight(
      THREE.MathUtils.lerp(
        this.runAction.getEffectiveWeight(),
        runWeight,
        smoothingSpeed * deltaTime
      )
    );
  }

  loadFBXAnimation(filepath) {
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
}