/**
 * Fine-Tune Training Module
 * Handles Flux LoRA training via Replicate API
 */

import Replicate from 'replicate';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  TrainingConfig,
  TrainingResult,
  TrainingManifest,
  TrainingImage
} from './types.js';

// Flux LoRA trainer model on Replicate
const FLUX_TRAINER_MODEL = 'ostris/flux-dev-lora-trainer';

// H100 cost per second (as of Dec 2025)
const H100_COST_PER_SECOND = 0.0122;

let replicateClient: Replicate | null = null;

/**
 * Get or create Replicate client
 */
function getClient(): Replicate {
  if (!replicateClient) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error(
        'REPLICATE_API_TOKEN environment variable not set. ' +
          'Get your token at https://replicate.com/account/api-tokens'
      );
    }
    replicateClient = new Replicate({ auth: token });
  }
  return replicateClient;
}

/**
 * Convert buffer to data URI for Replicate API
 */
function bufferToDataUri(buffer: Buffer, mimeType = 'application/zip'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Start a fine-tuning training job
 *
 * @param config - Training configuration
 * @returns Training result with prediction ID
 */
export async function startTraining(config: TrainingConfig): Promise<TrainingResult> {
  const { inputImages, triggerWord, loraType, steps = 1000, caption } = config;

  const client = getClient();

  // Prepare input images
  let imagesInput: string;
  if (Buffer.isBuffer(inputImages)) {
    imagesInput = bufferToDataUri(inputImages);
  } else if (inputImages.startsWith('data:')) {
    imagesInput = inputImages;
  } else {
    // Assume it's a file path - read and convert
    const buffer = await fs.readFile(inputImages);
    imagesInput = bufferToDataUri(buffer);
  }

  console.log(`Starting Flux LoRA training...`);
  console.log(`  Trigger word: ${triggerWord}`);
  console.log(`  LoRA type: ${loraType}`);
  console.log(`  Steps: ${steps}`);

  // Create training
  const input: Record<string, unknown> = {
    input_images: imagesInput,
    trigger_word: triggerWord,
    steps,
    lora_rank: 16, // Standard rank for good quality/size balance
    optimizer: 'adamw8bit',
    batch_size: 1,
    resolution: '512,768,1024', // Multi-resolution training
    autocaption: !caption, // Auto-caption if no manual caption provided
    autocaption_prefix: caption || `a photo in the style of ${triggerWord},`
  };

  const prediction = await client.predictions.create({
    model: FLUX_TRAINER_MODEL,
    input
  });

  console.log(`  Prediction ID: ${prediction.id}`);
  console.log(`  Status: ${prediction.status}`);

  return {
    predictionId: prediction.id,
    status: prediction.status as TrainingResult['status']
  };
}

/**
 * Wait for training to complete
 *
 * @param predictionId - Prediction ID from startTraining
 * @returns Final training result
 */
export async function waitForTraining(predictionId: string): Promise<TrainingResult> {
  const client = getClient();
  const startTime = Date.now();

  console.log(`Waiting for training ${predictionId} to complete...`);

  // First fetch the prediction, then wait for it
  const prediction = await client.predictions.get(predictionId);
  const completed = await client.wait(prediction);
  const durationSeconds = (Date.now() - startTime) / 1000;

  console.log(`  Training completed in ${durationSeconds.toFixed(1)}s`);
  console.log(`  Status: ${completed.status}`);

  if (completed.status === 'failed') {
    return {
      predictionId,
      status: 'failed',
      error: completed.error as string,
      durationSeconds
    };
  }

  // Extract model URL from output
  const output = completed.output as Record<string, unknown> | string;
  let modelUrl: string | undefined;
  let versionId: string | undefined;

  if (typeof output === 'string') {
    modelUrl = output;
  } else if (output && typeof output === 'object') {
    modelUrl = (output.weights || output.url || output.output) as string;
    versionId = output.version as string;
  }

  // Estimate cost
  const costEstimate = durationSeconds * H100_COST_PER_SECOND;

  console.log(`  Model URL: ${modelUrl}`);
  console.log(`  Estimated cost: $${costEstimate.toFixed(2)}`);

  return {
    predictionId,
    status: 'succeeded',
    modelUrl,
    versionId,
    durationSeconds,
    costEstimate
  };
}

/**
 * Run complete training workflow
 *
 * @param config - Training configuration
 * @returns Final training result
 */
export async function train(config: TrainingConfig): Promise<TrainingResult> {
  const startResult = await startTraining(config);

  if (startResult.status === 'failed') {
    return startResult;
  }

  return waitForTraining(startResult.predictionId);
}

/**
 * Create a training manifest from selected images
 *
 * @param images - Array of training images
 * @param triggerWord - Trigger word for training
 * @param r2Bucket - R2 bucket name for caching
 * @returns Training manifest
 */
export function createManifest(
  images: TrainingImage[],
  triggerWord: string,
  r2Bucket: string
): TrainingManifest {
  const now = new Date().toISOString();
  const id = `training-${triggerWord.toLowerCase()}-${Date.now()}`;

  return {
    id,
    createdAt: now,
    triggerWord,
    images,
    totalImages: images.length,
    selectedImages: images.filter((img) => img.selected).length,
    r2Bucket
  };
}

/**
 * Save manifest to file
 */
export async function saveManifest(manifest: TrainingManifest, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Saved manifest: ${outputPath}`);
}

/**
 * Load manifest from file
 */
export async function loadManifest(manifestPath: string): Promise<TrainingManifest> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as TrainingManifest;
}

/**
 * Check training status
 */
export async function checkTrainingStatus(predictionId: string): Promise<TrainingResult> {
  const client = getClient();
  const prediction = await client.predictions.get(predictionId);

  return {
    predictionId,
    status: prediction.status as TrainingResult['status'],
    error: prediction.error as string | undefined
  };
}
