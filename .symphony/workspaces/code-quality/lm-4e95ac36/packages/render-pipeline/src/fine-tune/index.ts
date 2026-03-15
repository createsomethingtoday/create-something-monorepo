/**
 * Fine-Tune Module - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * All functions will throw errors.
 *
 * Disabled: 2026-01-25
 */

// Types only - functions are disabled
export type {
  LoraType,
  TrainingConfig,
  TrainingResult,
  FineTunedModel,
  FineTuneGenerateOptions,
  FineTuneGenerateResult,
  TrainingImage,
  TrainingManifest
} from './types.js';

// Training (all throw errors)
export {
  startTraining,
  checkTrainingStatus,
  cancelTraining
} from './train.js';

// Generation (all throw errors)
export {
  generateWithFineTune
} from './generate.js';
