/**
 * Screenshot Highlighting
 * Draw annotation overlays on screenshots using Sharp
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { escapeXml } from '@create-something/components';
import type { UIElement, GeneratedImage, HighlightStyle } from './types.js';
import { DEFAULT_HIGHLIGHT_STYLES } from './types.js';
import { getImageDimensions } from './crop.js';

/**
 * Generate SVG rectangle for highlighting an element
 */
function createHighlightRect(
  element: UIElement,
  imgWidth: number,
  imgHeight: number,
  style: HighlightStyle
): string {
  const x = Math.round(element.x * imgWidth);
  const y = Math.round(element.y * imgHeight);
  const width = Math.round(element.width * imgWidth);
  const height = Math.round(element.height * imgHeight);

  return `<rect
    x="${x}" y="${y}"
    width="${width}" height="${height}"
    rx="${style.borderRadius}" ry="${style.borderRadius}"
    fill="${style.fillColor}"
    stroke="${style.borderColor}"
    stroke-width="${style.borderWidth}"
  />`;
}

/**
 * Generate SVG label for an element
 */
function createLabel(
  element: UIElement,
  imgWidth: number,
  imgHeight: number,
  index: number
): string {
  const x = Math.round(element.x * imgWidth);
  const y = Math.round(element.y * imgHeight);

  // Position label above the element
  const labelX = x;
  const labelY = Math.max(25, y - 10);

  const labelWidth = Math.min(element.label.length * 8 + 16, 200);
  const labelHeight = 24;

  return `
    <rect
      x="${labelX}" y="${labelY - labelHeight}"
      width="${labelWidth}" height="${labelHeight}"
      rx="4" ry="4"
      fill="rgba(0, 0, 0, 0.8)"
    />
    <text
      x="${labelX + 8}" y="${labelY - 7}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="12"
      fill="white"
    >${index + 1}. ${escapeXml(element.label)}</text>
  `;
}

// escapeXml imported from @create-something/components

/**
 * Create highlight overlay SVG for a screenshot
 */
export function createOverlaySvg(
  elements: UIElement[],
  imgWidth: number,
  imgHeight: number,
  options: { showLabels?: boolean; styles?: Record<string, HighlightStyle> } = {}
): string {
  const { showLabels = true, styles = DEFAULT_HIGHLIGHT_STYLES } = options;

  const rects = elements.map((element) => {
    const style = styles[element.importance] || styles.primary;
    return createHighlightRect(element, imgWidth, imgHeight, style);
  });

  const labels = showLabels
    ? elements
        .filter((e) => e.importance === 'primary')
        .map((element, index) => createLabel(element, imgWidth, imgHeight, index))
    : [];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
    ${rects.join('\n    ')}
    ${labels.join('\n    ')}
  </svg>`;
}

/**
 * Options for highlighting
 */
export interface HighlightOptions {
  /** Output directory for highlighted images */
  outputDir: string;
  /** Show element labels */
  showLabels?: boolean;
  /** Custom highlight styles */
  styles?: Record<string, HighlightStyle>;
}

/**
 * Create an annotated version of a screenshot with highlights
 */
export async function highlightScreenshot(
  imagePath: string,
  elements: UIElement[],
  options: HighlightOptions
): Promise<GeneratedImage> {
  const { outputDir, showLabels = true, styles } = options;

  const { width, height } = await getImageDimensions(imagePath);
  if (width === 0 || height === 0) {
    throw new Error(`Invalid image dimensions for ${imagePath}`);
  }

  // Create SVG overlay
  const overlaySvg = createOverlaySvg(elements, width, height, { showLabels, styles });

  // Generate output filename
  const inputBase = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(outputDir, `${inputBase}-annotated.png`);

  // Composite overlay onto image
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const info = await sharp(imagePath)
    .composite([
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);

  return {
    type: 'annotated',
    path: outputPath,
    sourcePath: imagePath,
    width: info.width,
    height: info.height,
  };
}

/**
 * Create a focused highlight on a single element (for call-to-action emphasis)
 */
export async function highlightElement(
  imagePath: string,
  element: UIElement,
  options: HighlightOptions & { pulseAnimation?: boolean }
): Promise<GeneratedImage> {
  const { outputDir, pulseAnimation = false } = options;

  const { width, height } = await getImageDimensions(imagePath);
  if (width === 0 || height === 0) {
    throw new Error(`Invalid image dimensions for ${imagePath}`);
  }

  // Use primary style with thicker border for single element focus
  const style: HighlightStyle = {
    borderColor: '#ffffff',
    borderWidth: 4,
    fillColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  };

  const rect = createHighlightRect(element, width, height, style);

  // Optional: Add animated pulse effect (CSS animation in SVG)
  const animation = pulseAnimation
    ? `<style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        rect { animation: pulse 2s infinite; }
      </style>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${animation}
    ${rect}
  </svg>`;

  const inputBase = path.basename(imagePath, path.extname(imagePath));
  const safeLabel = element.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const outputPath = path.join(outputDir, `${inputBase}-highlight-${safeLabel}.png`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const info = await sharp(imagePath)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);

  return {
    type: 'annotated',
    path: outputPath,
    sourcePath: imagePath,
    elementLabel: element.label,
    width: info.width,
    height: info.height,
  };
}
