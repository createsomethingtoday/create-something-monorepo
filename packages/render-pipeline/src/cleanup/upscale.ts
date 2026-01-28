/**
 * AI Upscaling Module - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

export interface UpscaleOptions {
  scale?: 2 | 4;
  faceEnhance?: boolean;
  outputPath?: string;
}

const DISABLED_ERROR = new Error(
  'REPLICATE UPSCALING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Upscale an image using Real-ESRGAN - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function upscale(
  _imagePath: string,
  _options: UpscaleOptions = {}
): Promise<string> {
  throw DISABLED_ERROR;
}

/**
 * Check if upscaling is configured - ALWAYS returns false
 */
export function isUpscaleConfigured(): boolean {
  return false;
}
