/**
 * Replicate API Client
 * Handles ControlNet model inference for architectural rendering
 */

import Replicate from 'replicate';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ControlNetModel, RenderOptions, RenderResult } from './types.js';

// Model version IDs on Replicate
const MODEL_VERSIONS: Record<ControlNetModel, string> = {
  'flux-canny-pro': 'black-forest-labs/flux-canny-pro',
  'flux-depth-pro': 'black-forest-labs/flux-depth-pro',
  'controlnet-scribble': 'jagilley/controlnet-scribble',
  'interior-design': 'adirik/interior-design'
};

// Default parameters per model
const MODEL_DEFAULTS: Record<ControlNetModel, Partial<RenderOptions>> = {
  'flux-canny-pro': {
    steps: 28,
    guidance: 3.5,
    conditioningScale: 1.0
  },
  'flux-depth-pro': {
    steps: 28,
    guidance: 3.5,
    conditioningScale: 1.0
  },
  'controlnet-scribble': {
    steps: 20,
    guidance: 7.5,
    conditioningScale: 1.0
  },
  'interior-design': {
    steps: 30,
    guidance: 7.0,
    conditioningScale: 0.8
  }
};

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
 * Convert image buffer to data URI for Replicate API
 */
function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Render image using ControlNet model on Replicate
 */
export async function render(options: RenderOptions): Promise<RenderResult> {
  const startTime = Date.now();
  const model = options.model || 'flux-canny-pro';
  const defaults = MODEL_DEFAULTS[model];
  const modelId = MODEL_VERSIONS[model];

  const {
    image,
    prompt,
    conditioningScale = defaults.conditioningScale,
    steps = defaults.steps,
    guidance = defaults.guidance,
    outputWidth = 1024,
    outputHeight = 1024,
    outputPath
  } = options;

  // Prepare image input
  let imageInput: string;
  if (Buffer.isBuffer(image)) {
    imageInput = bufferToDataUri(image);
  } else {
    imageInput = image; // Assume it's already a URL or data URI
  }

  const client = getClient();

  // Build input based on model type
  let input: Record<string, unknown>;

  if (model === 'flux-canny-pro' || model === 'flux-depth-pro') {
    // Flux Pro models
    input = {
      control_image: imageInput,
      prompt,
      num_inference_steps: steps,
      guidance_scale: guidance,
      controlnet_conditioning_scale: conditioningScale,
      width: outputWidth,
      height: outputHeight,
      output_format: 'png',
      output_quality: 100
    };
  } else if (model === 'controlnet-scribble') {
    // Standard ControlNet
    input = {
      image: imageInput,
      prompt,
      num_inference_steps: steps,
      guidance_scale: guidance,
      controlnet_conditioning_scale: conditioningScale
    };
  } else if (model === 'interior-design') {
    // Interior design model
    input = {
      image: imageInput,
      prompt,
      num_inference_steps: steps,
      guidance_scale: guidance,
      prompt_strength: conditioningScale
    };
  } else {
    throw new Error(`Unknown model: ${model}`);
  }

  // Run prediction
  console.log(`Running ${model} on Replicate...`);
  console.log(`Model ID: ${modelId}`);
  console.log(`Input keys: ${Object.keys(input).join(', ')}`);

  // Use predictions API for more control
  const prediction = await client.predictions.create({
    model: modelId,
    input
  });

  console.log(`Prediction created: ${prediction.id}`);

  // Wait for completion
  const completedPrediction = await client.wait(prediction);
  console.log(`Prediction status: ${completedPrediction.status}`);

  if (completedPrediction.status === 'failed') {
    console.error('Prediction error:', completedPrediction.error);
    throw new Error(`Prediction failed: ${completedPrediction.error}`);
  }

  const output = completedPrediction.output;

  // Handle output (can be string URL, array, or object with url property)
  let outputUrl: string;
  if (Array.isArray(output)) {
    outputUrl = output[0] as string;
  } else if (typeof output === 'string') {
    outputUrl = output;
  } else if (typeof output === 'object' && output !== null) {
    // Flux Pro models return an object with url property
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      outputUrl = obj.url;
    } else if (typeof obj.output === 'string') {
      outputUrl = obj.output;
    } else {
      console.log('Output object:', JSON.stringify(output, null, 2));
      throw new Error(`Unexpected output object format: ${Object.keys(obj).join(', ')}`);
    }
  } else {
    throw new Error(`Unexpected output format: ${typeof output}`);
  }

  // Fetch the rendered image
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch rendered image: ${response.status}`);
  }
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  // Save to file if outputPath provided
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`Saved: ${outputPath}`);
  }

  const duration = Date.now() - startTime;

  return {
    image: imageBuffer,
    outputPath,
    model,
    predictionId: 'unknown', // Could extract from run metadata if needed
    duration
  };
}

/**
 * Render with architectural material presets
 */
export async function renderArchitectural(
  image: Buffer | string,
  basePrompt: string,
  options?: Partial<RenderOptions>
): Promise<RenderResult> {
  // Enhance prompt with architectural quality descriptors
  const enhancedPrompt = `${basePrompt}, architectural photography, photorealistic,
    professional interior design, high-end finishes, natural lighting,
    sharp focus, 8K quality, editorial photography style`;

  return render({
    image,
    prompt: enhancedPrompt,
    model: 'flux-canny-pro',
    ...options
  });
}

/**
 * Check if Replicate API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
