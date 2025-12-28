/**
 * Inpainting using Replicate
 * Removes masked regions and fills them with contextually appropriate content
 */

import Replicate from 'replicate';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Supported inpainting models
 */
export type InpaintModel = 'flux' | 'sdxl' | 'lama';

/**
 * Model configurations - verified Replicate model IDs (Dec 2025)
 */
const MODELS: Record<InpaintModel, { id: string; name: string }> = {
  flux: {
    id: 'black-forest-labs/flux-fill-pro',
    name: 'Flux Fill Pro (State of the Art)'
  },
  sdxl: {
    id: 'lucataco/sdxl-inpainting',
    name: 'SDXL Inpainting (High Quality)'
  },
  lama: {
    id: 'allenhooo/lama',
    name: 'LaMa (Fast)'
  }
};

// Max dimension for Replicate API (to avoid payload too large errors)
const MAX_DIMENSION = 2048;

/**
 * Options for inpainting
 */
export interface InpaintOptions {
  /** Model to use (default: 'flux') */
  model?: InpaintModel;
  /** Save output to this path */
  outputPath?: string;
  /** Prompt for guided models (Flux/SDXL) */
  prompt?: string;
}

/**
 * Inpainting result
 */
export interface InpaintResult {
  /** Inpainted image buffer */
  image: Buffer;
  /** Model used */
  model: InpaintModel;
  /** Output path if saved */
  outputPath?: string;
  /** Time taken in milliseconds */
  duration: number;
}

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
 * Convert buffer to data URI
 */
function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Resize image if needed to fit within max dimensions
 * Returns resized buffer and scale factor for later upscaling
 */
async function resizeIfNeeded(
  buffer: Buffer,
  maxDim: number
): Promise<{ buffer: Buffer; scale: number; originalWidth: number; originalHeight: number }> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  const maxSize = Math.max(width, height);

  if (maxSize <= maxDim) {
    return { buffer, scale: 1, originalWidth: width, originalHeight: height };
  }

  const scale = maxDim / maxSize;
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  console.log(`  Resizing ${width}x${height} -> ${newWidth}x${newHeight} for processing...`);

  const resized = await sharp(buffer)
    .resize(newWidth, newHeight, { fit: 'inside' })
    .png()
    .toBuffer();

  return {
    buffer: resized,
    scale: 1 / scale, // Scale factor to restore original size
    originalWidth: width,
    originalHeight: height
  };
}

/**
 * Inpaint masked regions of an image
 *
 * @param imagePath - Path to original image
 * @param mask - Mask buffer (white = inpaint, black = preserve)
 * @param options - Inpainting options
 */
export async function inpaint(
  imagePath: string,
  mask: Buffer,
  options: InpaintOptions = {}
): Promise<InpaintResult> {
  const startTime = Date.now();
  const { model = 'flux', outputPath, prompt } = options;
  const modelConfig = MODELS[model];

  const client = getClient();

  // Read and resize original image if needed
  const imageBuffer = await fs.readFile(imagePath);
  const { buffer: resizedImage, scale, originalWidth, originalHeight } = await resizeIfNeeded(imageBuffer, MAX_DIMENSION);

  // Resize mask to match
  const resizedMask = scale !== 1
    ? await sharp(mask)
        .resize(Math.round(originalWidth / scale), Math.round(originalHeight / scale), { fit: 'fill' })
        .png()
        .toBuffer()
    : mask;

  const imageUri = bufferToDataUri(resizedImage, 'image/png');
  const maskUri = bufferToDataUri(resizedMask, 'image/png');

  console.log(`  Inpainting with ${modelConfig.name}...`);

  let input: Record<string, unknown>;

  if (model === 'lama') {
    // LaMa model - simple, fast, no prompt needed
    input = {
      image: imageUri,
      mask: maskUri
    };
  } else if (model === 'flux') {
    // Flux Fill Pro - state of the art inpainting
    input = {
      image: imageUri,
      mask: maskUri,
      prompt: prompt || 'seamless natural background matching surrounding texture, lighting, and colors',
      steps: 50,
      guidance: 60,
      output_format: 'png'
    };
  } else {
    // SDXL Inpainting
    input = {
      image: imageUri,
      mask: maskUri,
      prompt: prompt || 'seamless background, matching texture and lighting, photorealistic',
      negative_prompt: 'artifacts, distortion, blur, noise, watermark',
      steps: 30,
      guidance_scale: 8
    };
  }

  // Run prediction
  const prediction = await client.predictions.create({
    model: modelConfig.id,
    input
  });

  // Wait for completion
  const completed = await client.wait(prediction);

  if (completed.status === 'failed') {
    throw new Error(`Inpainting failed: ${completed.error}`);
  }

  // Extract output URL
  let outputUrl: string;
  const output = completed.output;

  if (Array.isArray(output)) {
    outputUrl = output[0] as string;
  } else if (typeof output === 'string') {
    outputUrl = output;
  } else if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>;
    outputUrl = (obj.url || obj.output) as string;
  } else {
    throw new Error(`Unexpected output format: ${typeof output}`);
  }

  // Fetch result
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch result: ${response.status}`);
  }

  let resultBuffer: Buffer = Buffer.from(await response.arrayBuffer());

  // Upscale back to original size if we downscaled
  if (scale > 1) {
    console.log(`  Upscaling result back to ${originalWidth}x${originalHeight}...`);
    resultBuffer = await sharp(resultBuffer)
      .resize(originalWidth, originalHeight, { fit: 'fill' })
      .png()
      .toBuffer();
  }

  // Save if requested
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, resultBuffer);
    console.log(`  Saved: ${outputPath}`);
  }

  const duration = Date.now() - startTime;

  return {
    image: resultBuffer,
    model,
    outputPath,
    duration
  };
}

/**
 * Check if Replicate is configured
 */
export function isConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
