/**
 * ASCII Renderer Type Definitions
 *
 * Based on Alex Harri's shape-aware ASCII rendering technique:
 * https://alexharri.com/blog/ascii-rendering
 */

/**
 * 6D shape vector representing how a character fills its cell.
 * Layout (staggered 2x3 grid):
 *   [0]   [1]    <- upper row (left lowered, right raised)
 *   [2]   [3]    <- middle row
 *   [4]   [5]    <- lower row (left raised, right lowered)
 */
export type ShapeVector = [number, number, number, number, number, number];

/**
 * 10D external sampling vector for directional contrast enhancement.
 * These sampling circles reach outside the cell boundary to detect edges.
 */
export type ExternalVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

/**
 * Character with its pre-computed shape vector
 */
export interface CharacterShape {
  char: string;
  vector: ShapeVector;
}

/**
 * Configuration for the ASCII renderer
 */
export interface AsciiRendererConfig {
  /** Width of each cell in pixels */
  cellWidth?: number;
  /** Height of each cell in pixels */
  cellHeight?: number;
  /** Number of samples per sampling circle (quality) */
  samplesPerCircle?: number;
  /** Global contrast enhancement exponent (1 = no enhancement) */
  globalContrast?: number;
  /** Directional contrast enhancement exponent (1 = no enhancement) */
  directionalContrast?: number;
  /** Character set to use ('ascii95' | 'extended' | custom array) */
  charset?: 'ascii95' | 'extended' | string[];
  /** Font family for shape vector generation */
  fontFamily?: string;
  /** Font size for shape vector generation */
  fontSize?: number;
}

/**
 * Result of rendering an image to ASCII
 */
export interface AsciiRenderResult {
  /** 2D array of characters [row][col] */
  characters: string[][];
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  /** Render as single string */
  toString(): string;
}

/**
 * Image data source for rendering
 */
export interface ImageSource {
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Get pixel lightness at (x, y) - returns value 0-1 */
  getLightness(x: number, y: number): number;
}

/**
 * Sampling circle configuration
 */
export interface SamplingCircle {
  /** Center X offset from cell center (0-1) */
  cx: number;
  /** Center Y offset from cell center (0-1) */
  cy: number;
  /** Radius relative to cell size */
  radius: number;
}

/**
 * K-d tree node for efficient nearest-neighbor search
 */
export interface KdNode {
  point: ShapeVector;
  character: string;
  left: KdNode | null;
  right: KdNode | null;
  splitDimension: number;
}

/**
 * Lookup cache key generation options
 */
export interface CacheOptions {
  /** Bits per vector component (2-6 recommended) */
  bitsPerComponent?: number;
}
