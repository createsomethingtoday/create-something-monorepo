/**
 * Render Pipeline Types
 * @module @create-something/render-pipeline
 */

/**
 * Supported ControlNet models on Replicate
 */
export type ControlNetModel =
  | 'flux-canny-pro'      // Edge detection - floor plans, elevations
  | 'flux-depth-pro'      // Depth maps - sections, perspectives
  | 'controlnet-scribble' // Line drawings - sketches
  | 'interior-design';    // Interior renders with LoRA

/**
 * Options for SVG to PNG conversion
 */
export interface SvgToPngOptions {
  /** SVG file path */
  svgPath?: string;
  /** Raw SVG content */
  svgContent?: string;
  /** Output width in pixels (default: 1024) */
  width?: number;
  /** Output height in pixels (default: 1024) */
  height?: number;
  /** Crop region: [x, y, width, height] in SVG units */
  crop?: [number, number, number, number];
  /** Background color (default: 'white') */
  background?: string;
  /** Output path for PNG file */
  outputPath?: string;
}

/**
 * Options for Replicate ControlNet rendering
 */
export interface RenderOptions {
  /** Input image (PNG buffer or URL) */
  image: Buffer | string;
  /** Text prompt describing materials, lighting, mood */
  prompt: string;
  /** ControlNet model to use */
  model?: ControlNetModel;
  /** Conditioning scale (0-2, default: 1.0) */
  conditioningScale?: number;
  /** Number of inference steps (default: 28) */
  steps?: number;
  /** Guidance scale (default: 3.5) */
  guidance?: number;
  /** Output width in pixels (default: 1024) */
  outputWidth?: number;
  /** Output height in pixels (default: 1024) */
  outputHeight?: number;
  /** Output path for rendered image */
  outputPath?: string;
}

/**
 * Combined options for SVG-to-render pipeline
 */
export interface RenderFromSvgOptions {
  /** SVG file path */
  svgPath?: string;
  /** Raw SVG content */
  svgContent?: string;
  /** Text prompt describing materials, lighting, mood */
  prompt: string;
  /** ControlNet model to use (default: 'flux-canny-pro') */
  model?: ControlNetModel;
  /** Crop region: [x, y, width, height] in SVG units */
  crop?: [number, number, number, number];
  /** PNG export width (default: 1024) */
  width?: number;
  /** PNG export height (default: 1024) */
  height?: number;
  /** Render output width (default: 1024) */
  outputWidth?: number;
  /** Render output height (default: 1024) */
  outputHeight?: number;
  /** Conditioning scale (default: 1.0) */
  conditioningScale?: number;
  /** Output path for rendered image */
  outputPath?: string;
}

/**
 * Result from render operation
 */
export interface RenderResult {
  /** Rendered image as buffer */
  image: Buffer;
  /** Output path if saved to disk */
  outputPath?: string;
  /** Model used for rendering */
  model: ControlNetModel;
  /** Prediction ID from Replicate */
  predictionId: string;
  /** Time taken in milliseconds */
  duration: number;
}

/**
 * Architectural material presets for prompts
 */
export interface MaterialPreset {
  name: string;
  prompt: string;
}

/**
 * Room configuration for batch rendering
 */
export interface RoomConfig {
  /** Room identifier */
  name: string;
  /** Crop region in floor plan SVG units */
  crop: [number, number, number, number];
  /** Camera angles to render */
  angles: Array<{
    suffix: string;
    promptAddition?: string;
  }>;
}
