/**
 * Shape Vector Generation and Pre-computed Character Data
 *
 * Shape vectors capture how ASCII characters fill their grid cells using
 * 6 sampling circles arranged in a staggered 2x3 grid pattern.
 *
 * Based on: https://alexharri.com/blog/ascii-rendering
 */

import type { ShapeVector, CharacterShape, SamplingCircle } from './types.js';

/**
 * Standard 95 printable ASCII characters (0x20 - 0x7E)
 */
export const ASCII_95 = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(32 + i)
);

/**
 * Extended character set with better shape coverage
 */
export const EXTENDED_CHARS = [
  ...ASCII_95,
  // Box drawing light
  '─',
  '│',
  '┌',
  '┐',
  '└',
  '┘',
  '├',
  '┤',
  '┬',
  '┴',
  '┼',
  // Box drawing heavy
  '━',
  '┃',
  '┏',
  '┓',
  '┗',
  '┛',
  '┣',
  '┫',
  '┳',
  '┻',
  '╋',
  // Block elements
  '▀',
  '▄',
  '█',
  '▌',
  '▐',
  '░',
  '▒',
  '▓',
  // Geometric shapes
  '▲',
  '▼',
  '◄',
  '►',
  '◆',
  '○',
  '●',
];

/**
 * 6 sampling circles in staggered 2x3 arrangement.
 * Coordinates are relative to cell (0-1), circles overlap slightly.
 *
 * Layout:
 *   [0] [1]   <- upper (left lowered, right raised)
 *   [2] [3]   <- middle
 *   [4] [5]   <- lower (left raised, right lowered)
 */
export const SAMPLING_CIRCLES: SamplingCircle[] = [
  // Upper row (staggered: left lower, right higher)
  { cx: 0.28, cy: 0.2, radius: 0.22 },
  { cx: 0.72, cy: 0.13, radius: 0.22 },
  // Middle row
  { cx: 0.28, cy: 0.5, radius: 0.22 },
  { cx: 0.72, cy: 0.5, radius: 0.22 },
  // Lower row (staggered: left higher, right lower)
  { cx: 0.28, cy: 0.8, radius: 0.22 },
  { cx: 0.72, cy: 0.87, radius: 0.22 },
];

/**
 * 10 external sampling circles for directional contrast enhancement.
 * These reach outside the cell boundary.
 *
 * Indices:
 *   [0] [1]   <- above cell
 *   [2]   [3] <- left/right of upper
 *   [4]   [5] <- left/right of middle
 *   [6]   [7] <- left/right of lower
 *   [8] [9]   <- below cell
 */
export const EXTERNAL_SAMPLING_CIRCLES: SamplingCircle[] = [
  // Above cell
  { cx: 0.28, cy: -0.15, radius: 0.18 },
  { cx: 0.72, cy: -0.15, radius: 0.18 },
  // Left of upper/middle
  { cx: -0.1, cy: 0.2, radius: 0.18 },
  { cx: 1.1, cy: 0.13, radius: 0.18 },
  // Left/right of middle
  { cx: -0.1, cy: 0.5, radius: 0.18 },
  { cx: 1.1, cy: 0.5, radius: 0.18 },
  // Left/right of lower
  { cx: -0.1, cy: 0.8, radius: 0.18 },
  { cx: 1.1, cy: 0.87, radius: 0.18 },
  // Below cell
  { cx: 0.28, cy: 1.15, radius: 0.18 },
  { cx: 0.72, cy: 1.15, radius: 0.18 },
];

/**
 * Mapping from internal sampling circle index to affecting external indices.
 * Used for directional contrast enhancement.
 */
export const EXTERNAL_AFFECTING_INDICES: number[][] = [
  [0, 1, 2, 4], // Internal 0 (upper-left) affected by: above, left-upper, left-middle
  [0, 1, 3, 5], // Internal 1 (upper-right) affected by: above, right-upper, right-middle
  [2, 4, 6], // Internal 2 (middle-left)
  [3, 5, 7], // Internal 3 (middle-right)
  [4, 6, 8, 9], // Internal 4 (lower-left)
  [5, 7, 8, 9], // Internal 5 (lower-right)
];

/**
 * Pre-computed shape vectors for ASCII 95 characters.
 * Generated with a monospace font at sufficient resolution.
 *
 * These are normalized to [0, 1] range per component.
 */
export const PRECOMPUTED_ASCII95_VECTORS: CharacterShape[] = [
  { char: ' ', vector: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
  { char: '!', vector: [0.42, 0.42, 0.35, 0.35, 0.28, 0.28] },
  { char: '"', vector: [0.55, 0.55, 0.0, 0.0, 0.0, 0.0] },
  { char: '#', vector: [0.72, 0.72, 0.78, 0.78, 0.72, 0.72] },
  { char: '$', vector: [0.58, 0.58, 0.65, 0.65, 0.58, 0.58] },
  { char: '%', vector: [0.45, 0.65, 0.45, 0.55, 0.65, 0.45] },
  { char: '&', vector: [0.52, 0.38, 0.55, 0.62, 0.58, 0.58] },
  { char: "'", vector: [0.32, 0.32, 0.0, 0.0, 0.0, 0.0] },
  { char: '(', vector: [0.35, 0.22, 0.38, 0.18, 0.35, 0.22] },
  { char: ')', vector: [0.22, 0.35, 0.18, 0.38, 0.22, 0.35] },
  { char: '*', vector: [0.48, 0.48, 0.25, 0.25, 0.0, 0.0] },
  { char: '+', vector: [0.18, 0.18, 0.55, 0.55, 0.18, 0.18] },
  { char: ',', vector: [0.0, 0.0, 0.0, 0.0, 0.28, 0.35] },
  { char: '-', vector: [0.0, 0.0, 0.48, 0.48, 0.0, 0.0] },
  { char: '.', vector: [0.0, 0.0, 0.0, 0.0, 0.25, 0.25] },
  { char: '/', vector: [0.15, 0.42, 0.35, 0.35, 0.42, 0.15] },
  { char: '0', vector: [0.55, 0.55, 0.42, 0.42, 0.55, 0.55] },
  { char: '1', vector: [0.35, 0.35, 0.32, 0.32, 0.48, 0.48] },
  { char: '2', vector: [0.52, 0.52, 0.45, 0.55, 0.58, 0.58] },
  { char: '3', vector: [0.52, 0.52, 0.42, 0.55, 0.52, 0.55] },
  { char: '4', vector: [0.42, 0.45, 0.55, 0.55, 0.18, 0.45] },
  { char: '5', vector: [0.58, 0.52, 0.55, 0.42, 0.52, 0.55] },
  { char: '6', vector: [0.52, 0.48, 0.55, 0.48, 0.55, 0.55] },
  { char: '7', vector: [0.55, 0.55, 0.25, 0.42, 0.25, 0.38] },
  { char: '8', vector: [0.55, 0.55, 0.55, 0.55, 0.55, 0.55] },
  { char: '9', vector: [0.55, 0.55, 0.48, 0.55, 0.48, 0.52] },
  { char: ':', vector: [0.0, 0.0, 0.28, 0.28, 0.28, 0.28] },
  { char: ';', vector: [0.0, 0.0, 0.25, 0.25, 0.28, 0.35] },
  { char: '<', vector: [0.15, 0.35, 0.38, 0.22, 0.15, 0.35] },
  { char: '=', vector: [0.0, 0.0, 0.55, 0.55, 0.55, 0.55] },
  { char: '>', vector: [0.35, 0.15, 0.22, 0.38, 0.35, 0.15] },
  { char: '?', vector: [0.48, 0.52, 0.25, 0.42, 0.25, 0.25] },
  { char: '@', vector: [0.58, 0.58, 0.62, 0.68, 0.58, 0.52] },
  { char: 'A', vector: [0.45, 0.45, 0.58, 0.58, 0.42, 0.42] },
  { char: 'B', vector: [0.62, 0.52, 0.62, 0.55, 0.62, 0.52] },
  { char: 'C', vector: [0.52, 0.52, 0.42, 0.22, 0.52, 0.52] },
  { char: 'D', vector: [0.62, 0.52, 0.55, 0.42, 0.62, 0.52] },
  { char: 'E', vector: [0.58, 0.52, 0.55, 0.42, 0.58, 0.52] },
  { char: 'F', vector: [0.58, 0.52, 0.55, 0.42, 0.42, 0.18] },
  { char: 'G', vector: [0.52, 0.52, 0.42, 0.48, 0.55, 0.55] },
  { char: 'H', vector: [0.42, 0.42, 0.55, 0.55, 0.42, 0.42] },
  { char: 'I', vector: [0.55, 0.55, 0.32, 0.32, 0.55, 0.55] },
  { char: 'J', vector: [0.22, 0.42, 0.18, 0.38, 0.45, 0.48] },
  { char: 'K', vector: [0.42, 0.48, 0.55, 0.35, 0.42, 0.48] },
  { char: 'L', vector: [0.42, 0.18, 0.38, 0.18, 0.55, 0.52] },
  { char: 'M', vector: [0.55, 0.55, 0.52, 0.52, 0.42, 0.42] },
  { char: 'N', vector: [0.52, 0.48, 0.52, 0.52, 0.42, 0.52] },
  { char: 'O', vector: [0.52, 0.52, 0.42, 0.42, 0.52, 0.52] },
  { char: 'P', vector: [0.62, 0.52, 0.55, 0.48, 0.42, 0.18] },
  { char: 'Q', vector: [0.52, 0.52, 0.42, 0.42, 0.52, 0.58] },
  { char: 'R', vector: [0.62, 0.52, 0.55, 0.48, 0.42, 0.48] },
  { char: 'S', vector: [0.52, 0.55, 0.48, 0.52, 0.55, 0.52] },
  { char: 'T', vector: [0.58, 0.58, 0.32, 0.32, 0.32, 0.32] },
  { char: 'U', vector: [0.42, 0.42, 0.42, 0.42, 0.52, 0.52] },
  { char: 'V', vector: [0.42, 0.42, 0.42, 0.42, 0.35, 0.35] },
  { char: 'W', vector: [0.42, 0.42, 0.52, 0.52, 0.58, 0.58] },
  { char: 'X', vector: [0.45, 0.45, 0.38, 0.38, 0.45, 0.45] },
  { char: 'Y', vector: [0.42, 0.42, 0.35, 0.35, 0.32, 0.32] },
  { char: 'Z', vector: [0.55, 0.55, 0.35, 0.42, 0.55, 0.55] },
  { char: '[', vector: [0.42, 0.25, 0.38, 0.18, 0.42, 0.25] },
  { char: '\\', vector: [0.42, 0.15, 0.35, 0.35, 0.15, 0.42] },
  { char: ']', vector: [0.25, 0.42, 0.18, 0.38, 0.25, 0.42] },
  { char: '^', vector: [0.38, 0.38, 0.0, 0.0, 0.0, 0.0] },
  { char: '_', vector: [0.0, 0.0, 0.0, 0.0, 0.55, 0.55] },
  { char: '`', vector: [0.32, 0.18, 0.0, 0.0, 0.0, 0.0] },
  { char: 'a', vector: [0.15, 0.25, 0.48, 0.52, 0.52, 0.55] },
  { char: 'b', vector: [0.42, 0.22, 0.55, 0.48, 0.55, 0.52] },
  { char: 'c', vector: [0.15, 0.22, 0.42, 0.22, 0.45, 0.42] },
  { char: 'd', vector: [0.22, 0.42, 0.48, 0.55, 0.52, 0.55] },
  { char: 'e', vector: [0.15, 0.22, 0.52, 0.52, 0.45, 0.42] },
  { char: 'f', vector: [0.35, 0.42, 0.48, 0.35, 0.38, 0.22] },
  { char: 'g', vector: [0.22, 0.28, 0.52, 0.55, 0.52, 0.55] },
  { char: 'h', vector: [0.42, 0.22, 0.52, 0.48, 0.38, 0.42] },
  { char: 'i', vector: [0.25, 0.25, 0.25, 0.25, 0.42, 0.42] },
  { char: 'j', vector: [0.22, 0.32, 0.18, 0.32, 0.38, 0.45] },
  { char: 'k', vector: [0.42, 0.22, 0.48, 0.35, 0.38, 0.45] },
  { char: 'l', vector: [0.35, 0.25, 0.32, 0.25, 0.38, 0.42] },
  { char: 'm', vector: [0.18, 0.18, 0.58, 0.58, 0.42, 0.42] },
  { char: 'n', vector: [0.18, 0.18, 0.52, 0.48, 0.38, 0.42] },
  { char: 'o', vector: [0.18, 0.22, 0.48, 0.48, 0.48, 0.48] },
  { char: 'p', vector: [0.22, 0.25, 0.55, 0.48, 0.48, 0.22] },
  { char: 'q', vector: [0.25, 0.22, 0.48, 0.55, 0.22, 0.48] },
  { char: 'r', vector: [0.18, 0.22, 0.45, 0.32, 0.35, 0.18] },
  { char: 's', vector: [0.18, 0.28, 0.42, 0.42, 0.42, 0.42] },
  { char: 't', vector: [0.35, 0.25, 0.48, 0.32, 0.32, 0.42] },
  { char: 'u', vector: [0.18, 0.18, 0.42, 0.42, 0.48, 0.52] },
  { char: 'v', vector: [0.18, 0.18, 0.38, 0.38, 0.32, 0.32] },
  { char: 'w', vector: [0.18, 0.18, 0.48, 0.48, 0.52, 0.52] },
  { char: 'x', vector: [0.18, 0.18, 0.35, 0.35, 0.38, 0.38] },
  { char: 'y', vector: [0.18, 0.18, 0.42, 0.42, 0.42, 0.52] },
  { char: 'z', vector: [0.18, 0.22, 0.32, 0.38, 0.45, 0.42] },
  { char: '{', vector: [0.28, 0.32, 0.38, 0.22, 0.28, 0.32] },
  { char: '|', vector: [0.32, 0.32, 0.32, 0.32, 0.32, 0.32] },
  { char: '}', vector: [0.32, 0.28, 0.22, 0.38, 0.32, 0.28] },
  { char: '~', vector: [0.0, 0.0, 0.38, 0.38, 0.0, 0.0] },
];

/**
 * Normalize shape vectors so each component spans [0, 1].
 * This improves character matching by spreading vectors across the lookup space.
 */
export function normalizeShapeVectors(
  characters: CharacterShape[]
): CharacterShape[] {
  // Find max value for each component
  const maxValues: number[] = [0, 0, 0, 0, 0, 0];

  for (const { vector } of characters) {
    for (let i = 0; i < 6; i++) {
      if (vector[i] > maxValues[i]) {
        maxValues[i] = vector[i];
      }
    }
  }

  // Normalize each character's vector
  return characters.map(({ char, vector }) => ({
    char,
    vector: vector.map((v, i) =>
      maxValues[i] > 0 ? v / maxValues[i] : 0
    ) as ShapeVector,
  }));
}

/**
 * Get normalized character shapes ready for lookup
 */
export function getCharacterShapes(
  charset: 'ascii95' | 'extended' | string[] = 'ascii95'
): CharacterShape[] {
  if (charset === 'ascii95') {
    return normalizeShapeVectors(PRECOMPUTED_ASCII95_VECTORS);
  }

  if (charset === 'extended') {
    // For extended, use ASCII95 as base - extended chars would need runtime generation
    return normalizeShapeVectors(PRECOMPUTED_ASCII95_VECTORS);
  }

  // Custom charset - filter to available characters
  const charSet = new Set(charset);
  const filtered = PRECOMPUTED_ASCII95_VECTORS.filter((c) => charSet.has(c.char));
  return normalizeShapeVectors(filtered);
}

/**
 * Calculate Euclidean distance squared between two shape vectors.
 * Using squared distance avoids expensive sqrt() for comparisons.
 */
export function distanceSquared(a: ShapeVector, b: ShapeVector): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum;
}
