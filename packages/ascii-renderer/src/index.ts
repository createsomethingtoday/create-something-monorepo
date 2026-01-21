/**
 * @create-something/ascii-renderer
 *
 * Shape-aware ASCII renderer with 6D character matching
 * and contrast enhancement for high-quality ASCII art.
 *
 * Based on Alex Harri's technique:
 * https://alexharri.com/blog/ascii-rendering
 *
 * @example
 * ```typescript
 * import { AsciiRenderer } from '@create-something/ascii-renderer';
 *
 * const renderer = new AsciiRenderer({
 *   globalContrast: 2.5,
 *   directionalContrast: 3.0
 * });
 *
 * // Render from canvas
 * const result = renderer.renderCanvas(myCanvas);
 * console.log(result.toString());
 *
 * // Render built-in 3D scenes
 * const donut = renderer.renderScene3D(120, 60, 'donut', { x: 0.3, y: time * 0.02, z: 0 });
 * console.log(donut.toString());
 * ```
 *
 * @packageDocumentation
 */

// Main renderer class
export { AsciiRenderer, createRenderer, renderToAscii } from './renderer.js';

// Types
export type {
  AsciiRendererConfig,
  AsciiRenderResult,
  ImageSource,
  ShapeVector,
  ExternalVector,
  CharacterShape,
  SamplingCircle,
  KdNode,
  CacheOptions,
} from './types.js';

// Shape vector utilities
export {
  ASCII_95,
  EXTENDED_CHARS,
  SAMPLING_CIRCLES,
  EXTERNAL_SAMPLING_CIRCLES,
  EXTERNAL_AFFECTING_INDICES,
  PRECOMPUTED_ASCII95_VECTORS,
  getCharacterShapes,
  normalizeShapeVectors,
  distanceSquared,
} from './shape-vectors.js';

// Sampling utilities
export {
  sampleCellShapeVector,
  sampleExternalVector,
  sampleImageGrid,
  sampleExternalGrid,
  imageDataSource,
  bufferSource,
  functionSource,
} from './sampling.js';

// Lookup utilities
export {
  buildKdTree,
  findNearest,
  CachedLookup,
  bruteForceFind,
} from './lookup.js';

// Contrast enhancement
export {
  applyGlobalContrast,
  applyDirectionalContrast,
  applyContrast,
  applyContrastGrid,
  applyAdaptiveContrast,
} from './contrast.js';
