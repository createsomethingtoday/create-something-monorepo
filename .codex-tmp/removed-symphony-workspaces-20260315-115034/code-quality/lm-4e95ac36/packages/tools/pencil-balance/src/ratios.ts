/**
 * Ratio Analysis Functions
 * 
 * Functions for analyzing proportions and finding closest known ratios.
 */

import type { RatioDefinition, RatioAnalysis } from './types';
import { KNOWN_RATIOS } from './types';

/**
 * Calculate the proximity of a value to a target ratio (0-1).
 * 1.0 means exact match, 0.0 means completely different.
 */
export function calculateProximity(value: number, target: number): number {
  if (target === 0) return value === 0 ? 1 : 0;
  
  const ratio = value / target;
  // Use a bell curve centered at 1.0
  // proximity = e^(-(ratio-1)^2 / 0.1)
  // This gives ~0.95 at 5% difference, ~0.78 at 10%, ~0.37 at 20%
  const deviation = Math.abs(ratio - 1);
  return Math.exp(-Math.pow(deviation, 2) / 0.1);
}

/**
 * Find the closest known ratio to a given value.
 */
export function findClosestRatio(
  value: number,
  ratios: RatioDefinition[] = KNOWN_RATIOS
): { ratio: RatioDefinition; proximity: number } {
  let best = { ratio: ratios[0], proximity: 0 };
  
  for (const ratio of ratios) {
    const proximity = calculateProximity(value, ratio.ratio);
    if (proximity > best.proximity) {
      best = { ratio, proximity };
    }
    // Also check the inverse
    const inverseProximity = calculateProximity(value, 1 / ratio.ratio);
    if (inverseProximity > best.proximity) {
      best = { ratio, proximity: inverseProximity };
    }
  }
  
  return best;
}

/**
 * Analyze the aspect ratio of a bounding box.
 */
export function analyzeAspectRatio(width: number, height: number): RatioAnalysis {
  const aspectRatio = width / height;
  const { ratio, proximity } = findClosestRatio(aspectRatio);
  
  return {
    aspectRatio,
    aspectRatioClosestTo: ratio.name,
    aspectRatioProximity: proximity,
  };
}

/**
 * Analyze the distribution of child widths.
 * Returns ratios normalized to sum to 1.
 */
export function analyzeChildDistribution(widths: number[]): {
  ratios: number[];
  closestTo: string;
  proximity: number;
} {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { ratios: widths.map(() => 0), closestTo: 'none', proximity: 0 };
  }
  
  const ratios = widths.map(w => w / total);
  
  // For two children, check against common split ratios
  if (ratios.length === 2) {
    const splitRatios = [
      { name: 'golden (φ)', target: 0.382 },
      { name: 'equal (1:1)', target: 0.5 },
      { name: 'thirds (1:2)', target: 0.333 },
      { name: '2:3', target: 0.4 },
      { name: '1:3', target: 0.25 },
      { name: '1:4', target: 0.2 },
    ];
    
    let best = { name: 'custom', proximity: 0 };
    for (const split of splitRatios) {
      // Check if first ratio matches (or its complement)
      const proximity1 = calculateProximity(ratios[0], split.target);
      const proximity2 = calculateProximity(ratios[0], 1 - split.target);
      const proximity = Math.max(proximity1, proximity2);
      
      if (proximity > best.proximity) {
        best = { name: split.name, proximity };
      }
    }
    
    return { ratios, closestTo: best.name, proximity: best.proximity };
  }
  
  // For more children, check for equal distribution
  const expectedEqual = 1 / ratios.length;
  const equalProximity = ratios.reduce(
    (acc, r) => acc * calculateProximity(r, expectedEqual),
    1
  );
  
  if (equalProximity > 0.8) {
    return { ratios, closestTo: 'equal', proximity: equalProximity };
  }
  
  return { ratios, closestTo: 'varied', proximity: 0.5 };
}

/**
 * Check if a ratio is close to golden ratio (within threshold).
 */
export function isGoldenRatio(ratio: number, threshold = 0.05): boolean {
  const phi = 1.618;
  const phiInverse = 0.618;
  
  return (
    Math.abs(ratio - phi) / phi < threshold ||
    Math.abs(ratio - phiInverse) / phiInverse < threshold
  );
}

/**
 * Suggest adjustments to achieve a target ratio.
 */
export function suggestRatioAdjustment(
  currentWidth: number,
  currentHeight: number,
  targetRatio: number,
  preserveWidth = true
): { width: number; height: number } {
  if (preserveWidth) {
    return {
      width: currentWidth,
      height: currentWidth / targetRatio,
    };
  } else {
    return {
      width: currentHeight * targetRatio,
      height: currentHeight,
    };
  }
}
