/**
 * Inpainting using Replicate - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

import { isConfigured } from '../utils/replicate.js';

// Re-export isConfigured for external consumers
export { isConfigured };

export type InpaintModel = 'flux' | 'sdxl' | 'lama';

export interface InpaintOptions {
  model?: InpaintModel;
  outputPath?: string;
  prompt?: string;
}

export interface InpaintResult {
  image: Buffer;
  model: InpaintModel;
  outputPath?: string;
  duration: number;
}

const DISABLED_ERROR = new Error(
  'REPLICATE INPAINTING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Inpaint masked regions of an image - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function inpaint(
  _imagePath: string,
  _mask: Buffer,
  _options: InpaintOptions = {}
): Promise<InpaintResult> {
  throw DISABLED_ERROR;
}
