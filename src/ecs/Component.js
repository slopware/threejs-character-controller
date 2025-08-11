// Base Component class
export class Component {
  constructor() {
    this.entity = null;
  }
}

// Transform component for position, rotation, scale
export class Transform extends Component {
  constructor(position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
}

// Mesh component for Three.js rendering
export class Mesh extends Component {
  constructor(mesh = null) {
    super();
    this.mesh = mesh;
  }
}

// Movement component for velocity and movement properties
export class Movement extends Component {
  constructor() {
    super();
    this.velocity = { x: 0, y: 0, z: 0 };
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.direction = { x: 0, y: 0, z: 0 };
    this.moveSpeed = 1.5;
    this.sprintMultiplier = 4.0;
    this.accelerationSpeed = 15.0;
    this.decelerationSpeed = 10.0;
    this.rotationSpeed = 5.0;
  }
}

// Input component for keyboard/mouse state
export class Input extends Component {
  constructor() {
    super();
    this.keyboard = {
      w: false,
      s: false,
      a: false,
      d: false,
      shift: false
    };
    this.mouse = {
      movementX: 0,
      movementY: 0,
      deltaY: 0
    };
  }
}

// Animation component
export class Animation extends Component {
  constructor() {
    super();
    this.mixer = null;
    this.actions = new Map();
    this.currentState = 'idle';
    this.weights = {
      idle: 1,
      walk: 0,
      run: 0
    };
  }
}

// Physics component for Rapier integration
export class Physics extends Component {
  constructor() {
    super();
    this.collider = null;
    this.characterController = null;
    this.isGrounded = false;
  }
}

// Camera component
export class Camera extends Component {
  constructor(camera = null) {
    super();
    this.camera = camera;
    this.target = null;
    this.rig = {
      pivot: null,
      yaw: null,
      pitch: null
    };
    this.targetYaw = 0;
    this.targetPitch = 0;
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
      zoomSpeed: 0.005
    };
  }
}