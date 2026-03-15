/**
 * Text-to-Image Reference Generation - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

export type ReferenceVariant = 'hero' | 'dark' | 'abstract' | 'minimal';

const DISABLED_ERROR = new Error(
  'REPLICATE IMAGE GENERATION DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Generate reference image for glass cube - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function generateReferenceImage(_options: {
  variant?: ReferenceVariant;
  outputPath?: string;
  customPrompt?: string;
}): Promise<{ url: string; buffer: Buffer; prompt: string }> {
  throw DISABLED_ERROR;
}
