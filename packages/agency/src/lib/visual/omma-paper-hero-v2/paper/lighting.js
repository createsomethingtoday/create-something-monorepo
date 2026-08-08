// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
// Controlled large-source lighting. One key soft box, one restrained cool
// fill, one grazing edge light to declare paper thickness. No colored bloom,
// no emissive accents, no post-process.

import {
  DirectionalLight,
  AmbientLight,
  HemisphereLight,
  RectAreaLight,
  Color,
  Vector2
} from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export function createLighting(scene, target) {
  RectAreaLightUniformsLib.init();

  const lights = [];

  // Large source key — a soft box above and slightly behind camera-left of
  // the object field. This produces the crisp-but-soft contact shadows.
  const key = new DirectionalLight(0xfff6e8, 2.15);
  key.name = 'keyLight';
  key.position.set(target.x - 0.55, target.y + 1.35, target.z + 0.72);
  key.target.position.copy(target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.2;
  key.shadow.camera.far = 4.2;
  const s = 0.62;
  key.shadow.camera.left = -s;
  key.shadow.camera.right = s;
  key.shadow.camera.top = s;
  key.shadow.camera.bottom = -s;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.006;
  key.shadow.radius = 2.2;
  scene.add(key);
  scene.add(key.target);
  lights.push(key);

  // Broad area source to give paper faces a real gradient across the sheet
  // rather than a flat lambert wash.
  const soft = new RectAreaLight(0xfffaf2, 2.4, 1.5, 0.95);
  soft.name = 'softBox';
  soft.position.set(target.x - 0.18, target.y + 0.95, target.z + 0.55);
  soft.lookAt(target.x, target.y, target.z);
  scene.add(soft);
  lights.push(soft);

  // Restrained cool fill from the shadow side. Keeps the near-black rail
  // from going dead and gives the gold something to reflect.
  const fill = new DirectionalLight(0xc8d6e2, 0.42);
  fill.name = 'coolFill';
  fill.position.set(target.x + 1.0, target.y + 0.42, target.z - 0.85);
  fill.target.position.copy(target);
  scene.add(fill);
  scene.add(fill.target);
  lights.push(fill);

  // Grazing edge light — low and raking so laminated cut edges and the
  // score relief read at desktop viewing distance.
  const graze = new DirectionalLight(0xfff2e2, 0.55);
  graze.name = 'grazeLight';
  graze.position.set(target.x + 0.35, target.y + 0.09, target.z + 1.1);
  graze.target.position.copy(target);
  scene.add(graze);
  scene.add(graze.target);
  lights.push(graze);

  const hemi = new HemisphereLight(0x2b3238, 0x090b0c, 0.55);
  hemi.name = 'hemiField';
  scene.add(hemi);
  lights.push(hemi);

  const amb = new AmbientLight(0x1a1f23, 0.7);
  amb.name = 'ambientField';
  scene.add(amb);
  lights.push(amb);

  return {
    lights,
    dispose() {
      for (const l of lights) {
        if (l.parent) l.parent.remove(l);
        if (l.dispose) l.dispose();
      }
    }
  };
}
