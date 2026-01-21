/**
 * Contrast Enhancement for ASCII Rendering
 *
 * Implements two types of contrast enhancement:
 * 1. Global: Normalizes and applies exponent to sampling vectors
 * 2. Directional: Uses external sampling circles to enhance edges
 *
 * Based on: https://alexharri.com/blog/ascii-rendering
 */

import type { ShapeVector, ExternalVector } from './types.js';
import { EXTERNAL_AFFECTING_INDICES } from './shape-vectors.js';

/**
 * Apply global contrast enhancement to a shape vector.
 *
 * Process:
 * 1. Find max component value
 * 2. Normalize vector to [0, 1] using max
 * 3. Apply exponent (darker values get pushed toward 0)
 * 4. Denormalize back to original range
 *
 * @param vector - 6D shape vector to enhance
 * @param exponent - Contrast strength (1 = no change, higher = more contrast)
 */
export function applyGlobalContrast(
  vector: ShapeVector,
  exponent: number
): ShapeVector {
  if (exponent <= 1) return [...vector] as ShapeVector;

  // Find max value for normalization
  const maxValue = Math.max(...vector);
  if (maxValue === 0) return [...vector] as ShapeVector;

  // Apply contrast enhancement
  return vector.map((value) => {
    const normalized = value / maxValue;
    const enhanced = Math.pow(normalized, exponent);
    return enhanced * maxValue;
  }) as ShapeVector;
}

/**
 * Apply directional contrast enhancement using external sampling circles.
 *
 * Process:
 * 1. For each internal vector component, find max affecting external value
 * 2. If external is lighter than internal, use external as normalization base
 * 3. Apply exponent with component-wise normalization
 *
 * This enhances edges by darkening internal values when external values
 * indicate a nearby lighter region.
 *
 * @param internal - 6D internal shape vector
 * @param external - 10D external sampling vector
 * @param exponent - Contrast strength (1 = no change)
 */
export function applyDirectionalContrast(
  internal: ShapeVector,
  external: ExternalVector,
  exponent: number
): ShapeVector {
  if (exponent <= 1) return [...internal] as ShapeVector;

  return internal.map((value, i) => {
    // Find max affecting external value
    let maxExternal = value;
    for (const extIdx of EXTERNAL_AFFECTING_INDICES[i]) {
      maxExternal = Math.max(maxExternal, external[extIdx]);
    }

    if (maxExternal === 0) return value;

    // Apply contrast with component-wise normalization
    const normalized = value / maxExternal;
    const enhanced = Math.pow(normalized, exponent);
    return enhanced * maxExternal;
  }) as ShapeVector;
}

/**
 * Apply both global and directional contrast enhancement.
 *
 * Order matters: directional first detects edges, then global enhances overall contrast.
 *
 * @param internal - 6D internal shape vector
 * @param external - 10D external sampling vector (optional)
 * @param globalExponent - Global contrast strength
 * @param directionalExponent - Directional contrast strength
 */
export function applyContrast(
  internal: ShapeVector,
  external: ExternalVector | null,
  globalExponent: number,
  directionalExponent: number
): ShapeVector {
  let result = internal;

  // Apply directional first (if external samples provided)
  if (external && directionalExponent > 1) {
    result = applyDirectionalContrast(result, external, directionalExponent);
  }

  // Then apply global
  if (globalExponent > 1) {
    result = applyGlobalContrast(result, globalExponent);
  }

  return result;
}

/**
 * Batch apply contrast enhancement to a grid of vectors.
 */
export function applyContrastGrid(
  internalGrid: ShapeVector[][],
  externalGrid: ExternalVector[][] | null,
  globalExponent: number,
  directionalExponent: number
): ShapeVector[][] {
  return internalGrid.map((row, rowIdx) =>
    row.map((internal, colIdx) => {
      const external = externalGrid ? externalGrid[rowIdx][colIdx] : null;
      return applyContrast(internal, external, globalExponent, directionalExponent);
    })
  );
}

/**
 * Adaptive contrast that adjusts based on local variance.
 *
 * Areas with high variance (already contrasty) get less enhancement.
 * Areas with low variance (flat) get less enhancement too.
 * Areas with medium variance (edges) get the most enhancement.
 *
 * @param vector - Shape vector
 * @param baseExponent - Base contrast exponent
 * @param adaptiveFactor - How much to adapt (0 = disabled, 1 = fully adaptive)
 */
export function applyAdaptiveContrast(
  vector: ShapeVector,
  baseExponent: number,
  adaptiveFactor: number = 0.5
): ShapeVector {
  if (baseExponent <= 1 || adaptiveFactor === 0) {
    return applyGlobalContrast(vector, baseExponent);
  }

  // Calculate variance
  const mean = vector.reduce((a, b) => a + b, 0) / 6;
  const variance =
    vector.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 6;

  // Normalize variance to [0, 1] (assuming max variance around 0.25)
  const normalizedVariance = Math.min(1, variance / 0.25);

  // Bell curve: peak enhancement at medium variance
  const adaptiveMultiplier =
    1 - adaptiveFactor + adaptiveFactor * Math.sin(normalizedVariance * Math.PI);

  const effectiveExponent = 1 + (baseExponent - 1) * adaptiveMultiplier;

  return applyGlobalContrast(vector, effectiveExponent);
}
