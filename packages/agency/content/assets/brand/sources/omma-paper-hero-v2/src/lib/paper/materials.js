// Shared material set. Created once per scene instance, disposed explicitly.

import { MeshStandardMaterial, MeshPhysicalMaterial, Vector2, Color } from 'three';
import {
  createPaperAlbedo,
  createPaperNormal,
  createEdgeAlbedo,
  createPowderCoatNormal
} from './textures.js';

export const PALETTE = {
  // Coherent neutral instrument field. Single field, no split gradient.
  field: 0x0e1113,
  paper: 0xf3f1eb,
  paperShadowed: 0xe9e6de,
  edge: 0xe6e2d8,
  rail: 0x111417,
  railTop: 0x161a1d,
  // Muted review gold. Reflective metal, not emissive.
  gold: 0xa8873f
};

export function createMaterials(seed) {
  const paperAlbedo = createPaperAlbedo(seed, 1024);
  const paperNormal = createPaperNormal(seed, 1024, 0.85);
  const edgeAlbedo = createEdgeAlbedo(seed + 12, 512);
  const coatNormal = createPowderCoatNormal(seed + 44, 512);

  paperAlbedo.repeat.set(1, 1);
  paperNormal.repeat.set(1, 1);

  const paperFace = new MeshStandardMaterial({
    color: new Color(PALETTE.paper),
    map: paperAlbedo,
    normalMap: paperNormal,
    normalScale: new Vector2(0.34, 0.34),
    roughness: 0.86,
    metalness: 0.0
  });

  // Slightly rougher + fractionally darker for interior stack faces that
  // sit in occlusion; keeps layered edges from flattening out.
  const paperFaceInner = paperFace.clone();
  paperFaceInner.color = new Color(PALETTE.paperShadowed);
  paperFaceInner.roughness = 0.9;

  const paperEdge = new MeshStandardMaterial({
    color: new Color(PALETTE.edge),
    map: edgeAlbedo,
    roughness: 0.94,
    metalness: 0.0
  });

  const railMat = new MeshStandardMaterial({
    color: new Color(PALETTE.rail),
    normalMap: coatNormal,
    normalScale: new Vector2(0.5, 0.5),
    roughness: 0.62,
    metalness: 0.18
  });

  const railTopMat = new MeshStandardMaterial({
    color: new Color(PALETTE.railTop),
    normalMap: coatNormal,
    normalScale: new Vector2(0.42, 0.42),
    roughness: 0.55,
    metalness: 0.22
  });

  // Muted anodized/brushed gold. Low clearcoat, high roughness so it reads
  // as authority hardware rather than jewellery, and never blooms.
  const goldMat = new MeshPhysicalMaterial({
    color: new Color(PALETTE.gold),
    roughness: 0.42,
    metalness: 0.92,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    reflectivity: 0.4
  });

  const deckMat = new MeshStandardMaterial({
    color: new Color(0x14181b),
    roughness: 0.95,
    metalness: 0.0
  });

  return {
    paperFace,
    paperFaceInner,
    paperEdge,
    railMat,
    railTopMat,
    goldMat,
    deckMat,
    _textures: [paperAlbedo, paperNormal, edgeAlbedo, coatNormal]
  };
}

export function disposeMaterials(mats) {
  if (!mats) return;
  for (const key of Object.keys(mats)) {
    if (key === '_textures') continue;
    const m = mats[key];
    if (m && m.dispose) m.dispose();
  }
  for (const t of mats._textures || []) if (t && t.dispose) t.dispose();
}