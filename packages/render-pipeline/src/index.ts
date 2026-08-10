/**
 * @create-something/render-pipeline
 * SVG rendering pipeline
 *
 * NOTE: Replicate integration has been DISABLED due to runaway costs ($700+).
 * The render functions will throw errors if called.
 *
 * Available functionality:
 * - SVG to PNG conversion (svgToPng, svgToMonochromePng)
 * - Floor plan SVG generation
 * - Section SVG generation
 * - Perspective rendering (Three.js → SVG)
 *
 * DISABLED functionality (throws errors):
 * - renderFromSvg, batchRenderRooms
 * - All Replicate-based rendering
 */

// Types
export type {
  ControlNetModel,
  SvgToPngOptions,
  RenderOptions,
  RenderFromSvgOptions,
  RenderResult,
  MaterialPreset,
  RoomConfig
} from './types.js';

// SVG to PNG utilities (Node.js native binding)
export {
  svgToPng,
  svgToMonochromePng,
  extractRoom,
  extractRooms,
  compositeImages,
  type CompositeLayout
} from './svg-to-png.js';

// SVG to PNG utilities (WASM - for edge/browser)
export {
  svgToPngWasm,
  initResvgWasm,
  createCanonSvg,
  isWasmInitialized,
  type CanonRenderOptions
} from './svg-to-png-wasm.js';

// ControlNet helpers (presets still useful for prompts)
export {
  MATERIAL_PRESETS,
  LIGHTING_PRESETS,
  ANGLE_PRESETS,
  THRESHOLD_DWELLING_ROOMS,
  recommendModel,
  buildPrompt,
  getConditioningScale
} from './controlnet.js';

// Floor plan SVG generator
export {
  generateFloorPlanSvg,
  type FloorPlanData,
  type FloorPlanRenderOptions,
  type Zone,
  type Wall,
  type Room,
  type Column,
  type Door,
  type Window,
  type Overhang
} from './floor-plan-svg.js';

// Section SVG generator
export {
  generateSectionSvg,
  generateRoomSectionSvg,
  type SectionData,
  type SectionCut,
  type HeightZone,
  type SectionOpening,
  type SectionRenderOptions
} from './section-svg.js';

// Perspective renderer (Three.js → SVG)
export {
  initPerspectiveRenderer,
  createSceneFromPlan,
  createRoomScene,
  ROOM_BOUNDS,
  renderToSvg,
  generatePerspectiveConditioning,
  THRESHOLD_DWELLING_CAMERAS,
  type CameraPreset,
  type RoomView,
  type RoomBounds,
  type PerspectiveRenderOptions,
  type HeightConfig
} from './perspective-renderer.js';

import type { RenderFromSvgOptions, RenderResult, ControlNetModel } from './types.js';

/**
 * isConfigured - ALWAYS returns false (Replicate disabled)
 */
export function isConfigured(): boolean {
  return false;
}

/**
 * Render photorealistic image from SVG - DISABLED
 *
 * @throws Error always - Replicate integration is disabled
 */
export async function renderFromSvg(_options: RenderFromSvgOptions): Promise<RenderResult> {
  throw new Error(
    'REPLICATE RENDERING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+ from google/nano-banana-pro). ' +
    'Use SVG-to-PNG utilities for local rendering. ' +
    'Contact engineering before re-enabling Replicate integration.'
  );
}

/**
 * Batch render multiple rooms - DISABLED
 *
 * @throws Error always - Replicate integration is disabled
 */
export async function batchRenderRooms(_options: {
  svgPath: string;
  rooms: Array<{
    name: string;
    crop: [number, number, number, number];
    angles: Array<{ suffix: string; promptAddition?: string }>;
  }>;
  basePrompt: string;
  model?: ControlNetModel;
  outputDir: string;
}): Promise<Map<string, RenderResult>> {
  throw new Error(
    'REPLICATE RENDERING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+ from google/nano-banana-pro). ' +
    'Contact engineering before re-enabling Replicate integration.'
  );
}
