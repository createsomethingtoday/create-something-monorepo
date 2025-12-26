/**
 * Canon-Compliant SVG to PNG Conversion (WASM)
 *
 * Uses @resvg/resvg-wasm for edge/browser compatibility.
 * Renders white text/lines on black background per Canon design system.
 *
 * Font: Inter (geometric sans, closest to Stack Sans Notch that's freely available)
 */

import { Resvg, initWasm } from '@resvg/resvg-wasm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Canon render options
 */
export interface CanonRenderOptions {
  /** SVG file path */
  svgPath?: string;
  /** Raw SVG content */
  svgContent?: string;
  /** Output width in pixels (default: 1024) */
  width?: number;
  /** Output height in pixels (default: 1024) */
  height?: number;
  /** Crop region: [x, y, width, height] in SVG units */
  crop?: [number, number, number, number];
  /** Output path for PNG file */
  outputPath?: string;
  /** Use Canon colors (white on black). Default: true */
  canonColors?: boolean;
}

let wasmInitialized = false;
let fontData: Uint8Array | null = null;

/**
 * Initialize resvg-wasm with Inter font
 *
 * Call this before using svgToPngWasm. In Node.js environments,
 * this loads the WASM file from node_modules. In browser/edge
 * environments, pass the WASM buffer directly.
 */
export async function initResvgWasm(wasmBuffer?: ArrayBuffer): Promise<void> {
  if (wasmInitialized) return;

  if (wasmBuffer) {
    // Browser/edge: use provided buffer
    await initWasm(wasmBuffer);
  } else {
    // Node.js: load from file system
    const wasmPath = path.resolve(
      __dirname,
      '../node_modules/@resvg/resvg-wasm/index_bg.wasm'
    );
    const buffer = await fs.readFile(wasmPath);
    await initWasm(buffer);
  }

  wasmInitialized = true;

  // Load Inter font
  const fontPath = path.resolve(__dirname, '../fonts/Inter-Regular.ttf');
  try {
    fontData = await fs.readFile(fontPath);
  } catch {
    console.warn('Inter font not found, using system fonts');
  }
}

/**
 * @internal
 */
async function ensureInitialized(): Promise<void> {
  if (!wasmInitialized) {
    await initResvgWasm();
  }
}

/**
 * Transform SVG to Canon color scheme (white on black)
 */
function transformToCanonColors(svg: string): string {
  return svg
    // Background: white → black
    .replace(/fill="white"/gi, 'fill="__CANON_BLACK__"')
    .replace(/fill="#fff(?:fff)?"/gi, 'fill="__CANON_BLACK__"')
    .replace(/fill='white'/gi, "fill='__CANON_BLACK__'")
    .replace(/fill='#fff(?:fff)?'/gi, "fill='__CANON_BLACK__'")
    // Foreground: black → white
    .replace(/fill="black"/gi, 'fill="__CANON_WHITE__"')
    .replace(/fill="#000(?:000)?"/gi, 'fill="__CANON_WHITE__"')
    .replace(/fill='black'/gi, "fill='__CANON_WHITE__'")
    .replace(/fill='#000(?:000)?'/gi, "fill='__CANON_WHITE__'")
    .replace(/stroke="black"/gi, 'stroke="__CANON_WHITE__"')
    .replace(/stroke="#000(?:000)?"/gi, 'stroke="__CANON_WHITE__"')
    .replace(/stroke='black'/gi, "stroke='__CANON_WHITE__'")
    .replace(/stroke='#000(?:000)?'/gi, "stroke='__CANON_WHITE__'")
    // Grays → inverted grays
    .replace(/#f0f0f0/gi, '#0f0f0f')
    .replace(/#e8e8e8/gi, '#171717')
    // Finalize placeholders
    .replace(/__CANON_BLACK__/g, '#000000')
    .replace(/__CANON_WHITE__/g, '#ffffff');
}

/**
 * Convert SVG to PNG using resvg-wasm with Canon styling
 */
export async function svgToPngWasm(options: CanonRenderOptions): Promise<Buffer> {
  const {
    svgPath,
    svgContent,
    width = 1024,
    crop,
    outputPath,
    canonColors = true
  } = options;

  await ensureInitialized();

  // Get SVG content
  let svg: string;
  if (svgContent) {
    svg = svgContent;
  } else if (svgPath) {
    svg = await fs.readFile(svgPath, 'utf-8');
  } else {
    throw new Error('Either svgPath or svgContent must be provided');
  }

  // Apply crop if specified
  if (crop) {
    const [cropX, cropY, cropWidth, cropHeight] = crop;
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);

    if (viewBoxMatch) {
      svg = svg.replace(
        viewBoxMatch[0],
        `viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`
      );
    } else {
      svg = svg.replace('<svg', `<svg viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`);
    }
  }

  // Transform to Canon colors (white on black)
  if (canonColors) {
    svg = transformToCanonColors(svg);
  }

  // Update font-family to Inter
  svg = svg.replace(
    /font-family="[^"]*"/g,
    'font-family="Inter, system-ui, sans-serif"'
  );
  svg = svg.replace(
    /font-family='[^']*'/g,
    "font-family='Inter, system-ui, sans-serif'"
  );

  // Create resvg instance
  const resvgOptions: {
    fitTo: { mode: 'width'; value: number };
    font?: { fontBuffers: Uint8Array[]; loadSystemFonts: boolean };
  } = {
    fitTo: {
      mode: 'width',
      value: width
    }
  };

  // Add font data if available
  if (fontData) {
    resvgOptions.font = {
      fontBuffers: [fontData],
      loadSystemFonts: true
    };
  }

  const resvg = new Resvg(svg, resvgOptions);
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
 * Create a Canon-styled SVG (white on black) without rasterizing
 */
export function createCanonSvg(svgContent: string): string {
  let svg = transformToCanonColors(svgContent);
  svg = svg.replace(
    /font-family="[^"]*"/g,
    'font-family="Inter, system-ui, sans-serif"'
  );
  return svg;
}

/**
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}
