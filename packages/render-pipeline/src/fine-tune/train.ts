/**
 * Fine-Tune Training Module - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

import type { TrainingConfig, TrainingResult } from './types.js';

const DISABLED_ERROR = new Error(
  'REPLICATE FINE-TUNING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Start fine-tuning a Flux model - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function startTraining(_options: TrainingConfig): Promise<TrainingResult> {
  throw DISABLED_ERROR;
}

/**
 * Check training status - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function checkTrainingStatus(_trainingId: string): Promise<TrainingResult> {
  throw DISABLED_ERROR;
}

/**
 * Cancel training - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function cancelTraining(_trainingId: string): Promise<void> {
  throw DISABLED_ERROR;
}
