/**
 * Character Lookup - K-d Tree and Caching
 *
 * Implements fast nearest-neighbor lookup for shape vectors using:
 * 1. K-d tree for O(log n) lookups in 6D space
 * 2. Quantized caching for O(1) repeated lookups
 *
 * Based on: https://alexharri.com/blog/ascii-rendering
 */

import type { ShapeVector, CharacterShape, KdNode, CacheOptions } from './types.js';
import { distanceSquared } from './shape-vectors.js';

/**
 * Build a k-d tree from character shapes for fast nearest-neighbor lookup.
 */
export function buildKdTree(characters: CharacterShape[]): KdNode | null {
  if (characters.length === 0) return null;

  function build(
    chars: CharacterShape[],
    depth: number
  ): KdNode | null {
    if (chars.length === 0) return null;
    if (chars.length === 1) {
      return {
        point: chars[0].vector,
        character: chars[0].char,
        left: null,
        right: null,
        splitDimension: depth % 6,
      };
    }

    const dimension = depth % 6;

    // Sort by current dimension
    chars.sort((a, b) => a.vector[dimension] - b.vector[dimension]);

    const medianIndex = Math.floor(chars.length / 2);
    const median = chars[medianIndex];

    return {
      point: median.vector,
      character: median.char,
      left: build(chars.slice(0, medianIndex), depth + 1),
      right: build(chars.slice(medianIndex + 1), depth + 1),
      splitDimension: dimension,
    };
  }

  // Copy array to avoid mutating original
  return build([...characters], 0);
}

/**
 * Find the nearest character to a query vector using the k-d tree.
 */
export function findNearest(
  root: KdNode | null,
  query: ShapeVector
): { character: string; distance: number } {
  if (!root) {
    return { character: ' ', distance: Infinity };
  }

  let bestChar = root.character;
  let bestDistSq = distanceSquared(root.point, query);

  function search(node: KdNode | null): void {
    if (!node) return;

    const distSq = distanceSquared(node.point, query);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestChar = node.character;
    }

    const dim = node.splitDimension;
    const diff = query[dim] - node.point[dim];
    const diffSq = diff * diff;

    // Search the side the query is on first
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;

    search(first);

    // Only search other side if it could contain a closer point
    if (diffSq < bestDistSq) {
      search(second);
    }
  }

  search(root);

  return { character: bestChar, distance: Math.sqrt(bestDistSq) };
}

/**
 * Cached character lookup with quantized vector keys.
 *
 * Quantizes each vector component to a fixed number of bits,
 * packs them into a single number as a cache key.
 */
export class CachedLookup {
  private cache: Map<number, string>;
  private kdTree: KdNode | null;
  private bitsPerComponent: number;
  private range: number;

  constructor(
    characters: CharacterShape[],
    options: CacheOptions = {}
  ) {
    this.bitsPerComponent = options.bitsPerComponent ?? 5;
    this.range = Math.pow(2, this.bitsPerComponent);
    this.cache = new Map();
    this.kdTree = buildKdTree(characters);
  }

  /**
   * Quantize a vector component to [0, range-1]
   */
  private quantize(value: number): number {
    return Math.min(this.range - 1, Math.floor(value * this.range));
  }

  /**
   * Generate cache key from quantized vector components.
   * Packs 6 components into a single number.
   */
  private generateKey(vector: ShapeVector): number {
    let key = 0;
    for (let i = 0; i < 6; i++) {
      const quantized = this.quantize(vector[i]);
      key = (key << this.bitsPerComponent) | quantized;
    }
    return key;
  }

  /**
   * Find the best matching character for a shape vector.
   */
  find(vector: ShapeVector): string {
    const key = this.generateKey(vector);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // K-d tree lookup
    const result = findNearest(this.kdTree, vector);

    // Cache result
    this.cache.set(key, result.character);

    return result.character;
  }

  /**
   * Prepopulate the cache for common vectors.
   * Useful for ensuring consistent performance.
   */
  prepopulate(): void {
    const steps = Math.min(8, this.range); // Sample at reduced resolution
    const step = 1 / steps;

    // Generate sample vectors across the space
    const generateVectors = (depth: number, current: number[]): void => {
      if (depth === 6) {
        const vector = current as ShapeVector;
        this.find(vector);
        return;
      }

      for (let i = 0; i <= steps; i++) {
        generateVectors(depth + 1, [...current, i * step]);
      }
    };

    generateVectors(0, []);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxPossible: number } {
    return {
      size: this.cache.size,
      maxPossible: Math.pow(this.range, 6),
    };
  }
}

/**
 * Simple brute-force lookup (for comparison/debugging)
 */
export function bruteForceFind(
  characters: CharacterShape[],
  vector: ShapeVector
): string {
  let bestChar = ' ';
  let bestDist = Infinity;

  for (const { char, vector: charVector } of characters) {
    const dist = distanceSquared(charVector, vector);
    if (dist < bestDist) {
      bestDist = dist;
      bestChar = char;
    }
  }

  return bestChar;
}
