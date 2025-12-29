/**
 * Screenshot Cropping
 * Extract and zoom UI elements from screenshots using Sharp
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { UIElement, GeneratedImage } from './types.js';

/**
 * Padding to add around cropped elements (as fraction of element size)
 */
const CROP_PADDING = 0.15;

/**
 * Minimum crop size in pixels
 */
const MIN_CROP_SIZE = 100;

/**
 * Options for cropping
 */
export interface CropOptions {
  /** Output directory for cropped images */
  outputDir: string;
  /** Padding around element (0-1, default: 0.15) */
  padding?: number;
  /** Minimum output width (default: 100) */
  minWidth?: number;
  /** Maximum output width (upscale small crops) */
  maxWidth?: number;
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * Crop a single element from a screenshot
 */
export async function cropElement(
  imagePath: string,
  element: UIElement,
  options: CropOptions
): Promise<GeneratedImage | null> {
  const { outputDir, padding = CROP_PADDING, minWidth = MIN_CROP_SIZE, maxWidth } = options;

  const { width: imgWidth, height: imgHeight } = await getImageDimensions(imagePath);
  if (imgWidth === 0 || imgHeight === 0) return null;

  // Convert normalized coordinates to pixels
  const elementX = Math.round(element.x * imgWidth);
  const elementY = Math.round(element.y * imgHeight);
  const elementW = Math.round(element.width * imgWidth);
  const elementH = Math.round(element.height * imgHeight);

  // Add padding
  const padX = Math.round(elementW * padding);
  const padY = Math.round(elementH * padding);

  // Calculate crop region with padding, clamped to image bounds
  const left = Math.max(0, elementX - padX);
  const top = Math.max(0, elementY - padY);
  const right = Math.min(imgWidth, elementX + elementW + padX);
  const bottom = Math.min(imgHeight, elementY + elementH + padY);

  const cropWidth = right - left;
  const cropHeight = bottom - top;

  // Skip if too small
  if (cropWidth < minWidth / 2 || cropHeight < minWidth / 2) {
    return null;
  }

  // Generate output filename
  const inputBase = path.basename(imagePath, path.extname(imagePath));
  const safeLabel = element.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const outputPath = path.join(outputDir, `${inputBase}-crop-${safeLabel}.png`);

  // Crop and optionally resize
  let pipeline = sharp(imagePath).extract({
    left,
    top,
    width: cropWidth,
    height: cropHeight
  });

  // Upscale small crops to minimum width
  if (cropWidth < minWidth && maxWidth) {
    const scale = Math.min(maxWidth / cropWidth, 2); // Max 2x upscale
    pipeline = pipeline.resize(Math.round(cropWidth * scale), Math.round(cropHeight * scale), {
      kernel: 'lanczos3'
    });
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const info = await pipeline.png().toFile(outputPath);

  return {
    type: 'crop',
    path: outputPath,
    sourcePath: imagePath,
    elementLabel: element.label,
    width: info.width,
    height: info.height
  };
}

/**
 * Crop all primary elements from a screenshot
 */
export async function cropPrimaryElements(
  imagePath: string,
  elements: UIElement[],
  options: CropOptions
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  // Only crop primary elements by default
  const primaryElements = elements.filter(e => e.importance === 'primary');

  for (const element of primaryElements) {
    const result = await cropElement(imagePath, element, options);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Copy and rename a screenshot for the docs folder
 */
export async function copyScreenshot(
  imagePath: string,
  outputDir: string,
  stepNumber: number
): Promise<GeneratedImage> {
  const { width, height } = await getImageDimensions(imagePath);
  const ext = path.extname(imagePath);
  const outputPath = path.join(outputDir, `${String(stepNumber).padStart(2, '0')}-screenshot${ext}`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.copyFile(imagePath, outputPath);

  return {
    type: 'full',
    path: outputPath,
    sourcePath: imagePath,
    width,
    height
  };
}
