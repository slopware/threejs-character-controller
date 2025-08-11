// Base System class
export class System {
  constructor(world) {
    this.world = world;
    this.entities = [];
  }

  // Override this to define which components this system requires
  getRequiredComponents() {
    return [];
  }

  // Called when an entity is added that matches our requirements
  onEntityAdded(entity) {
    this.entities.push(entity);
  }

  // Called when an entity is removed
  onEntityRemoved(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  // Override this for system logic
  update(deltaTime) {
    // Default implementation - override in subclasses
  }

  // Check if entity matches our component requirements
  matchesRequirements(entity) {
    const required = this.getRequiredComponents();
    return required.length > 0 && entity.hasComponents(...required);
  }
}