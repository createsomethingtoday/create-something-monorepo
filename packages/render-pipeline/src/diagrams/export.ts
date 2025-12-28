/**
 * Export Module
 * Converts SVG to PNG using sharp
 */

import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { RenderResult, ExportOptions } from './types.js';

/**
 * Export SVG to PNG
 */
export async function exportToPng(
  result: RenderResult,
  options: ExportOptions = { format: 'png' }
): Promise<Buffer> {
  const { svg, width, height } = result;
  const scale = options.scale ?? 2; // Default 2x for retina

  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(Math.round(width * scale), Math.round(height * scale))
    .png()
    .toBuffer();

  return pngBuffer;
}

/**
 * Save render result to file
 */
export async function saveToFile(
  result: RenderResult,
  outputPath: string,
  options: ExportOptions = { format: 'png' }
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (options.format === 'svg') {
    await fs.writeFile(outputPath, result.svg, 'utf-8');
  } else {
    const pngBuffer = await exportToPng(result, options);
    await fs.writeFile(outputPath, pngBuffer);
  }
}

/**
 * Export to both SVG and PNG
 */
export async function exportBoth(
  result: RenderResult,
  baseOutputPath: string,
  options: Omit<ExportOptions, 'format'> = {}
): Promise<{ svg: string; png: string }> {
  const dir = path.dirname(baseOutputPath);
  const basename = path.basename(baseOutputPath, path.extname(baseOutputPath));

  const svgPath = path.join(dir, `${basename}.svg`);
  const pngPath = path.join(dir, `${basename}.png`);

  await fs.mkdir(dir, { recursive: true });

  // Save SVG
  await fs.writeFile(svgPath, result.svg, 'utf-8');

  // Save PNG
  const pngBuffer = await exportToPng(result, { ...options, format: 'png' });
  await fs.writeFile(pngPath, pngBuffer);

  return { svg: svgPath, png: pngPath };
}
