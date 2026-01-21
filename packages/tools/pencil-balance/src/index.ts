/**
 * Pencil Balance Analysis
 * 
 * A library for analyzing visual balance and proportions in .pen file layouts.
 * Designed to work with Pencil MCP's snapshot_layout output.
 * 
 * @example
 * ```typescript
 * import { analyzeProportions, analyzeWhitespace } from '@create-something/pencil-balance';
 * 
 * // Get layout from Pencil MCP
 * const layout = await pencil.snapshot_layout({ nodeId: 'myFrame' });
 * 
 * // Analyze proportions
 * const analysis = analyzeProportions(layout);
 * console.log(analysis.observations);
 * 
 * // Check whitespace
 * const whitespace = analyzeWhitespace(layout);
 * console.log(whitespace.contentDensity);
 * ```
 */

// Types
export * from './types';

// Core analysis functions
export { 
  analyzeProportions,
  analyzeWhitespace,
  suggestProportions,
  analyzeMultiple,
} from './analyze';

// Ratio utilities
export {
  analyzeAspectRatio,
  analyzeChildDistribution,
  isGoldenRatio,
  findClosestRatio,
  calculateProximity,
  suggestRatioAdjustment,
} from './ratios';

// Visual weight utilities
export {
  calculateVisualWeight,
  calculateBalanceScore,
  assessIntentionalAsymmetry,
  calculateWeightFactors,
  calculateAreaWeight,
  estimateTextWeight,
  estimateDensityWeight,
  estimateTypeWeight,
} from './visual-weight';
