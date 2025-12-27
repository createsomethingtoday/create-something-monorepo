/**
 * SVG to PNG Conversion
 * Uses @resvg/resvg-js (Rust-based) for reliable, accurate SVG rendering
 */

import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { SvgToPngOptions } from './types.js';

/**
 * Convert SVG to PNG using resvg (Rust-based, highly reliable)
 */
export async function svgToPng(options: SvgToPngOptions): Promise<Buffer> {
  const {
    svgPath,
    svgContent,
    width = 1024,
    height = 1024,
    crop,
    background = 'white',
    outputPath
  } = options;

  // Get SVG content
  let svg: string;
  if (svgContent) {
    svg = svgContent;
  } else if (svgPath) {
    svg = await fs.readFile(svgPath, 'utf-8');
  } else {
    throw new Error('Either svgPath or svgContent must be provided');
  }

  // Apply crop if specified (modify viewBox)
  if (crop) {
    const [cropX, cropY, cropWidth, cropHeight] = crop;
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);

    if (viewBoxMatch) {
      svg = svg.replace(
        viewBoxMatch[0],
        `viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`
      );
    } else {
      // Add viewBox if not present
      svg = svg.replace('<svg', `<svg viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`);
    }
  }

  // Wrap SVG with background if needed
  if (background !== 'transparent') {
    // Get current viewBox or default
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
    if (viewBoxMatch) {
      const [vbX, vbY, vbW, vbH] = viewBoxMatch[1].split(/\s+/).map(Number);
      // Insert background rect as first element after opening svg tag
      const bgRect = `<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${background}"/>`;
      svg = svg.replace(/(<svg[^>]*>)/, `$1${bgRect}`);
    }
  }

  // Create resvg instance with options
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width
    },
    font: {
      // Use system fonts
      loadSystemFonts: true
    }
  });

  // Render to PNG
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Save to file if outputPath provided
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pngBuffer);
  }

  return Buffer.from(pngBuffer);
}

/**
 * Convert SVG to high-contrast monochrome PNG (ideal for ControlNet Canny)
 */
export async function svgToMonochromePng(options: SvgToPngOptions): Promise<Buffer> {
  const { svgPath, svgContent, width = 1024, height = 1024, crop, outputPath } = options;

  // Get SVG content
  let svg: string;
  if (svgContent) {
    svg = svgContent;
  } else if (svgPath) {
    svg = await fs.readFile(svgPath, 'utf-8');
  } else {
    throw new Error('Either svgPath or svgContent must be provided');
  }

  // Convert to high-contrast monochrome
  const monoSvg = svg
    // Replace fill colors (except white/none) with black
    .replace(/fill="(?!white|#fff|#ffffff|none)[^"]*"/gi, 'fill="black"')
    .replace(/fill='(?!white|#fff|#ffffff|none)[^']*'/gi, "fill='black'")
    // Replace stroke colors with black
    .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="black"')
    .replace(/stroke='(?!none)[^']*'/gi, "stroke='black'")
    // Increase stroke width for visibility
    .replace(/stroke-width="([0-9.]+)"/gi, (_, w) => {
      const newWidth = Math.max(parseFloat(w) * 1.5, 1);
      return `stroke-width="${newWidth}"`;
    })
    // Remove any opacity
    .replace(/opacity="[^"]*"/gi, 'opacity="1"')
    .replace(/fill-opacity="[^"]*"/gi, 'fill-opacity="1"')
    .replace(/stroke-opacity="[^"]*"/gi, 'stroke-opacity="1"');

  return svgToPng({
    svgContent: monoSvg,
    width,
    height,
    crop,
    background: 'white',
    outputPath
  });
}

/**
 * Extract room region from floor plan SVG
 */
export async function extractRoom(
  svgPath: string,
  roomCrop: [number, number, number, number],
  outputPath?: string
): Promise<Buffer> {
  return svgToMonochromePng({
    svgPath,
    crop: roomCrop,
    width: 1024,
    height: 1024,
    outputPath
  });
}

/**
 * Batch export multiple rooms from a floor plan
 */
export async function extractRooms(
  svgPath: string,
  rooms: Array<{ name: string; crop: [number, number, number, number] }>,
  outputDir: string
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>();

  for (const room of rooms) {
    const outputPath = path.join(outputDir, `${room.name}.png`);
    const buffer = await extractRoom(svgPath, room.crop, outputPath);
    results.set(room.name, buffer);
  }

  return results;
}

/**
 * Layout options for compositing images
 */
export type CompositeLayout = 'vertical' | 'horizontal' | 'quadrant';

/**
 * Composite multiple PNG images into a single conditioning image
 * Used to combine floor plan + section for ControlNet
 *
 * @param images - Array of PNG buffers to composite
 * @param layout - How to arrange images: 'vertical' (top/bottom), 'horizontal' (left/right), 'quadrant' (2x2)
 * @param outputWidth - Final output width
 * @param outputHeight - Final output height
 * @param outputPath - Optional path to save result
 */
export async function compositeImages(
  images: Buffer[],
  layout: CompositeLayout = 'vertical',
  outputWidth = 1440,
  outputHeight = 1440,
  outputPath?: string
): Promise<Buffer> {
  if (images.length === 0) {
    throw new Error('At least one image required');
  }

  if (images.length === 1) {
    // Single image - just return it resized
    const dataUri = `data:image/png;base64,${images[0].toString('base64')}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}">
      <image href="${dataUri}" x="0" y="0" width="${outputWidth}" height="${outputHeight}" preserveAspectRatio="xMidYMid meet"/>
    </svg>`;

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth } });
    const pngBuffer = resvg.render().asPng();

    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, pngBuffer);
    }

    return Buffer.from(pngBuffer);
  }

  // Build SVG with embedded images
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${outputWidth}" height="${outputHeight}">`);

  // White background
  parts.push(`<rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="white"/>`);

  if (layout === 'vertical') {
    // Stack images top to bottom
    const cellHeight = outputHeight / images.length;
    for (let i = 0; i < images.length; i++) {
      const dataUri = `data:image/png;base64,${images[i].toString('base64')}`;
      const y = i * cellHeight;
      parts.push(`<image href="${dataUri}" x="0" y="${y}" width="${outputWidth}" height="${cellHeight}" preserveAspectRatio="xMidYMid meet"/>`);
    }
  } else if (layout === 'horizontal') {
    // Stack images left to right
    const cellWidth = outputWidth / images.length;
    for (let i = 0; i < images.length; i++) {
      const dataUri = `data:image/png;base64,${images[i].toString('base64')}`;
      const x = i * cellWidth;
      parts.push(`<image href="${dataUri}" x="${x}" y="0" width="${cellWidth}" height="${outputHeight}" preserveAspectRatio="xMidYMid meet"/>`);
    }
  } else if (layout === 'quadrant') {
    // 2x2 grid
    const halfW = outputWidth / 2;
    const halfH = outputHeight / 2;
    const positions = [
      [0, 0], [halfW, 0],
      [0, halfH], [halfW, halfH]
    ];
    for (let i = 0; i < Math.min(images.length, 4); i++) {
      const dataUri = `data:image/png;base64,${images[i].toString('base64')}`;
      const [x, y] = positions[i];
      parts.push(`<image href="${dataUri}" x="${x}" y="${y}" width="${halfW}" height="${halfH}" preserveAspectRatio="xMidYMid meet"/>`);
    }
  }

  parts.push('</svg>');

  const svg = parts.join('\n');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth } });
  const pngBuffer = resvg.render().asPng();

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pngBuffer);
  }

  return Buffer.from(pngBuffer);
}
