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

// Flux LoRA trainer model on Replicate (Dec 2025)
const FLUX_TRAINER_MODEL = 'replicate/fast-flux-trainer';

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

  // Create training using the trainings API
  const input: Record<string, unknown> = {
    input_images: imagesInput,
    trigger_word: triggerWord,
    lora_type: loraType,
    training_steps: steps
  };

  // Use trainings API for fine-tuning
  const training = await client.trainings.create(
    'replicate',
    'fast-flux-trainer',
    'f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db',
    {
      destination: `${process.env.REPLICATE_USERNAME || 'createsomethingtoday'}/flux-canon`,
      input
    }
  );

  console.log(`  Training ID: ${training.id}`);
  console.log(`  Status: ${training.status}`);

  return {
    predictionId: training.id,
    status: training.status as TrainingResult['status']
  };
}

/**
 * Wait for training to complete
 *
 * @param trainingId - Training ID from startTraining
 * @returns Final training result
 */
export async function waitForTraining(trainingId: string): Promise<TrainingResult> {
  const client = getClient();
  const startTime = Date.now();

  console.log(`Waiting for training ${trainingId} to complete...`);

  // Poll for training completion
  let completed = await client.trainings.get(trainingId);
  while (completed.status === 'starting' || completed.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
    completed = await client.trainings.get(trainingId);
    console.log(`  Status: ${completed.status}...`);
  }

  const durationSeconds = (Date.now() - startTime) / 1000;

  console.log(`  Training completed in ${durationSeconds.toFixed(1)}s`);
  console.log(`  Status: ${completed.status}`);

  if (completed.status === 'failed') {
    return {
      predictionId: trainingId,
      status: 'failed',
      error: completed.error as string,
      durationSeconds
    };
  }

  // Extract model URL from output - training output contains the model version
  const output = completed.output as Record<string, unknown> | string;
  let modelUrl: string | undefined;
  let versionId: string | undefined;

  if (typeof output === 'string') {
    modelUrl = output;
    // Extract version from URL like "createsomething/flux-canon:abc123"
    const match = output.match(/:([a-f0-9]+)$/);
    if (match) versionId = match[1];
  } else if (output && typeof output === 'object') {
    modelUrl = (output.weights || output.url || output.output || output.version) as string;
    versionId = output.version as string;
  }

  // Estimate cost
  const costEstimate = durationSeconds * H100_COST_PER_SECOND;

  console.log(`  Model: ${modelUrl}`);
  console.log(`  Estimated cost: $${costEstimate.toFixed(2)}`);

  return {
    predictionId: trainingId,
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
export async function checkTrainingStatus(trainingId: string): Promise<TrainingResult> {
  const client = getClient();
  const training = await client.trainings.get(trainingId);

  return {
    predictionId: trainingId,
    status: training.status as TrainingResult['status'],
    error: training.error as string | undefined
  };
}
