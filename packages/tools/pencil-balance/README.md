# @create-something/pencil-balance

Visual balance and proportion analysis for Pencil `.pen` files.

## Overview

This library analyzes layout data from Pencil MCP's `snapshot_layout` to provide:

- **Proportion Analysis** - Detect golden ratio, rule of thirds, and other common proportions
- **Visual Weight Estimation** - Heuristic-based calculation of element visual weight
- **Balance Assessment** - Identify intentional asymmetry vs. accidental imbalance
- **Whitespace Analysis** - Check spacing consistency and content density
- **Suggestions** - Recommend proportion adjustments

## Installation

```bash
pnpm add @create-something/pencil-balance
```

## Usage

### Basic Proportion Analysis

```typescript
import { analyzeProportions } from '@create-something/pencil-balance';

// Get layout from Pencil MCP
const layout = await pencilMCP.snapshot_layout({ 
  nodeId: 'pricing-card',
  maxDepth: 2 
});

const analysis = analyzeProportions(layout);

console.log(analysis.ratioAnalysis);
// {
//   aspectRatio: 2.68,
//   aspectRatioClosestTo: '21:9 ultrawide',
//   aspectRatioProximity: 0.87,
//   childDistributionClosestTo: 'golden (φ)',
//   childDistributionProximity: 0.96
// }

console.log(analysis.observations);
// [
//   { type: 'info', message: 'Column split closely approximates golden ratio', ... },
//   { type: 'info', message: 'Visual weight is well-balanced', ... }
// ]
```

### Visual Weight Analysis

```typescript
import { calculateVisualWeight, calculateBalanceScore } from '@create-something/pencil-balance';

const weight = analysis.visualWeight;
// {
//   left: 0.55,
//   right: 0.45,
//   top: 0.35,
//   bottom: 0.65,
//   centerOfMass: { x: 0.48, y: 0.52 },
//   distribution: 'balanced',
//   confidence: 0.8
// }

const score = calculateBalanceScore(weight);
// 0.87 (87% balanced)
```

### Whitespace Analysis

```typescript
import { analyzeWhitespace } from '@create-something/pencil-balance';

const whitespace = analyzeWhitespace(layout);

console.log(whitespace.gutters);
// {
//   horizontal: [24, 24, 24],
//   vertical: [16, 16],
//   consistency: 'consistent',
//   averageGap: 22
// }

console.log(whitespace.contentDensity);
// 0.64 (64% of container filled)
```

### Proportion Suggestions

```typescript
import { suggestProportions } from '@create-something/pencil-balance';

const suggestions = suggestProportions(layout, {
  targetStyles: ['golden', 'widescreen'],
  preserveWidth: true
});

// [
//   { name: 'Golden Ratio', adjustedDimensions: { width: 1152, height: 712 }, ... },
//   { name: 'Widescreen', adjustedDimensions: { width: 1152, height: 648 }, ... }
// ]
```

## Visual Weight Heuristics

Since we only have layout data (not styles), visual weight is estimated using heuristics:

| Factor | Description | Impact |
|--------|-------------|--------|
| **Area** | Larger elements have more weight | Base weight |
| **Name patterns** | "price", "h1", "headline" → heavy | 1.5-2.5x multiplier |
| **Child density** | More children → more visual mass | 0.5-2.0x multiplier |
| **Type patterns** | "image", "hero" → heavy; "divider" → light | 0.3-1.5x multiplier |

### Recognized Patterns

The library recognizes these intentional asymmetry patterns:

- **Golden ratio splits** (~0.382:0.618)
- **Sidebar layouts** (narrow + wide)
- **Hero sections** (heavy headline on one side)
- **Pricing cards** (heavy price + distributed benefits)

## Known Ratios

| Name | Ratio | Common Use |
|------|-------|------------|
| Golden (φ) | 1.618 | Classical harmony |
| Rule of thirds | 0.333 / 0.667 | Photography |
| 2:3 | 1.5 | Print, cards |
| 16:9 | 1.778 | Widescreen video |
| 21:9 | 2.333 | Cinematic, heroes |

## Philosophy

This tool provides **observations, not requirements**:

- Balance analysis is advisory, not enforcement
- Many great designs intentionally break "ideal" proportions
- UX needs often override aesthetic ideals
- The goal is awareness, not compliance

## Test Cases

See `src/analyze.test.ts` for test cases including:

- Outerfields Pricing Card (before/after balance improvements)
- Hero Section with intentional left-heavy weight
- Feature Grid with equal distribution
- Sidebar Layout pattern detection

## Integration with Pencil MCP

This library is designed to work with Pencil MCP's `snapshot_layout` output. A future Pencil MCP tool (`analyze_proportions`) could use this library directly.

```typescript
// Future Pencil MCP integration
const result = await pencilMCP.analyze_proportions({
  nodeId: 'my-frame',
  includeVisualWeight: true,
  depth: 2
});
```
