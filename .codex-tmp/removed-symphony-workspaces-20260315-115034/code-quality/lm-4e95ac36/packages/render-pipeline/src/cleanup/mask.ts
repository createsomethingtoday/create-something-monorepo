/**
 * Mask Generation using Sharp
 * Creates inpainting masks from detected distraction regions
 */

import sharp from 'sharp';
import type { Distraction } from './detect.js';

/**
 * Options for mask generation
 */
export interface MaskOptions {
  /** Feather radius in pixels (default: 10) */
  feather?: number;
  /** Expansion of mask regions in pixels (default: 15) */
  expand?: number;
  /** Save intermediate mask to disk */
  outputPath?: string;
}

/**
 * Generate an inpainting mask from detected distractions
 *
 * Creates a black image with white regions where distractions should be removed.
 * Inpainting models use white = area to fill, black = area to preserve.
 *
 * @param imagePath - Path to the original image (for dimensions)
 * @param distractions - Detected distraction regions
 * @param options - Mask generation options
 * @returns Mask as PNG buffer
 */
export async function generateMask(
  imagePath: string,
  distractions: Distraction[],
  options: MaskOptions = {}
): Promise<Buffer> {
  const { feather = 10, expand = 15, outputPath } = options;

  // Get original image dimensions
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  if (distractions.length === 0) {
    // No distractions - return all-black mask (preserve everything)
    const blackMask = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
      .png()
      .toBuffer();

    if (outputPath) {
      await sharp(blackMask).toFile(outputPath);
    }

    return blackMask;
  }

  // Create SVG overlay for mask regions
  // Using SVG allows smooth ellipses and proper feathering
  const svgParts: string[] = [];

  for (const d of distractions) {
    // Convert normalized coordinates to pixels
    const cx = Math.round(d.x * width + (d.width * width) / 2);
    const cy = Math.round(d.y * height + (d.height * height) / 2);
    const rx = Math.round((d.width * width) / 2) + expand;
    const ry = Math.round((d.height * height) / 2) + expand;

    // Use ellipse for smoother edges
    svgParts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>`);
  }

  // Build SVG with Gaussian blur for feathering
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="${feather}" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="black"/>
      <g filter="url(#blur)">
        ${svgParts.join('\n        ')}
      </g>
    </svg>
  `;

  // Render SVG to PNG
  let mask = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  // Ensure pure black/white by thresholding (feathering creates grays)
  // We keep some feathering for smooth blending, but boost contrast
  mask = await sharp(mask)
    .normalise() // Stretch contrast
    .png()
    .toBuffer();

  if (outputPath) {
    await sharp(mask).toFile(outputPath);
    console.log(`  Mask saved: ${outputPath}`);
  }

  return mask;
}

/**
 * Create a debug visualization overlay showing detected regions
 *
 * @param imagePath - Path to original image
 * @param distractions - Detected regions
 * @param outputPath - Where to save visualization
 */
export async function createDebugVisualization(
  imagePath: string,
  distractions: Distraction[],
  outputPath: string
): Promise<void> {
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  if (distractions.length === 0) {
    // Just copy original
    await sharp(imagePath).toFile(outputPath);
    return;
  }

  // Create SVG overlay with semi-transparent rectangles and labels
  const svgParts: string[] = [];

  for (const d of distractions) {
    const x = Math.round(d.x * width);
    const y = Math.round(d.y * height);
    const w = Math.round(d.width * width);
    const h = Math.round(d.height * height);

    // Red rectangle
    svgParts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
      `fill="none" stroke="red" stroke-width="3"/>`
    );

    // Label background
    svgParts.push(
      `<rect x="${x}" y="${y - 20}" width="${d.label.length * 8 + 10}" height="20" ` +
      `fill="red" rx="3"/>`
    );

    // Label text
    svgParts.push(
      `<text x="${x + 5}" y="${y - 5}" fill="white" font-size="14" font-family="sans-serif">` +
      `${d.label}</text>`
    );
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgParts.join('\n      ')}
    </svg>
  `;

  // Composite SVG over original image
  await sharp(imagePath)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ])
    .toFile(outputPath);

  console.log(`  Debug visualization: ${outputPath}`);
}
