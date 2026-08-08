// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
// Seeded procedural paper surfaces. Generated once, shared across all sheets.
// Goal: restrained fiber tooth that survives close desktop viewing without
// reading as noise or as a photographic scan.

import {
  CanvasTexture,
  RepeatWrapping,
  LinearMipmapLinearFilter,
  LinearFilter,
  SRGBColorSpace
} from 'three';
import { makeRng, makeValueNoise2D, fbm2D } from './rng.js';

function createCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

// Warm optic-white fiber tooth. Very low contrast on purpose — paper is
// nearly uniform in value; the read comes from lighting, not albedo.
export function createPaperAlbedo(seed, size = 1024) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const noise = makeValueNoise2D(seed);
  const fineNoise = makeValueNoise2D(seed + 7717);

  // Warm optic white base, slightly above neutral in R/G.
  const baseR = 243;
  const baseG = 241;
  const baseB = 235;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 26;
      const v = (y / size) * 26;

      // Broad stock unevenness — cloudy formation like real uncoated stock.
      const formation = fbm2D(noise, u, v, 4) - 0.5;
      // Fine tooth.
      const tooth = fineNoise(x * 0.9, y * 0.9) - 0.5;

      const delta = formation * 3.4 + tooth * 2.6;

      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, baseR + delta));
      data[i + 1] = Math.max(0, Math.min(255, baseG + delta));
      data[i + 2] = Math.max(0, Math.min(255, baseB + delta * 1.12));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Normal map derived from the same fiber field so albedo and relief agree.
export function createPaperNormal(seed, size = 1024, strength = 1.0) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const noise = makeValueNoise2D(seed);
  const fineNoise = makeValueNoise2D(seed + 7717);

  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 26;
      const v = (y / size) * 26;
      const formation = fbm2D(noise, u, v, 4);
      const tooth = fineNoise(x * 0.9, y * 0.9);
      height[y * size + x] = formation * 0.55 + tooth * 0.45;
    }
  }

  const idx = (x, y) => ((y + size) % size) * size + ((x + size) % size);
  const s = strength * 2.4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (height[idx(x + 1, y)] - height[idx(x - 1, y)]) * s;
      const dy = (height[idx(x, y + 1)] - height[idx(x, y - 1)]) * s;
      // Normalize (-dx, -dy, 1)
      const nz = 1;
      const len = Math.hypot(-dx, -dy, nz);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = (nz / len) * 0.5 * 255 + 127.5;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Laminated cut edge: the exposed core of the sheet stack. Slightly warmer
// and darker than the face, with a faint per-ply banding so thickness reads.
export function createEdgeAlbedo(seed, size = 512) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const rng = makeRng(seed);
  const noise = makeValueNoise2D(seed + 331);

  ctx.fillStyle = '#e6e2d8';
  ctx.fillRect(0, 0, size, size);

  // Ply banding runs across the edge (V direction = through thickness).
  const bands = 34;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const y = t * size;
    const h = size / bands;
    const shade = 214 + Math.floor(rng() * 22);
    ctx.fillStyle = `rgba(${shade},${shade - 4},${shade - 13},0.55)`;
    ctx.fillRect(0, y, size, h * 0.62);
  }

  // Fine cut chatter along the length of the edge.
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = noise(x * 0.35, y * 2.1) - 0.5;
      const i = (y * size + x) * 4;
      const d = n * 12;
      data[i] = Math.max(0, Math.min(255, data[i] + d));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + d));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + d));
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Near-black powder coat: fine orange-peel micro texture, no sparkle.
export function createPowderCoatNormal(seed, size = 512) {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const noise = makeValueNoise2D(seed + 9091);

  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] = fbm2D(noise, (x / size) * 90, (y / size) * 90, 3);
    }
  }

  const idx = (x, y) => ((y + size) % size) * size + ((x + size) % size);
  const s = 1.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (height[idx(x + 1, y)] - height[idx(x - 1, y)]) * s;
      const dy = (height[idx(x, y + 1)] - height[idx(x, y - 1)]) * s;
      const len = Math.hypot(-dx, -dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function disposeTextures(list) {
  for (const t of list) if (t && t.dispose) t.dispose();
}
// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
