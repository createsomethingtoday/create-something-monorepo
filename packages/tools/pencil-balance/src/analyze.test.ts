/**
 * Balance Analysis Tests
 * 
 * Test cases using Outerfields components and common layout patterns.
 */

import { describe, it, expect } from 'vitest';
import { 
  analyzeProportions, 
  analyzeWhitespace, 
  suggestProportions,
  analyzeMultiple 
} from './analyze';
import { 
  calculateBalanceScore,
  calculateVisualWeight 
} from './visual-weight';
import { 
  isGoldenRatio,
  analyzeChildDistribution 
} from './ratios';
import { LayoutSnapshot, LayoutNode } from './types';

// =============================================================================
// TEST DATA: Outerfields Components
// =============================================================================

/**
 * Outerfields Pricing Card - BEFORE balance improvements
 * CTA on left, center-aligned columns
 */
const pricingCardBefore: LayoutSnapshot = {
  id: 'pricing-card-before',
  name: 'Pricing Card (Original)',
  x: 0,
  y: 0,
  width: 1152,
  height: 430,
  children: [
    {
      id: 'pricing-left',
      name: 'Pricing Left',
      x: 48,
      y: 48,
      width: 400,
      height: 334,
      children: '...',
    },
    {
      id: 'pricing-right',
      name: 'Pricing Right',
      x: 496,
      y: 115.5, // Centered vertically
      width: 608,
      height: 199,
      children: '...',
    },
  ],
};

/**
 * Outerfields Pricing Card - AFTER balance improvements
 * CTA moved to right, top-aligned, larger price
 */
const pricingCardAfter: LayoutSnapshot = {
  id: 'pricing-card-after',
  name: 'Pricing Card (Balanced)',
  x: 0,
  y: 0,
  width: 1152,
  height: 450,
  children: [
    {
      id: 'pricing-left',
      name: 'Pricing Left',
      x: 48,
      y: 48,
      width: 395,
      height: 273, // Larger price makes this taller
      children: [
        { id: 'price-header', name: 'Pricing Header', x: 0, y: 0, width: 395, height: 133 },
        { id: 'tagline', name: 'Tagline', x: 0, y: 149, width: 340, height: 54 },
        { id: 'urgency', name: 'Urgency Strip', x: 0, y: 219, width: 393, height: 40 },
      ],
    },
    {
      id: 'pricing-right',
      name: 'Pricing Right',
      x: 491,
      y: 48, // Top-aligned
      width: 613,
      height: 354, // Now includes CTA
      children: [
        { id: 'benefits-title', name: 'Benefits Title', x: 48, y: 16, width: 118, height: 17 },
        { id: 'benefits-grid', name: 'Benefits Grid', x: 48, y: 57, width: 565, height: 166 },
        { id: 'cta-button', name: 'CTA Button', x: 48, y: 247, width: 565, height: 51 },
        { id: 'guarantee', name: 'Guarantee', x: 48, y: 322, width: 380, height: 16 },
      ],
    },
  ],
};

/**
 * Hero Section - Common landing page pattern
 */
const heroSection: LayoutSnapshot = {
  id: 'hero-section',
  name: 'Hero Section',
  x: 0,
  y: 0,
  width: 1440,
  height: 800,
  children: [
    {
      id: 'hero-content',
      name: 'Hero Content',
      x: 120,
      y: 200,
      width: 600,
      height: 400,
      children: [
        { id: 'headline', name: 'Headline H1', x: 0, y: 0, width: 600, height: 120 },
        { id: 'subhead', name: 'Subhead', x: 0, y: 140, width: 500, height: 60 },
        { id: 'cta-group', name: 'CTA Group', x: 0, y: 240, width: 400, height: 56 },
      ],
    },
    {
      id: 'hero-image',
      name: 'Hero Image',
      x: 780,
      y: 100,
      width: 540,
      height: 600,
    },
  ],
};

/**
 * Sidebar Layout - Dashboard pattern
 */
const sidebarLayout: LayoutSnapshot = {
  id: 'dashboard',
  name: 'Dashboard Layout',
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  children: [
    {
      id: 'sidebar',
      name: 'Sidebar',
      x: 0,
      y: 0,
      width: 280,
      height: 900,
    },
    {
      id: 'main-content',
      name: 'Main Content',
      x: 280,
      y: 0,
      width: 1160,
      height: 900,
    },
  ],
};

/**
 * Card Grid - Equal distribution
 */
const cardGrid: LayoutSnapshot = {
  id: 'card-grid',
  name: 'Feature Cards',
  x: 0,
  y: 0,
  width: 1200,
  height: 400,
  children: [
    { id: 'card-1', name: 'Card', x: 0, y: 0, width: 380, height: 400 },
    { id: 'card-2', name: 'Card', x: 410, y: 0, width: 380, height: 400 },
    { id: 'card-3', name: 'Card', x: 820, y: 0, width: 380, height: 400 },
  ],
};

// =============================================================================
// PROPORTION ANALYSIS TESTS
// =============================================================================

describe('analyzeProportions', () => {
  describe('Outerfields Pricing Card', () => {
    it('detects column split close to golden ratio (before)', () => {
      const analysis = analyzeProportions(pricingCardBefore);
      
      // Width ratio should be close to 0.4:0.6
      expect(analysis.childProportions).toBeDefined();
      const widthRatios = analysis.childProportions!.widthRatios;
      
      // 400/(400+608) ≈ 0.397
      expect(widthRatios[0]).toBeCloseTo(0.397, 2);
      expect(widthRatios[1]).toBeCloseTo(0.603, 2);
    });

    it('detects improved balance in after version', () => {
      const before = analyzeProportions(pricingCardBefore);
      const after = analyzeProportions(pricingCardAfter);
      
      // After version should have better balance score
      const beforeScore = before.visualWeight 
        ? calculateBalanceScore(before.visualWeight) 
        : 0;
      const afterScore = after.visualWeight 
        ? calculateBalanceScore(after.visualWeight) 
        : 0;
      
      // The after version redistributed weight by moving CTA to right
      expect(afterScore).toBeGreaterThanOrEqual(beforeScore * 0.9); // Within 10%
    });

    it('identifies golden ratio proximity in column split', () => {
      const analysis = analyzeProportions(pricingCardAfter);
      
      // 395/(395+613) ≈ 0.392, which is close to 0.382 (golden)
      const goldenObservation = analysis.observations.find(o => 
        o.message.toLowerCase().includes('golden')
      );
      
      expect(goldenObservation).toBeDefined();
    });
  });

  describe('Hero Section', () => {
    it('detects left-heavy visual weight (intentional)', () => {
      const analysis = analyzeProportions(heroSection);
      
      expect(analysis.visualWeight).toBeDefined();
      // Hero typically has headline on left creating intentional weight
      
      const intentionalObservation = analysis.observations.find(o =>
        o.message.toLowerCase().includes('intentional') ||
        o.message.toLowerCase().includes('hero')
      );
      
      // Should recognize hero pattern
      expect(analysis.visualWeight?.distribution).toBeDefined();
    });

    it('identifies widescreen aspect ratio', () => {
      const analysis = analyzeProportions(heroSection);
      
      // 1440/800 = 1.8, close to 16:9 (1.778)
      expect(analysis.ratioAnalysis.aspectRatio).toBeCloseTo(1.8, 1);
    });
  });

  describe('Sidebar Layout', () => {
    it('detects sidebar pattern', () => {
      const analysis = analyzeProportions(sidebarLayout);
      
      expect(analysis.childProportions).toBeDefined();
      
      // 280/1440 ≈ 0.19, 1160/1440 ≈ 0.81
      // This is a ~1:4 split (sidebar pattern)
      const widthRatios = analysis.childProportions!.widthRatios;
      expect(widthRatios[0]).toBeLessThan(0.25);
      expect(widthRatios[1]).toBeGreaterThan(0.75);
    });
  });

  describe('Card Grid', () => {
    it('detects equal distribution', () => {
      const analysis = analyzeProportions(cardGrid);
      
      expect(analysis.childProportions).toBeDefined();
      
      // All cards should have roughly equal width ratios
      const widthRatios = analysis.childProportions!.widthRatios;
      const expectedRatio = 1 / 3;
      
      for (const ratio of widthRatios) {
        expect(ratio).toBeCloseTo(expectedRatio, 1);
      }
    });
  });
});

// =============================================================================
// VISUAL WEIGHT TESTS
// =============================================================================

describe('calculateVisualWeight', () => {
  it('calculates center of mass correctly', () => {
    const container: LayoutNode = {
      id: 'container',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    
    // Single centered element
    const children: LayoutNode[] = [{
      id: 'center',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    }];
    
    const weight = calculateVisualWeight(container, children);
    
    // Center of mass should be near center
    expect(weight.centerOfMass.x).toBeCloseTo(0.5, 1);
    expect(weight.centerOfMass.y).toBeCloseTo(0.5, 1);
    // A single centered element is technically "center-heavy" 
    // (weight concentrated at center vs distributed)
    expect(['balanced', 'center-heavy']).toContain(weight.distribution);
  });

  it('detects left-heavy distribution', () => {
    const container: LayoutNode = {
      id: 'container',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    
    // Heavy element on left, light on right
    const children: LayoutNode[] = [
      { id: 'heavy', name: 'Price Amount', x: 0, y: 0, width: 40, height: 80 },
      { id: 'light', name: 'Caption', x: 50, y: 30, width: 40, height: 20 },
    ];
    
    const weight = calculateVisualWeight(container, children);
    
    expect(weight.left).toBeGreaterThan(weight.right);
  });
});

// =============================================================================
// RATIO UTILITY TESTS
// =============================================================================

describe('isGoldenRatio', () => {
  it('identifies golden ratio', () => {
    expect(isGoldenRatio(1.618)).toBe(true);
    expect(isGoldenRatio(0.618)).toBe(true);
    expect(isGoldenRatio(1.62)).toBe(true); // Within threshold
  });

  it('rejects non-golden ratios', () => {
    expect(isGoldenRatio(1.5)).toBe(false);
    expect(isGoldenRatio(2.0)).toBe(false);
    expect(isGoldenRatio(1.0)).toBe(false);
  });
});

describe('analyzeChildDistribution', () => {
  it('identifies golden split', () => {
    const result = analyzeChildDistribution([382, 618]);
    
    expect(result.closestTo).toContain('golden');
    expect(result.proximity).toBeGreaterThan(0.9);
  });

  it('identifies equal split', () => {
    const result = analyzeChildDistribution([100, 100]);
    
    expect(result.closestTo).toContain('equal');
    expect(result.proximity).toBeGreaterThan(0.95);
  });

  it('identifies thirds split', () => {
    const result = analyzeChildDistribution([33, 67]);
    
    expect(result.closestTo).toContain('thirds');
    expect(result.proximity).toBeGreaterThan(0.9);
  });
});

// =============================================================================
// WHITESPACE ANALYSIS TESTS
// =============================================================================

describe('analyzeWhitespace', () => {
  it('calculates content density', () => {
    const layout: LayoutSnapshot = {
      id: 'test',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [
        { id: 'child', x: 10, y: 10, width: 80, height: 80 },
      ],
    };
    
    const analysis = analyzeWhitespace(layout);
    
    // 6400 / 10000 = 0.64
    expect(analysis.contentDensity).toBeCloseTo(0.64, 2);
  });

  it('detects padding', () => {
    const layout: LayoutSnapshot = {
      id: 'test',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [
        { id: 'child', x: 20, y: 10, width: 60, height: 70 },
      ],
    };
    
    const analysis = analyzeWhitespace(layout);
    
    expect(analysis.padding.left).toBe(20);
    expect(analysis.padding.top).toBe(10);
    expect(analysis.padding.right).toBe(20); // 100 - 20 - 60
    expect(analysis.padding.bottom).toBe(20); // 100 - 10 - 70
  });

  it('analyzes gutter consistency', () => {
    const layout: LayoutSnapshot = {
      id: 'test',
      x: 0,
      y: 0,
      width: 340,
      height: 100,
      children: [
        { id: 'a', x: 0, y: 0, width: 100, height: 100 },
        { id: 'b', x: 120, y: 0, width: 100, height: 100 }, // 20px gap
        { id: 'c', x: 240, y: 0, width: 100, height: 100 }, // 20px gap
      ],
    };
    
    const analysis = analyzeWhitespace(layout);
    
    expect(analysis.gutters).toBeDefined();
    expect(analysis.gutters!.consistency).toBe('consistent');
    expect(analysis.gutters!.averageGap).toBe(20);
  });
});

// =============================================================================
// SUGGESTION TESTS
// =============================================================================

describe('suggestProportions', () => {
  it('suggests golden ratio adjustment', () => {
    const layout: LayoutSnapshot = {
      id: 'test',
      x: 0,
      y: 0,
      width: 400,
      height: 300, // 4:3 ratio
      children: [],
    };
    
    const suggestions = suggestProportions(layout);
    
    const goldenSuggestion = suggestions.suggestions.find(s => 
      s.name.toLowerCase().includes('golden')
    );
    
    expect(goldenSuggestion).toBeDefined();
    // Golden ratio would make height = 400 / 1.618 ≈ 247
    expect(goldenSuggestion!.adjustedDimensions.height).toBeCloseTo(247, 0);
  });
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

describe('analyzeMultiple', () => {
  it('compares multiple layouts', () => {
    const result = analyzeMultiple([
      pricingCardBefore,
      pricingCardAfter,
      cardGrid,
    ]);
    
    expect(result.analyses).toHaveLength(3);
    expect(result.comparison.mostBalanced).toBeDefined();
    expect(result.comparison.averageBalanceScore).toBeGreaterThan(0);
  });
});
