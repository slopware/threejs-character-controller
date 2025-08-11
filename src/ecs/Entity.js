// Entity class - just an ID with components
export class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
    this.active = true;
  }

  addComponent(component) {
    component.entity = this;
    this.components.set(component.constructor.name, component);
    return this;
  }

  getComponent(componentClass) {
    return this.components.get(componentClass.name);
  }

  hasComponent(componentClass) {
    return this.components.has(componentClass.name);
  }

  removeComponent(componentClass) {
    const component = this.components.get(componentClass.name);
    if (component) {
      component.entity = null;
      this.components.delete(componentClass.name);
    }
    return this;
  }

  hasComponents(...componentClasses) {
    return componentClasses.every(cls => this.hasComponent(cls));
  }
}