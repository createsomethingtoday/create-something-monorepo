/**
 * AI Upscaling Module
 * Restores quality after inpainting using Real-ESRGAN
 *
 * The tool recedes: upscaling happens automatically, quality returns.
 */

import Replicate from 'replicate';
import sharp from 'sharp';
import * as fs from 'fs/promises';

// Real-ESRGAN with face enhancement
const UPSCALE_MODEL = 'nightmareai/real-esrgan';

// Max input size for ESRGAN (~2M pixels = ~1400x1400)
const MAX_UPSCALE_INPUT = 1400;

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
 * Upscaling options
 */
export interface UpscaleOptions {
  /** Scale factor (default: 2) */
  scale?: 2 | 4;
  /** Enable face enhancement (default: true for photos) */
  faceEnhance?: boolean;
  /** Output path (default: replaces input with -upscaled suffix) */
  outputPath?: string;
}

/**
 * Resize image if needed to fit within ESRGAN limits
 */
async function resizeForUpscale(buffer: Buffer, maxDim: number): Promise<{ buffer: Buffer; scale: number }> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  const maxSize = Math.max(width, height);

  if (maxSize <= maxDim) {
    return { buffer, scale: 1 };
  }

  const scale = maxDim / maxSize;
  const resized = await sharp(buffer)
    .resize(Math.round(width * scale), Math.round(height * scale), { fit: 'inside' })
    .png()
    .toBuffer();

  return { buffer: resized, scale };
}

/**
 * Upscale an image using Real-ESRGAN
 *
 * For large images, this:
 * 1. Resizes input to fit ESRGAN limits
 * 2. Upscales with AI (2x)
 * 3. Resizes result to original dimensions
 *
 * @param imagePath - Path to the image to upscale
 * @param options - Upscaling options
 * @returns Path to upscaled image
 */
export async function upscale(
  imagePath: string,
  options: UpscaleOptions = {}
): Promise<string> {
  const {
    scale = 2,
    faceEnhance = true,
    outputPath
  } = options;

  const client = getClient();

  // Read image
  const imageBuffer = await fs.readFile(imagePath);
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 1024;
  const originalHeight = metadata.height || 1024;

  // Resize for ESRGAN if needed
  const { buffer: resizedBuffer, scale: resizeScale } = await resizeForUpscale(imageBuffer, MAX_UPSCALE_INPUT);
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const inputWidth = resizedMeta.width || 1024;
  const inputHeight = resizedMeta.height || 1024;

  if (resizeScale < 1) {
    console.log(`  Resizing ${originalWidth}x${originalHeight} → ${inputWidth}x${inputHeight} for ESRGAN...`);
  }
  console.log(`  Upscaling with Real-ESRGAN (${scale}x, face_enhance=${faceEnhance})...`);

  // Convert to data URI
  const imageUri = bufferToDataUri(resizedBuffer, 'image/png');

  // Run Real-ESRGAN
  const output = await client.run(UPSCALE_MODEL, {
    input: {
      image: imageUri,
      scale,
      face_enhance: faceEnhance
    }
  });

  // Download result
  const resultUrl = output as unknown as string;
  const response = await fetch(resultUrl);
  if (!response.ok) {
    throw new Error(`Failed to download upscaled image: ${response.statusText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  const resultMeta = await sharp(resultBuffer).metadata();
  const esrganWidth = resultMeta.width || inputWidth * scale;
  const esrganHeight = resultMeta.height || inputHeight * scale;

  console.log(`  ESRGAN output: ${esrganWidth}x${esrganHeight}`);

  // Determine output path
  const outPath = outputPath || imagePath.replace(/(-cleaned)?(\.[^.]+)$/, '-upscaled$2');

  // If we resized down, resize ESRGAN output back up to original
  if (resizeScale < 1) {
    console.log(`  Resizing to original: ${originalWidth}x${originalHeight}...`);
    await sharp(resultBuffer)
      .resize(originalWidth, originalHeight, { fit: 'fill' })
      .png()
      .toFile(outPath);
  } else {
    // Save as-is
    await sharp(resultBuffer)
      .png()
      .toFile(outPath);
  }

  console.log(`  Saved: ${outPath}`);

  return outPath;
}

/**
 * Upscale multiple images
 */
export async function upscaleBatch(
  imagePaths: string[],
  options: UpscaleOptions = {}
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    console.log(`[${i + 1}/${imagePaths.length}] Upscaling ${imagePath.split('/').pop()}`);

    try {
      const upscaled = await upscale(imagePath, options);
      results.push(upscaled);
    } catch (error) {
      console.error(`  Failed: ${error}`);
    }
  }

  return results;
}

/**
 * Check if upscaling is configured
 */
export function isUpscaleConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
