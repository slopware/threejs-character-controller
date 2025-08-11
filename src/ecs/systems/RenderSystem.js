import { System } from '../System.js';
import { Mesh, Transform } from '../Component.js';

export class RenderSystem extends System {
  constructor(world, renderer, scene, camera) {
    super(world);
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  getRequiredComponents() {
    return [Mesh, Transform];
  }

  onEntityAdded(entity) {
    super.onEntityAdded(entity);
    const mesh = entity.getComponent(Mesh);
    if (mesh.mesh && !this.scene.children.includes(mesh.mesh)) {
      this.scene.add(mesh.mesh);
    }
  }

  onEntityRemoved(entity) {
    super.onEntityRemoved(entity);
    const mesh = entity.getComponent(Mesh);
    if (mesh.mesh) {
      this.scene.remove(mesh.mesh);
    }
  }

  update(deltaTime) {
    // Sync mesh positions with transform components
    this.entities.forEach(entity => {
      const mesh = entity.getComponent(Mesh);
      const transform = entity.getComponent(Transform);

      if (mesh.mesh) {
        mesh.mesh.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        mesh.mesh.rotation.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z
        );
        mesh.mesh.scale.set(
          transform.scale.x,
          transform.scale.y,
          transform.scale.z
        );
      }
    });

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
}