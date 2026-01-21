/**
 * Main Analysis Functions
 * 
 * Entry points for proportion and balance analysis of .pen file layouts.
 */

import type {
  LayoutNode,
  LayoutSnapshot,
  ProportionAnalysis,
  WhitespaceAnalysis,
  ProportionSuggestions,
  Observation,
  ChildProportions,
  GutterAnalysis,
} from './types';
import { KNOWN_RATIOS } from './types';

import {
  analyzeAspectRatio,
  analyzeChildDistribution,
  isGoldenRatio,
  suggestRatioAdjustment,
  findClosestRatio,
} from './ratios';

import {
  calculateVisualWeight,
  calculateBalanceScore,
  assessIntentionalAsymmetry,
} from './visual-weight';

// =============================================================================
// PROPORTION ANALYSIS
// =============================================================================

/**
 * Analyze proportions of a layout node.
 * 
 * @param layout - The layout snapshot from Pencil's snapshot_layout
 * @param options - Analysis options
 * @returns Comprehensive proportion analysis
 */
export function analyzeProportions(
  layout: LayoutSnapshot,
  options: {
    includeVisualWeight?: boolean;
    depth?: number;
  } = {}
): ProportionAnalysis {
  const { includeVisualWeight = true, depth = 2 } = options;
  
  const observations: Observation[] = [];
  
  // Basic ratio analysis
  const ratioAnalysis = analyzeAspectRatio(layout.width, layout.height);
  
  // Add observation about aspect ratio
  if (ratioAnalysis.aspectRatioProximity > 0.9) {
    observations.push({
      type: 'info',
      message: `Aspect ratio closely matches ${ratioAnalysis.aspectRatioClosestTo}`,
      detail: `${layout.width}×${layout.height} = ${ratioAnalysis.aspectRatio.toFixed(2)} (${Math.round(ratioAnalysis.aspectRatioProximity * 100)}% proximity)`,
      confidence: ratioAnalysis.aspectRatioProximity,
    });
  }
  
  // Child proportion analysis
  let childProportions: ChildProportions | undefined;
  const children = layout.children;
  
  if (children && children.length > 0) {
    const childData = children.map(child => ({
      id: child.id,
      name: child.name || child.id,
      width: child.width,
      height: child.height,
      area: child.width * child.height,
    }));
    
    const widths = children.map(c => c.width);
    const heights = children.map(c => c.height);
    
    const widthAnalysis = analyzeChildDistribution(widths);
    const heightAnalysis = analyzeChildDistribution(heights);
    
    // Calculate total gap (container width - sum of child widths)
    const totalChildWidth = widths.reduce((a, b) => a + b, 0);
    const totalGap = layout.width - totalChildWidth;
    
    childProportions = {
      children: childData,
      widthRatios: widthAnalysis.ratios,
      heightRatios: heightAnalysis.ratios,
      totalGap: Math.max(0, totalGap),
    };
    
    // Add to ratio analysis
    if (widthAnalysis.proximity > 0.8) {
      ratioAnalysis.childDistributionClosestTo = widthAnalysis.closestTo;
      ratioAnalysis.childDistributionProximity = widthAnalysis.proximity;
      
      observations.push({
        type: 'info',
        message: `Column distribution matches ${widthAnalysis.closestTo}`,
        detail: `Width ratios: ${widthAnalysis.ratios.map(r => r.toFixed(3)).join(':')} (${Math.round(widthAnalysis.proximity * 100)}% proximity)`,
        confidence: widthAnalysis.proximity,
      });
    }
    
    // Check for golden ratio specifically
    if (children.length === 2) {
      const ratio = widths[0] / widths[1];
      if (isGoldenRatio(ratio) || isGoldenRatio(1 / ratio)) {
        observations.push({
          type: 'info',
          message: 'Column split closely approximates golden ratio',
          detail: `This creates classical visual harmony. Ratio: ${Math.min(ratio, 1/ratio).toFixed(3)}:${Math.max(ratio, 1/ratio).toFixed(3)}`,
          confidence: 0.95,
        });
      }
    }
  }
  
  // Visual weight analysis
  let visualWeight;
  if (includeVisualWeight && children && children.length > 0) {
    visualWeight = calculateVisualWeight(
      { ...layout, children: undefined } as LayoutNode,
      children
    );
    
    const balanceScore = calculateBalanceScore(visualWeight);
    const asymmetryAssessment = assessIntentionalAsymmetry(children, visualWeight);
    
    if (visualWeight.distribution !== 'balanced') {
      if (asymmetryAssessment.isIntentional) {
        observations.push({
          type: 'info',
          message: `Layout is ${visualWeight.distribution} (intentional)`,
          detail: asymmetryAssessment.reason,
          confidence: 0.8,
        });
      } else {
        observations.push({
          type: 'suggestion',
          message: `Layout appears ${visualWeight.distribution}`,
          detail: `Balance score: ${Math.round(balanceScore * 100)}%. Consider redistributing visual weight.`,
          confidence: visualWeight.confidence,
        });
      }
    } else {
      observations.push({
        type: 'info',
        message: 'Visual weight is well-balanced',
        detail: `Balance score: ${Math.round(balanceScore * 100)}%`,
        confidence: visualWeight.confidence,
      });
    }
  }
  
  // Height asymmetry check for multi-column layouts
  if (children && children.length === 2) {
    const [left, right] = children;
    const heightRatio = Math.max(left.height, right.height) / Math.min(left.height, right.height);
    
    if (heightRatio > 1.5) {
      observations.push({
        type: 'suggestion',
        message: 'Significant height difference between columns',
        detail: `Left: ${left.height}px, Right: ${right.height}px (ratio ${heightRatio.toFixed(2)}:1). This may be intentional for asymmetric balance.`,
        confidence: 0.7,
      });
    }
  }
  
  return {
    nodeId: layout.id,
    nodeName: layout.name,
    bounds: { width: layout.width, height: layout.height },
    ratioAnalysis,
    childProportions,
    visualWeight,
    observations,
  };
}

// =============================================================================
// WHITESPACE ANALYSIS
// =============================================================================

/**
 * Analyze whitespace distribution within a container.
 */
export function analyzeWhitespace(
  layout: LayoutSnapshot,
  options: {
    includeGutters?: boolean;
  } = {}
): WhitespaceAnalysis {
  const { includeGutters = true } = options;
  const observations: Observation[] = [];
  
  const children = layout.children || [];
  
  // Calculate padding (space from edges to first/last children)
  let padding = { top: 0, right: 0, bottom: 0, left: 0 };
  
  if (children.length > 0) {
    const minX = Math.min(...children.map(c => c.x));
    const maxX = Math.max(...children.map(c => c.x + c.width));
    const minY = Math.min(...children.map(c => c.y));
    const maxY = Math.max(...children.map(c => c.y + c.height));
    
    padding = {
      top: minY,
      right: layout.width - maxX,
      bottom: layout.height - maxY,
      left: minX,
    };
  }
  
  // Calculate content area
  const contentArea = {
    width: layout.width - padding.left - padding.right,
    height: layout.height - padding.top - padding.bottom,
  };
  
  // Calculate content density
  const totalChildArea = children.reduce((sum, c) => sum + c.width * c.height, 0);
  const containerArea = layout.width * layout.height;
  const contentDensity = containerArea > 0 ? totalChildArea / containerArea : 0;
  
  // Gutter analysis
  let gutters;
  if (includeGutters && children.length > 1) {
    // Sort children by position to find gaps
    const byX = [...children].sort((a, b) => a.x - b.x);
    const byY = [...children].sort((a, b) => a.y - b.y);
    
    const horizontalGaps: number[] = [];
    const verticalGaps: number[] = [];
    
    for (let i = 1; i < byX.length; i++) {
      const gap = byX[i].x - (byX[i-1].x + byX[i-1].width);
      if (gap > 0) horizontalGaps.push(gap);
    }
    
    for (let i = 1; i < byY.length; i++) {
      const gap = byY[i].y - (byY[i-1].y + byY[i-1].height);
      if (gap > 0) verticalGaps.push(gap);
    }
    
    const allGaps = [...horizontalGaps, ...verticalGaps];
    const avgGap = allGaps.length > 0 
      ? allGaps.reduce((a, b) => a + b, 0) / allGaps.length 
      : 0;
    
    // Calculate variance
    const variance = allGaps.length > 0
      ? allGaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / allGaps.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgGap > 0 ? stdDev / avgGap : 0;
    
    const consistency: GutterAnalysis['consistency'] = coefficientOfVariation < 0.1 
      ? 'consistent' 
      : coefficientOfVariation < 0.3 
        ? 'varied' 
        : 'inconsistent';
    
    gutters = {
      horizontal: horizontalGaps,
      vertical: verticalGaps,
      consistency,
      variance,
      averageGap: avgGap,
    };
    
    // Add observations about spacing
    if (consistency === 'consistent') {
      observations.push({
        type: 'info',
        message: 'Consistent spacing throughout',
        detail: `Average gap: ${avgGap.toFixed(1)}px with low variance`,
        confidence: 0.9,
      });
    } else if (consistency === 'inconsistent') {
      observations.push({
        type: 'suggestion',
        message: 'Inconsistent spacing detected',
        detail: `Gap variance is high (${stdDev.toFixed(1)}px std dev). Consider standardizing spacing.`,
        confidence: 0.75,
      });
    }
  }
  
  // Density observations
  if (contentDensity > 0.8) {
    observations.push({
      type: 'suggestion',
      message: 'High content density',
      detail: `${Math.round(contentDensity * 100)}% of container filled. Consider adding more breathing room.`,
      confidence: 0.7,
    });
  } else if (contentDensity < 0.3) {
    observations.push({
      type: 'info',
      message: 'Spacious layout',
      detail: `${Math.round(contentDensity * 100)}% content density provides good breathing room.`,
      confidence: 0.7,
    });
  }
  
  // Padding symmetry check
  const horizontalPaddingDiff = Math.abs(padding.left - padding.right);
  const verticalPaddingDiff = Math.abs(padding.top - padding.bottom);
  
  if (horizontalPaddingDiff > 10 && padding.left > 0 && padding.right > 0) {
    observations.push({
      type: 'suggestion',
      message: 'Asymmetric horizontal padding',
      detail: `Left: ${padding.left}px, Right: ${padding.right}px. Consider equalizing for symmetry.`,
      confidence: 0.6,
    });
  }
  
  return {
    nodeId: layout.id,
    nodeName: layout.name,
    padding,
    contentArea,
    contentDensity,
    gutters,
    observations,
  };
}

// =============================================================================
// PROPORTION SUGGESTIONS
// =============================================================================

/**
 * Suggest proportion adjustments for a layout.
 */
export function suggestProportions(
  layout: LayoutSnapshot,
  options: {
    targetStyles?: ('golden' | 'thirds' | 'quarters' | 'widescreen')[];
    preserveWidth?: boolean;
  } = {}
): ProportionSuggestions {
  const { 
    targetStyles = ['golden', 'thirds', 'widescreen'],
    preserveWidth = true 
  } = options;
  
  const current = { width: layout.width, height: layout.height };
  const suggestions = [];
  
  const styleRatios: Record<string, number> = {
    golden: 1.618,
    thirds: 1.5,
    quarters: 1.333,
    widescreen: 1.778,
    square: 1.0,
  };
  
  for (const style of targetStyles) {
    const targetRatio = styleRatios[style];
    if (!targetRatio) continue;
    
    const adjusted = suggestRatioAdjustment(
      current.width,
      current.height,
      targetRatio,
      preserveWidth
    );
    
    const changeRequired = {
      widthDelta: adjusted.width - current.width,
      heightDelta: adjusted.height - current.height,
    };
    
    // Calculate confidence based on how much change is needed
    const changePercent = Math.abs(changeRequired.heightDelta) / current.height;
    const confidence = Math.max(0, 1 - changePercent);
    
    suggestions.push({
      name: `${style.charAt(0).toUpperCase() + style.slice(1)} Ratio`,
      ratio: targetRatio,
      adjustedDimensions: {
        width: Math.round(adjusted.width),
        height: Math.round(adjusted.height),
      },
      changeRequired: {
        widthDelta: Math.round(changeRequired.widthDelta),
        heightDelta: Math.round(changeRequired.heightDelta),
      },
      confidence,
    });
  }
  
  // Sort by confidence (least change needed first)
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  return { current, suggestions };
}

// =============================================================================
// BATCH ANALYSIS
// =============================================================================

/**
 * Analyze multiple nodes at once for comparison.
 */
export function analyzeMultiple(
  layouts: LayoutSnapshot[]
): {
  analyses: ProportionAnalysis[];
  comparison: {
    mostBalanced: string;
    leastBalanced: string;
    averageBalanceScore: number;
  };
} {
  const analyses = layouts.map(layout => analyzeProportions(layout));
  
  // Calculate balance scores
  const scores = analyses.map(a => ({
    id: a.nodeId,
    score: a.visualWeight ? calculateBalanceScore(a.visualWeight) : 0.5,
  }));
  
  scores.sort((a, b) => b.score - a.score);
  
  return {
    analyses,
    comparison: {
      mostBalanced: scores[0]?.id || '',
      leastBalanced: scores[scores.length - 1]?.id || '',
      averageBalanceScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
    },
  };
}
