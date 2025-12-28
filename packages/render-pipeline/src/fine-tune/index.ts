/**
 * Fine-Tune Module
 * Flux LoRA training and inference for CREATE SOMETHING Canon style
 *
 * @example Training
 * ```typescript
 * import { train, createManifest } from '@create-something/render-pipeline/fine-tune';
 *
 * const result = await train({
 *   inputImages: './training-images.zip',
 *   triggerWord: 'CSMTH',
 *   loraType: 'style',
 *   steps: 1000
 * });
 * ```
 *
 * @example Generation
 * ```typescript
 * import { generate, registerModel, buildCanonPrompt } from '@create-something/render-pipeline/fine-tune';
 *
 * // Register the trained model
 * registerModel('flux-canon', {
 *   id: 'your-username/flux-canon-style:version',
 *   name: 'CREATE SOMETHING Canon Style',
 *   triggerWord: 'CSMTH'
 * });
 *
 * // Generate with Canon prompt
 * const prompt = buildCanonPrompt('the hermeneutic circle');
 * const result = await generate('flux-canon', { prompt, outputPath: './output.png' });
 * ```
 */

// Types
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

// Training
export {
  startTraining,
  waitForTraining,
  train,
  createManifest,
  saveManifest,
  loadManifest,
  checkTrainingStatus
} from './train.js';

// Generation
export {
  registerModel,
  getModel,
  listModels,
  generate,
  generateWithModel,
  generateDirect,
  buildCanonPrompt,
  generateBatch,
  generateTestSet,
  TEST_SUBJECTS
} from './generate.js';
