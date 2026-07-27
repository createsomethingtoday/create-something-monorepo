export interface PipelineRenderProfile {
  readonly version: 1;
  readonly id: 'pipeline-web-quality-desktop-v1' | 'pipeline-web-quality-compact-v1';
  readonly antialias: boolean;
  readonly maximumPixelRatio: number;
  readonly environment: { readonly width: number; readonly height: number };
  readonly surfaceTextureSize: number;
  readonly packetCount: number;
  readonly budgets: {
    readonly drawCalls: number;
    readonly geometries: number;
    readonly textures: number;
  };
}

export interface PipelineEnvironmentPalette {
  readonly ink: Rgb;
  readonly court: Rgb;
  readonly signal: Rgb;
  readonly signalSoft: Rgb;
}

type Rgb = readonly [number, number, number];
export type PipelineSurfaceSemantic = 'roughness' | 'normal';

const DESKTOP_PROFILE: PipelineRenderProfile = {
  version: 1,
  id: 'pipeline-web-quality-desktop-v1',
  antialias: true,
  maximumPixelRatio: 1.6,
  environment: { width: 48, height: 96 },
  surfaceTextureSize: 64,
  packetCount: 22,
  budgets: { drawCalls: 40, geometries: 28, textures: 4 }
};

const COMPACT_PROFILE: PipelineRenderProfile = {
  version: 1,
  id: 'pipeline-web-quality-compact-v1',
  antialias: false,
  maximumPixelRatio: 1.2,
  environment: { width: 24, height: 64 },
  surfaceTextureSize: 32,
  packetCount: 14,
  budgets: { drawCalls: 40, geometries: 28, textures: 4 }
};

export function derivePipelineRenderProfile(compact: boolean): PipelineRenderProfile {
  return structuredClone(compact ? COMPACT_PROFILE : DESKTOP_PROFILE);
}

/**
 * A small, deterministic equirectangular reflection probe. Horizontal softboxes create
 * material separation that a one-dimensional gradient cannot provide, without an asset fetch.
 */
export function createPipelineEnvironmentPixels(
  dimensions: PipelineRenderProfile['environment'],
  palette: PipelineEnvironmentPalette
): Uint8Array<ArrayBuffer> {
  const pixels = new Uint8Array(dimensions.width * dimensions.height * 4);
  for (let y = 0; y < dimensions.height; y += 1) {
    const v = y / (dimensions.height - 1);
    for (let x = 0; x < dimensions.width; x += 1) {
      const u = x / (dimensions.width - 1);
      const base =
        v < 0.48
          ? mix(palette.ink, palette.court, 0.08 + (v / 0.48) * 0.24)
          : mix(palette.court, palette.signalSoft, 0.3 + ((v - 0.48) / 0.52) * 0.45);
      const key = gaussian(wrappedDistance(u, 0.22), v - 0.8, 0.075, 0.065) * 0.86;
      const rim = gaussian(wrappedDistance(u, 0.78), v - 0.64, 0.11, 0.1) * 0.48;
      const horizon = Math.exp(-((v - 0.5) ** 2) / 0.0028) * 0.16;
      const signalBounce = gaussian(wrappedDistance(u, 0.5), v - 0.43, 0.22, 0.08) * 0.08;
      const colour: Rgb = [
        clampByte(
          base[0] +
            key * 255 +
            rim * palette.signalSoft[0] +
            horizon * palette.court[0] +
            signalBounce * palette.signal[0]
        ),
        clampByte(
          base[1] +
            key * 255 +
            rim * palette.signalSoft[1] +
            horizon * palette.court[1] +
            signalBounce * palette.signal[1]
        ),
        clampByte(
          base[2] +
            key * 255 +
            rim * palette.signalSoft[2] +
            horizon * palette.court[2] +
            signalBounce * palette.signal[2]
        )
      ];
      const offset = (y * dimensions.width + x) * 4;
      pixels.set([colour[0], colour[1], colour[2], 255], offset);
    }
  }
  return pixels;
}

/** Hash-stable, non-colour micro-surface maps. Noise is spatially filtered to avoid moire. */
export function createPipelineSurfacePixels(
  semantic: PipelineSurfaceSemantic,
  size: number,
  seed: number
): Uint8Array<ArrayBuffer> {
  if (!Number.isSafeInteger(size) || size < 8 || size > 256)
    throw new Error('Pipeline surface size must be an integer from 8 to 256');
  if (!Number.isSafeInteger(seed)) throw new Error('Pipeline surface seed must be an integer');
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      if (semantic === 'roughness') {
        const fine = coordinateNoise(x, y, seed) - 0.5;
        const broad = filteredNoise(x, y, seed, size) - 0.5;
        const value = clampByte(154 + fine * 16 + broad * 20);
        pixels.set([value, value, value, 255], offset);
      } else {
        const dx = filteredNoise(x + 1, y, seed, size) - filteredNoise(x - 1, y, seed, size);
        const dy = filteredNoise(x, y + 1, seed, size) - filteredNoise(x, y - 1, seed, size);
        const nx = -dx * 0.28;
        const ny = -dy * 0.28;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        pixels.set([normalByte(nx), normalByte(ny), normalByte(nz), 255], offset);
      }
    }
  }
  return pixels;
}

function filteredNoise(x: number, y: number, seed: number, size: number): number {
  let total = 0;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      total += coordinateNoise(wrap(x + offsetX, size), wrap(y + offsetY, size), seed);
    }
  }
  return total / 9;
}

function coordinateNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 1, 0x1f123bb5) ^ Math.imul(y + 1, 0x5f356495) ^ seed;
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 4_294_967_296;
}

function mix(left: Rgb, right: Rgb, amount: number): Rgb {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount
  ];
}

function gaussian(x: number, y: number, spreadX: number, spreadY: number): number {
  return Math.exp(-((x * x) / (2 * spreadX * spreadX) + (y * y) / (2 * spreadY * spreadY)));
}

function wrappedDistance(value: number, center: number): number {
  const distance = Math.abs(value - center);
  return Math.min(distance, 1 - distance);
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function normalByte(value: number): number {
  return clampByte((value * 0.5 + 0.5) * 255);
}
