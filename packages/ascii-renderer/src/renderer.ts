/**
 * ASCII Renderer - Main Class
 *
 * Shape-aware ASCII renderer that uses 6D character matching
 * and contrast enhancement for high-quality ASCII art.
 *
 * Based on: https://alexharri.com/blog/ascii-rendering
 */

import type {
  AsciiRendererConfig,
  AsciiRenderResult,
  ImageSource,
  ShapeVector,
  ExternalVector,
} from './types.js';
import { getCharacterShapes } from './shape-vectors.js';
import { CachedLookup } from './lookup.js';
import {
  sampleCellShapeVector,
  sampleExternalVector,
  imageDataSource,
  bufferSource,
  functionSource,
} from './sampling.js';
import { applyContrast } from './contrast.js';

/**
 * Default renderer configuration
 */
const DEFAULT_CONFIG: Required<AsciiRendererConfig> = {
  cellWidth: 8,
  cellHeight: 16,
  samplesPerCircle: 12,
  globalContrast: 2.0,
  directionalContrast: 3.0,
  charset: 'ascii95',
  fontFamily: 'monospace',
  fontSize: 14,
};

/**
 * AsciiRenderer - High-quality shape-aware ASCII rendering
 *
 * @example
 * ```typescript
 * const renderer = new AsciiRenderer({ globalContrast: 2.5 });
 *
 * // Render from canvas
 * const result = renderer.renderCanvas(canvas);
 * console.log(result.toString());
 *
 * // Render from ImageData
 * const ctx = canvas.getContext('2d')!;
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const result = renderer.render(imageData);
 * ```
 */
export class AsciiRenderer {
  private config: Required<AsciiRendererConfig>;
  private lookup: CachedLookup;

  constructor(config: AsciiRendererConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize character lookup
    const chars = getCharacterShapes(this.config.charset);
    this.lookup = new CachedLookup(chars, { bitsPerComponent: 5 });
  }

  /**
   * Render an ImageSource to ASCII
   */
  renderSource(source: ImageSource): AsciiRenderResult {
    const { cellWidth, cellHeight, samplesPerCircle, globalContrast, directionalContrast } =
      this.config;

    const cols = Math.floor(source.width / cellWidth);
    const rows = Math.floor(source.height / cellHeight);

    const characters: string[][] = [];
    const useDirectional = directionalContrast > 1;

    for (let row = 0; row < rows; row++) {
      const rowChars: string[] = [];

      for (let col = 0; col < cols; col++) {
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;

        // Sample internal shape vector
        let internal = sampleCellShapeVector(
          source,
          cellX,
          cellY,
          cellWidth,
          cellHeight,
          samplesPerCircle
        );

        // Sample external for directional contrast (if enabled)
        let external: ExternalVector | null = null;
        if (useDirectional) {
          external = sampleExternalVector(
            source,
            cellX,
            cellY,
            cellWidth,
            cellHeight,
            Math.max(6, samplesPerCircle - 4)
          );
        }

        // Apply contrast enhancement
        internal = applyContrast(internal, external, globalContrast, directionalContrast);

        // Find best matching character
        const char = this.lookup.find(internal);
        rowChars.push(char);
      }

      characters.push(rowChars);
    }

    return {
      characters,
      cols,
      rows,
      toString() {
        return this.characters.map((row) => row.join('')).join('\n');
      },
    };
  }

  /**
   * Render from ImageData (browser)
   */
  render(imageData: ImageData): AsciiRenderResult {
    return this.renderSource(imageDataSource(imageData));
  }

  /**
   * Render from canvas element (browser)
   */
  renderCanvas(canvas: HTMLCanvasElement): AsciiRenderResult {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this.render(imageData);
  }

  /**
   * Render from pixel buffer (Node.js)
   */
  renderBuffer(
    buffer: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    channels: 1 | 3 | 4 = 4
  ): AsciiRenderResult {
    return this.renderSource(bufferSource(buffer, width, height, channels));
  }

  /**
   * Render from a function that returns lightness values (procedural)
   */
  renderFunction(
    width: number,
    height: number,
    fn: (x: number, y: number) => number
  ): AsciiRenderResult {
    return this.renderSource(functionSource(width, height, fn));
  }

  /**
   * Render a simple 3D scene (sphere, cube, etc.)
   */
  renderScene3D(
    width: number,
    height: number,
    scene: 'sphere' | 'cube' | 'torus' | 'donut',
    rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  ): AsciiRenderResult {
    const { x: rotX, y: rotY, z: rotZ } = rotation;

    // Create lightness function based on scene
    const lightnessFn = (px: number, py: number): number => {
      // Normalize to [-1, 1]
      const x = (px / width) * 2 - 1;
      const y = (py / height) * 2 - 1;

      switch (scene) {
        case 'sphere': {
          // Ray-sphere intersection
          const r2 = x * x + y * y;
          if (r2 > 0.8) return 0;

          const z = Math.sqrt(0.8 - r2);
          // Rotate normal
          const nx = x * Math.cos(rotY) - z * Math.sin(rotY);
          const ny = y * Math.cos(rotX) - z * Math.sin(rotX);
          const nz = z * Math.cos(rotY) * Math.cos(rotX);
          // Simple lighting
          const light = Math.max(0, nx * 0.3 + ny * -0.3 + nz * 0.9);
          return light;
        }

        case 'cube': {
          // Simple cube with rotation
          const cx = x * Math.cos(rotY) - y * Math.sin(rotY);
          const cy = x * Math.sin(rotY) + y * Math.cos(rotY);

          const size = 0.5;
          if (Math.abs(cx) > size || Math.abs(cy) > size) return 0;

          // Face shading
          const edgeX = Math.abs(cx) > size - 0.05;
          const edgeY = Math.abs(cy) > size - 0.05;
          if (edgeX || edgeY) return 0.9;

          return cx > 0 ? 0.6 : 0.4;
        }

        case 'torus':
        case 'donut': {
          // Simplified torus (donut shape)
          const R = 0.5; // Major radius
          const r = 0.2; // Minor radius

          // Distance from center in XY plane
          const d = Math.sqrt(x * x + y * y);
          const ring = Math.abs(d - R);

          if (ring > r) return 0;

          // Height on torus
          const h = Math.sqrt(r * r - ring * ring);

          // Apply rotation for varying lighting
          const angle = Math.atan2(y, x) + rotZ;
          const nx = Math.cos(angle) * (d - R) / r;
          const nz = h / r;

          // Simple lighting
          const light = Math.max(0, nx * Math.sin(rotY) + nz * Math.cos(rotY));
          return light;
        }

        default:
          return 0;
      }
    };

    return this.renderFunction(width, height, lightnessFn);
  }

  /**
   * Update configuration
   */
  configure(config: Partial<AsciiRendererConfig>): void {
    const charsetChanged = config.charset && config.charset !== this.config.charset;

    this.config = { ...this.config, ...config };

    // Rebuild lookup if charset changed
    if (charsetChanged) {
      const chars = getCharacterShapes(this.config.charset);
      this.lookup = new CachedLookup(chars, { bitsPerComponent: 5 });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<AsciiRendererConfig> {
    return { ...this.config };
  }

  /**
   * Clear lookup cache
   */
  clearCache(): void {
    this.lookup.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxPossible: number } {
    return this.lookup.stats();
  }
}

/**
 * Create a simple ASCII renderer with defaults
 */
export function createRenderer(
  config?: AsciiRendererConfig
): AsciiRenderer {
  return new AsciiRenderer(config);
}

/**
 * Quick render function for one-off use
 */
export function renderToAscii(
  imageData: ImageData,
  config?: AsciiRendererConfig
): string {
  const renderer = new AsciiRenderer(config);
  return renderer.render(imageData).toString();
}
