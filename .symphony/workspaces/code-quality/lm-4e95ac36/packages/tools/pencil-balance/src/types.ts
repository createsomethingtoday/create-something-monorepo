/**
 * Pencil Balance Analysis Types
 * 
 * Type definitions for proportion and visual weight analysis of .pen file layouts.
 */

// =============================================================================
// INPUT TYPES (from Pencil's snapshot_layout)
// =============================================================================

export interface LayoutNode {
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: LayoutNode[] | '...';
  problems?: string;
}

export interface LayoutSnapshot {
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: LayoutNode[];
}

// =============================================================================
// RATIO DEFINITIONS
// =============================================================================

export interface RatioDefinition {
  name: string;
  ratio: number;
  description: string;
  commonUse: string;
}

export const KNOWN_RATIOS: RatioDefinition[] = [
  { name: 'golden', ratio: 1.618, description: 'Golden Ratio (φ)', commonUse: 'Classical harmony, nature' },
  { name: 'golden-inverse', ratio: 0.618, description: 'Golden Ratio inverse', commonUse: 'Column splits' },
  { name: 'rule-of-thirds', ratio: 0.333, description: 'Rule of Thirds', commonUse: 'Photography, web layouts' },
  { name: 'two-thirds', ratio: 0.667, description: 'Two Thirds', commonUse: 'Sidebar layouts' },
  { name: '2:3', ratio: 1.5, description: '2:3 Ratio', commonUse: 'Print, cards' },
  { name: '3:4', ratio: 1.333, description: '3:4 Ratio', commonUse: 'Traditional photos' },
  { name: '4:3', ratio: 0.75, description: '4:3 Ratio', commonUse: 'Traditional displays' },
  { name: '16:9', ratio: 1.778, description: '16:9 Widescreen', commonUse: 'Video, modern displays' },
  { name: '21:9', ratio: 2.333, description: '21:9 Ultrawide', commonUse: 'Cinematic, hero sections' },
  { name: 'square', ratio: 1.0, description: 'Square (1:1)', commonUse: 'Icons, avatars, thumbnails' },
];

// =============================================================================
// ANALYSIS OUTPUT TYPES
// =============================================================================

export type ObservationType = 'info' | 'suggestion' | 'warning';

export interface Observation {
  type: ObservationType;
  message: string;
  detail?: string;
  confidence?: number;
}

export interface RatioAnalysis {
  /** The aspect ratio of the analyzed element */
  aspectRatio: number;
  /** Closest known ratio name */
  aspectRatioClosestTo: string;
  /** How close to the matched ratio (0-1) */
  aspectRatioProximity: number;
  /** For layouts with children: the distribution ratio */
  childDistributionClosestTo?: string;
  /** How close the child distribution is to the matched ratio (0-1) */
  childDistributionProximity?: number;
}

export interface ChildProportion {
  id: string;
  name: string;
  width: number;
  height: number;
  area: number;
}

export interface ChildProportions {
  children: ChildProportion[];
  /** Width ratios normalized to sum to 1 */
  widthRatios: number[];
  /** Height ratios normalized to sum to 1 */
  heightRatios: number[];
  /** Total gap between children */
  totalGap: number;
}

export type WeightDistribution = 
  | 'balanced'
  | 'left-heavy'
  | 'right-heavy'
  | 'top-heavy'
  | 'bottom-heavy'
  | 'center-heavy'
  | 'edge-heavy';

export interface VisualWeight {
  /** Weight in left half (0-1) */
  left: number;
  /** Weight in right half (0-1) */
  right: number;
  /** Weight in top half (0-1) */
  top: number;
  /** Weight in bottom half (0-1) */
  bottom: number;
  /** Center of mass as percentage from top-left */
  centerOfMass: { x: number; y: number };
  /** Overall distribution classification */
  distribution: WeightDistribution;
  /** Confidence in the weight calculation (0-1) */
  confidence: number;
}

export interface ProportionAnalysis {
  nodeId: string;
  nodeName?: string;
  bounds: { width: number; height: number };
  ratioAnalysis: RatioAnalysis;
  childProportions?: ChildProportions;
  visualWeight?: VisualWeight;
  observations: Observation[];
}

// =============================================================================
// WHITESPACE ANALYSIS
// =============================================================================

export interface GutterAnalysis {
  horizontal: number[];
  vertical: number[];
  consistency: 'consistent' | 'varied' | 'inconsistent';
  variance: number;
  averageGap: number;
}

export interface WhitespaceAnalysis {
  nodeId: string;
  nodeName?: string;
  padding: { top: number; right: number; bottom: number; left: number };
  contentArea: { width: number; height: number };
  /** Ratio of content to container (0-1) */
  contentDensity: number;
  gutters?: GutterAnalysis;
  observations: Observation[];
}

// =============================================================================
// SUGGESTION TYPES
// =============================================================================

export interface ProportionSuggestion {
  name: string;
  ratio: number;
  adjustedDimensions: { width: number; height: number };
  changeRequired: { widthDelta: number; heightDelta: number };
  /** How well this fits the content (0-1) */
  confidence: number;
}

export interface ProportionSuggestions {
  current: { width: number; height: number };
  suggestions: ProportionSuggestion[];
}

// =============================================================================
// VISUAL WEIGHT FACTORS
// =============================================================================

export interface WeightFactors {
  /** Base weight from area */
  area: number;
  /** Multiplier from estimated text size */
  textWeight: number;
  /** Multiplier from color contrast/saturation */
  colorWeight: number;
  /** Multiplier from element density */
  densityWeight: number;
  /** Combined weight score */
  total: number;
}

export interface ElementWeight {
  id: string;
  name?: string;
  bounds: { x: number; y: number; width: number; height: number };
  factors: WeightFactors;
}
