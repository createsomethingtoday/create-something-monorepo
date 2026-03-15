/**
 * Visual Weight Heuristics
 * 
 * Sophisticated algorithms for estimating visual weight of UI elements.
 * 
 * Visual weight is influenced by:
 * 1. Area - Larger elements have more weight
 * 2. Density - More content packed in creates more weight
 * 3. Position - Elements closer to edges can feel heavier
 * 4. Contrast - Higher contrast elements draw more attention
 * 5. Typography - Larger/bolder text has more weight
 * 6. Color saturation - More saturated colors feel heavier
 * 
 * Note: Since we only have layout data (not styles), we use heuristics
 * based on structure and naming conventions.
 */

import type { 
  LayoutNode, 
  VisualWeight, 
  WeightDistribution,
  ElementWeight,
  WeightFactors
} from './types';

// =============================================================================
// WEIGHT FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate base weight from area relative to container.
 */
export function calculateAreaWeight(
  elementWidth: number,
  elementHeight: number,
  containerWidth: number,
  containerHeight: number
): number {
  const elementArea = elementWidth * elementHeight;
  const containerArea = containerWidth * containerHeight;
  
  if (containerArea === 0) return 0;
  
  // Normalize to 0-1 range with square root to reduce dominance of large elements
  return Math.sqrt(elementArea / containerArea);
}

/**
 * Estimate text weight from node name/type heuristics.
 * Higher values for names suggesting large/bold text.
 */
export function estimateTextWeight(name?: string): number {
  if (!name) return 1.0;
  
  const lowerName = name.toLowerCase();
  
  // Very heavy text indicators
  if (lowerName.includes('price') || lowerName.includes('amount')) return 2.5;
  if (lowerName.includes('h1') || lowerName.includes('heading')) return 2.0;
  if (lowerName.includes('title') || lowerName.includes('headline')) return 1.8;
  
  // Medium weight indicators
  if (lowerName.includes('h2') || lowerName.includes('subhead')) return 1.5;
  if (lowerName.includes('h3')) return 1.3;
  if (lowerName.includes('button') || lowerName.includes('cta')) return 1.4;
  if (lowerName.includes('badge') || lowerName.includes('tag')) return 1.2;
  
  // Light weight indicators
  if (lowerName.includes('caption') || lowerName.includes('note')) return 0.7;
  if (lowerName.includes('muted') || lowerName.includes('subtle')) return 0.6;
  if (lowerName.includes('meta') || lowerName.includes('small')) return 0.8;
  
  return 1.0;
}

/**
 * Estimate density weight based on child count and arrangement.
 */
export function estimateDensityWeight(
  children: LayoutNode[] | '...' | undefined,
  containerWidth: number,
  containerHeight: number
): number {
  if (!children || children === '...') return 1.0;
  
  const childCount = children.length;
  if (childCount === 0) return 0.5; // Empty containers feel lighter
  
  // Calculate total child area
  const totalChildArea = children.reduce((sum, child) => {
    return sum + (child.width * child.height);
  }, 0);
  
  const containerArea = containerWidth * containerHeight;
  if (containerArea === 0) return 1.0;
  
  // Density ratio (can exceed 1 if children overlap)
  const density = totalChildArea / containerArea;
  
  // High density = more visual weight
  // Map density to weight multiplier (0.5 to 2.0 range)
  return 0.5 + Math.min(density, 1.5);
}

/**
 * Estimate weight from element type based on naming conventions.
 */
export function estimateTypeWeight(name?: string): number {
  if (!name) return 1.0;
  
  const lowerName = name.toLowerCase();
  
  // Heavy elements
  if (lowerName.includes('image') || lowerName.includes('hero')) return 1.5;
  if (lowerName.includes('card')) return 1.3;
  if (lowerName.includes('icon') && !lowerName.includes('small')) return 1.2;
  
  // Light elements
  if (lowerName.includes('divider') || lowerName.includes('spacer')) return 0.3;
  if (lowerName.includes('border') || lowerName.includes('stroke')) return 0.4;
  
  return 1.0;
}

/**
 * Calculate comprehensive weight factors for an element.
 */
export function calculateWeightFactors(
  node: LayoutNode,
  containerWidth: number,
  containerHeight: number
): WeightFactors {
  const area = calculateAreaWeight(node.width, node.height, containerWidth, containerHeight);
  const textWeight = estimateTextWeight(node.name);
  const densityWeight = estimateDensityWeight(node.children, node.width, node.height);
  const typeWeight = estimateTypeWeight(node.name);
  
  // Combine factors with appropriate weights
  const total = area * textWeight * densityWeight * typeWeight;
  
  return {
    area,
    textWeight,
    colorWeight: 1.0, // Would need style data to calculate
    densityWeight,
    total,
  };
}

// =============================================================================
// WEIGHT DISTRIBUTION CALCULATION
// =============================================================================

/**
 * Calculate visual weight distribution across a container.
 */
export function calculateVisualWeight(
  container: LayoutNode,
  children: LayoutNode[]
): VisualWeight {
  const { width: containerW, height: containerH } = container;
  
  if (children.length === 0) {
    return {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      centerOfMass: { x: 0.5, y: 0.5 },
      distribution: 'balanced',
      confidence: 0.5,
    };
  }
  
  // Calculate weight for each child
  const weights: ElementWeight[] = children.map(child => ({
    id: child.id,
    name: child.name,
    bounds: { x: child.x, y: child.y, width: child.width, height: child.height },
    factors: calculateWeightFactors(child, containerW, containerH),
  }));
  
  // Calculate total weight
  const totalWeight = weights.reduce((sum, w) => sum + w.factors.total, 0);
  
  if (totalWeight === 0) {
    return {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      centerOfMass: { x: 0.5, y: 0.5 },
      distribution: 'balanced',
      confidence: 0.3,
    };
  }
  
  // Calculate center of mass
  let weightedX = 0;
  let weightedY = 0;
  
  for (const w of weights) {
    const centerX = (w.bounds.x + w.bounds.width / 2) / containerW;
    const centerY = (w.bounds.y + w.bounds.height / 2) / containerH;
    weightedX += centerX * w.factors.total;
    weightedY += centerY * w.factors.total;
  }
  
  const centerOfMass = {
    x: weightedX / totalWeight,
    y: weightedY / totalWeight,
  };
  
  // Calculate weight in each half
  let leftWeight = 0;
  let rightWeight = 0;
  let topWeight = 0;
  let bottomWeight = 0;
  
  for (const w of weights) {
    const centerX = w.bounds.x + w.bounds.width / 2;
    const centerY = w.bounds.y + w.bounds.height / 2;
    
    // Distribute weight based on center position
    const leftRatio = Math.max(0, 1 - (centerX / (containerW / 2)));
    const rightRatio = Math.max(0, (centerX / (containerW / 2)) - 1);
    const topRatio = Math.max(0, 1 - (centerY / (containerH / 2)));
    const bottomRatio = Math.max(0, (centerY / (containerH / 2)) - 1);
    
    // Elements in the middle contribute to both sides
    const middleX = 1 - leftRatio - rightRatio;
    const middleY = 1 - topRatio - bottomRatio;
    
    leftWeight += w.factors.total * (leftRatio + middleX * 0.5);
    rightWeight += w.factors.total * (rightRatio + middleX * 0.5);
    topWeight += w.factors.total * (topRatio + middleY * 0.5);
    bottomWeight += w.factors.total * (bottomRatio + middleY * 0.5);
  }
  
  // Normalize to 0-1 range
  const horizontalTotal = leftWeight + rightWeight;
  const verticalTotal = topWeight + bottomWeight;
  
  const left = horizontalTotal > 0 ? leftWeight / horizontalTotal : 0.5;
  const right = horizontalTotal > 0 ? rightWeight / horizontalTotal : 0.5;
  const top = verticalTotal > 0 ? topWeight / verticalTotal : 0.5;
  const bottom = verticalTotal > 0 ? bottomWeight / verticalTotal : 0.5;
  
  // Determine distribution type
  const distribution = classifyDistribution(left, right, top, bottom, centerOfMass);
  
  // Confidence based on how much data we have
  const confidence = Math.min(1, 0.5 + (weights.length * 0.1));
  
  return {
    left,
    right,
    top,
    bottom,
    centerOfMass,
    distribution,
    confidence,
  };
}

/**
 * Classify the weight distribution pattern.
 */
function classifyDistribution(
  left: number,
  right: number,
  top: number,
  bottom: number,
  centerOfMass: { x: number; y: number }
): WeightDistribution {
  const horizontalImbalance = Math.abs(left - right);
  const verticalImbalance = Math.abs(top - bottom);
  
  const THRESHOLD = 0.15; // 15% difference to consider imbalanced
  
  // Check for significant horizontal imbalance
  if (horizontalImbalance > THRESHOLD) {
    if (left > right) return 'left-heavy';
    return 'right-heavy';
  }
  
  // Check for significant vertical imbalance
  if (verticalImbalance > THRESHOLD) {
    if (top > bottom) return 'top-heavy';
    return 'bottom-heavy';
  }
  
  // Check center of mass for center/edge heavy
  const centerDeviation = Math.sqrt(
    Math.pow(centerOfMass.x - 0.5, 2) + 
    Math.pow(centerOfMass.y - 0.5, 2)
  );
  
  if (centerDeviation < 0.1) return 'center-heavy';
  if (centerDeviation > 0.3) return 'edge-heavy';
  
  return 'balanced';
}

// =============================================================================
// BALANCE SCORING
// =============================================================================

/**
 * Calculate an overall balance score (0-1).
 * 1.0 = perfectly balanced, 0.0 = extremely imbalanced
 */
export function calculateBalanceScore(weight: VisualWeight): number {
  // Horizontal balance (how close left/right are to 0.5 each)
  const horizontalScore = 1 - Math.abs(weight.left - weight.right);
  
  // Vertical balance
  const verticalScore = 1 - Math.abs(weight.top - weight.bottom);
  
  // Center of mass score (how close to center)
  const comDeviation = Math.sqrt(
    Math.pow(weight.centerOfMass.x - 0.5, 2) +
    Math.pow(weight.centerOfMass.y - 0.5, 2)
  );
  const comScore = 1 - Math.min(comDeviation * 2, 1);
  
  // Weighted combination
  return (horizontalScore * 0.4 + verticalScore * 0.3 + comScore * 0.3);
}

/**
 * Check if visual weight is intentionally asymmetric vs accidentally imbalanced.
 * Uses heuristics based on common design patterns.
 */
export function assessIntentionalAsymmetry(
  children: LayoutNode[],
  weight: VisualWeight
): { isIntentional: boolean; reason?: string } {
  // Pattern 1: Two-column with heavy element on one side
  if (children.length === 2) {
    const [left, right] = children;
    const leftArea = left.width * left.height;
    const rightArea = right.width * right.height;
    const areaRatio = Math.max(leftArea, rightArea) / Math.min(leftArea, rightArea);
    
    // If area ratio is close to golden ratio, likely intentional
    if (areaRatio > 1.4 && areaRatio < 1.8) {
      return { 
        isIntentional: true, 
        reason: 'Two-column layout with golden ratio proportions' 
      };
    }
  }
  
  // Pattern 2: Sidebar layout (one narrow, one wide)
  if (children.length === 2) {
    const widths = children.map(c => c.width).sort((a, b) => a - b);
    const widthRatio = widths[1] / widths[0];
    
    if (widthRatio > 2.5 && widthRatio < 5) {
      return {
        isIntentional: true,
        reason: 'Sidebar layout pattern detected'
      };
    }
  }
  
  // Pattern 3: Hero with heavy headline
  const hasHeroIndicator = children.some(c => 
    c.name?.toLowerCase().includes('hero') ||
    c.name?.toLowerCase().includes('headline') ||
    c.name?.toLowerCase().includes('price')
  );
  
  if (hasHeroIndicator && weight.distribution !== 'balanced') {
    return {
      isIntentional: true,
      reason: 'Hero/headline element creating intentional focal point'
    };
  }
  
  return { isIntentional: false };
}
