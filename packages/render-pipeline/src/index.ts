/**
 * @create-something/render-pipeline
 * SVG to photorealistic render pipeline using Replicate ControlNet
 *
 * Takes precise SVG architectural drawings and renders them
 * photorealistically while preserving geometry through ControlNet conditioning.
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

// Replicate client
export { render, renderArchitectural, isConfigured } from './replicate.js';

// ControlNet helpers
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

import { svgToMonochromePng } from './svg-to-png.js';
import { render } from './replicate.js';
import { recommendModel, buildPrompt, getConditioningScale } from './controlnet.js';
import type { RenderFromSvgOptions, RenderResult, ControlNetModel } from './types.js';

/**
 * Render photorealistic image from SVG architectural drawing
 *
 * This is the primary public API. It:
 * 1. Converts SVG to high-contrast PNG for ControlNet
 * 2. Builds a prompt from materials/lighting/angle presets
 * 3. Calls Replicate with the appropriate ControlNet model
 * 4. Returns the rendered image
 *
 * @example
 * ```typescript
 * import { renderFromSvg } from '@create-something/render-pipeline';
 *
 * const result = await renderFromSvg({
 *   svgPath: 'floor-plan.svg',
 *   prompt: 'Modern living room, cedar ceiling, golden hour light',
 *   model: 'flux-canny-pro',
 *   outputPath: 'renders/living-wide.jpg'
 * });
 * ```
 */
export async function renderFromSvg(options: RenderFromSvgOptions): Promise<RenderResult> {
  const {
    svgPath,
    svgContent,
    prompt,
    model = 'flux-canny-pro',
    crop,
    width = 1024,
    height = 1024,
    outputWidth = 1440,
    outputHeight = 1440,
    conditioningScale,
    outputPath
  } = options;

  // Validate input
  if (!svgPath && !svgContent) {
    throw new Error('Either svgPath or svgContent must be provided');
  }

  // Step 1: Convert SVG to high-contrast PNG for ControlNet
  console.log('Converting SVG to PNG...');
  const pngBuffer = await svgToMonochromePng({
    svgPath,
    svgContent,
    width,
    height,
    crop,
    background: 'white'
  });

  // Step 2: Determine conditioning scale based on input type
  const scale = conditioningScale ?? getConditioningScale('clean-lines');

  // Step 3: Render with ControlNet
  console.log(`Rendering with ${model} at ${outputWidth}x${outputHeight}...`);
  return render({
    image: pngBuffer,
    prompt,
    model,
    conditioningScale: scale,
    outputWidth,
    outputHeight,
    outputPath
  });
}

/**
 * Batch render multiple rooms from a single floor plan SVG
 *
 * @example
 * ```typescript
 * import { batchRenderRooms, THRESHOLD_DWELLING_ROOMS, MATERIAL_PRESETS, buildPrompt } from '@create-something/render-pipeline';
 *
 * const results = await batchRenderRooms({
 *   svgPath: 'floor-plan.svg',
 *   rooms: THRESHOLD_DWELLING_ROOMS,
 *   basePrompt: buildPrompt({ materials: 'threshold-dwelling', lighting: 'golden-hour' }),
 *   outputDir: 'renders'
 * });
 * ```
 */
export async function batchRenderRooms(options: {
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
  const { svgPath, rooms, basePrompt, model = 'flux-canny-pro', outputDir } = options;
  const results = new Map<string, RenderResult>();

  for (const room of rooms) {
    for (const angle of room.angles) {
      const key = `${room.name}-${angle.suffix}`;
      const prompt = angle.promptAddition
        ? `${basePrompt}, ${angle.promptAddition}`
        : basePrompt;

      const outputPath = `${outputDir}/${key}.jpg`;

      console.log(`\nRendering ${key}...`);

      try {
        const result = await renderFromSvg({
          svgPath,
          prompt,
          model,
          crop: room.crop,
          outputPath
        });

        results.set(key, result);
        console.log(`  ✓ Saved: ${outputPath} (${result.duration}ms)`);
      } catch (error) {
        console.error(`  ✗ Failed: ${key}`, error);
      }
    }
  }

  return results;
}
