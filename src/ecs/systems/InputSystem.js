import { System } from '../System.js';
import { Input } from '../Component.js';

export class InputSystem extends System {
  constructor(world) {
    super(world);
    this.setupEventListeners();
  }

  getRequiredComponents() {
    return [Input];
  }

  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (event) => {
      this.entities.forEach(entity => {
        const input = entity.getComponent(Input);
        const key = event.code.replace('Key', '').toLowerCase();
        if (input.keyboard[key] !== undefined) {
          input.keyboard[key] = true;
        }
        if (event.key === 'Shift') {
          input.keyboard.shift = true;
        }
      });
    });

    document.addEventListener('keyup', (event) => {
      this.entities.forEach(entity => {
        const input = entity.getComponent(Input);
        const key = event.code.replace('Key', '').toLowerCase();
        if (input.keyboard[key] !== undefined) {
          input.keyboard[key] = false;
        }
        if (event.key === 'Shift') {
          input.keyboard.shift = false;
        }
      });
    });

    // Mouse events
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== document.body) return;
      
      this.entities.forEach(entity => {
        const input = entity.getComponent(Input);
        input.mouse.movementX = event.movementX;
        input.mouse.movementY = event.movementY;
      });
    });

    document.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.entities.forEach(entity => {
        const input = entity.getComponent(Input);
        input.mouse.deltaY = event.deltaY;
      });
    });

    // Pointer lock
    document.body.addEventListener('click', () => {
      document.body.requestPointerLock();
    });
  }

  update(deltaTime) {
    // Reset mouse movement after each frame
    this.entities.forEach(entity => {
      const input = entity.getComponent(Input);
      input.mouse.movementX = 0;
      input.mouse.movementY = 0;
      input.mouse.deltaY = 0;
    });
  }
}