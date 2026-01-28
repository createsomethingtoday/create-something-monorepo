/**
 * Fine-Tuned Model Generation - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

import type { FineTuneGenerateOptions, FineTuneGenerateResult } from './types.js';

const DISABLED_ERROR = new Error(
  'REPLICATE GENERATION DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Generate image with fine-tuned model - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function generateWithFineTune(
  _options: FineTuneGenerateOptions
): Promise<FineTuneGenerateResult> {
  throw DISABLED_ERROR;
}
