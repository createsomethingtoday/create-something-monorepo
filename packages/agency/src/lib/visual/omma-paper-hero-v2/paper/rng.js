// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
// Deterministic seeded RNG. No bare Math.random() anywhere in the scene.
// mulberry32 — small, fast, good enough distribution for procedural texture
// and fiber placement work.

export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rangeOf(rng, min, max) {
  return min + (max - min) * rng();
}

// 2D value noise with smooth interpolation, seeded.
export function makeValueNoise2D(seed) {
  const rng = makeRng(seed);
  const SIZE = 256;
  const MASK = SIZE - 1;
  const table = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < table.length; i++) table[i] = rng();

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  return function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const x0 = xi & MASK;
    const x1 = (xi + 1) & MASK;
    const y0 = yi & MASK;
    const y1 = (yi + 1) & MASK;
    const a = table[y0 * SIZE + x0];
    const b = table[y0 * SIZE + x1];
    const c = table[y1 * SIZE + x0];
    const d = table[y1 * SIZE + x1];
    const top = a + (b - a) * u;
    const bot = c + (d - c) * u;
    return top + (bot - top) * v;
  };
}

export function fbm2D(noise, x, y, octaves = 4, lacunarity = 2.03, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
// @ts-nocheck -- Omma v2 runtime mirror; visual source preserved.
