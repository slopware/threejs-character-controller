// ECS World - manages entities and systems
export class World {
  constructor() {
    this.entities = new Map();
    this.systems = [];
    this.nextEntityId = 1;
  }

  createEntity() {
    const entity = new Entity(this.nextEntityId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (entity) {
      // Notify systems
      this.systems.forEach(system => {
        if (system.entities.includes(entity)) {
          system.onEntityRemoved(entity);
        }
      });
      this.entities.delete(entityId);
    }
  }

  addSystem(system) {
    this.systems.push(system);
    
    // Check existing entities for this system
    this.entities.forEach(entity => {
      if (system.matchesRequirements(entity)) {
        system.onEntityAdded(entity);
      }
    });
  }

  // Call this when components are added to entities
  onEntityChanged(entity) {
    this.systems.forEach(system => {
      const hasEntity = system.entities.includes(entity);
      const shouldHave = system.matchesRequirements(entity);

      if (shouldHave && !hasEntity) {
        system.onEntityAdded(entity);
      } else if (!shouldHave && hasEntity) {
        system.onEntityRemoved(entity);
      }
    });
  }

  update(deltaTime) {
    this.systems.forEach(system => system.update(deltaTime));
  }

  getEntitiesWith(...componentClasses) {
    return Array.from(this.entities.values()).filter(entity => 
      entity.hasComponents(...componentClasses)
    );
  }
}

import { Entity } from './Entity.js';