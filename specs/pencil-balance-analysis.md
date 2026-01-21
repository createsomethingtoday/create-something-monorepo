# Pencil Balance Analysis Feature Spec

## Overview

Add proportion and balance analysis capabilities to Pencil MCP, enabling agents and designers to get feedback on visual harmony without enforcing strict golden ratio compliance.

## The Problem

Visual balance in UI design is subtle:
- Golden ratio (1:1.618) creates pleasing proportions but isn't universally applicable
- UX often requires breaking "ideal" proportions for usability
- Current tooling checks token compliance, not spatial relationships
- Designers need feedback, not enforcement

## Proposed Tools

### 1. `analyze_proportions`

Analyze spatial relationships and proportion ratios within a frame.

```typescript
interface AnalyzeProportionsParams {
  filePath: string;
  nodeId: string;          // Frame to analyze
  depth?: number;          // How deep to analyze (default: 2)
  referenceRatios?: {      // Optional custom ratios to check against
    name: string;
    ratio: number;
  }[];
}

interface ProportionAnalysis {
  nodeId: string;
  nodeName: string;
  
  // Computed layout
  bounds: { width: number; height: number };
  aspectRatio: number;
  
  // Column/row analysis (if horizontal/vertical layout)
  childProportions?: {
    children: { id: string; name: string; width: number; height: number }[];
    widthRatios: number[];   // e.g., [0.4, 0.6] for 2:3 split
    heightRatios: number[];
  };
  
  // Ratio proximity
  ratioAnalysis: {
    aspectRatioClosestTo: string;  // "golden", "2:3", "4:3", "square", etc.
    proximity: number;              // 0-1 how close
    
    // For child distributions
    childDistributionClosestTo?: string;
    childDistributionProximity?: number;
  };
  
  // Visual weight estimation (based on area, density, contrast)
  visualWeight?: {
    left: number;    // 0-1
    right: number;
    top: number;
    bottom: number;
    distribution: "balanced" | "left-heavy" | "right-heavy" | "top-heavy" | "bottom-heavy";
  };
  
  // Advisory findings (not errors)
  observations: {
    type: "info" | "suggestion";
    message: string;
    detail?: string;
  }[];
}
```

**Example Output for Outerfields Pricing Card:**
```json
{
  "nodeId": "IrAef",
  "nodeName": "Pricing Card",
  "bounds": { "width": 1152, "height": 430 },
  "aspectRatio": 2.68,
  "childProportions": {
    "children": [
      { "id": "WMl7j", "name": "Pricing Left", "width": 400, "height": 334 },
      { "id": "mZzgp", "name": "Pricing Right", "width": 608, "height": 199 }
    ],
    "widthRatios": [0.397, 0.603]
  },
  "ratioAnalysis": {
    "aspectRatioClosestTo": "21:9 ultrawide",
    "proximity": 0.85,
    "childDistributionClosestTo": "golden (0.382:0.618)",
    "childDistributionProximity": 0.96
  },
  "visualWeight": {
    "left": 0.55,
    "right": 0.45,
    "distribution": "balanced"
  },
  "observations": [
    {
      "type": "info",
      "message": "Column split approximates golden ratio",
      "detail": "Left:Right = 0.397:0.603, golden = 0.382:0.618 (96% proximity)"
    },
    {
      "type": "suggestion", 
      "message": "Right column is vertically shorter than left",
      "detail": "Left height: 334px, Right height: 199px. Consider if this is intentional asymmetry."
    }
  ]
}
```

### 2. `check_whitespace`

Analyze whitespace distribution and breathing room.

```typescript
interface CheckWhitespaceParams {
  filePath: string;
  nodeId: string;
  includeGutters?: boolean;  // Check gaps between children
}

interface WhitespaceAnalysis {
  nodeId: string;
  padding: { top: number; right: number; bottom: number; left: number };
  contentArea: { width: number; height: number };
  contentDensity: number;  // 0-1, ratio of content to container
  
  gutters?: {
    horizontal: number[];  // Gaps between horizontal children
    vertical: number[];    // Gaps between vertical children
    consistency: "consistent" | "varied" | "inconsistent";
    variance: number;      // Standard deviation
  };
  
  observations: {
    type: "info" | "suggestion";
    message: string;
  }[];
}
```

### 3. `suggest_proportions`

Given current layout, suggest proportion adjustments.

```typescript
interface SuggestProportionsParams {
  filePath: string;
  nodeId: string;
  targetStyle?: "golden" | "thirds" | "quarters" | "fibonacci";
  preserveContent?: boolean;  // Keep content, adjust container
}

interface ProportionSuggestion {
  current: { width: number; height: number };
  suggestions: {
    name: string;           // "Golden Ratio", "Rule of Thirds", etc.
    ratio: number;
    adjustedDimensions: { width: number; height: number };
    changeRequired: { widthDelta: number; heightDelta: number };
    confidence: number;     // How well this fits the content
  }[];
}
```

## Implementation Considerations

### What Balance Analysis IS:
- **Advisory feedback** - suggestions, not enforcement
- **Proportion awareness** - helps identify unintentional asymmetry
- **Educational** - explains why certain proportions feel "right"
- **Configurable** - different styles suit different purposes

### What Balance Analysis IS NOT:
- **A requirement** - many great designs break golden ratio
- **Automated correction** - designers decide what to do with feedback
- **Universal rules** - UX needs often override aesthetic ideals
- **Pixel perfect** - proximity matters more than exactness

### Visual Weight Calculation (Heuristic)

Visual weight is harder to compute than proportions. A simple heuristic:

```
weight = (area * density * contrast_factor)

where:
- area = bounding box area relative to container
- density = (total child area / bounding box area)  
- contrast_factor = estimated from fill colors vs background
```

More sophisticated approaches could analyze:
- Typography size and weight
- Icon/image presence
- Color saturation and brightness
- Element count and distribution

### Known Ratios Reference

| Name | Ratio | Decimal | Common Use |
|------|-------|---------|------------|
| Golden Ratio | 1:1.618 | 0.618 | Classical harmony |
| Rule of Thirds | 1:2 | 0.333/0.667 | Photography, web |
| 2:3 | 2:3 | 0.4/0.6 | Print, cards |
| 3:4 | 3:4 | 0.75 | Screens, photos |
| 4:3 | 4:3 | 1.333 | Traditional displays |
| 16:9 | 16:9 | 1.778 | Widescreen |
| Square | 1:1 | 1.0 | Icons, avatars |

## Integration Points

1. **Pencil MCP** - Primary home, works with snapshot_layout data
2. **Design reviews** - Agent can analyze before/after changes
3. **Component library** - Validate component proportions
4. **Landing pages** - Check section balance

## Non-Goals (Explicit)

- No automatic "fixing" of proportions
- No blocking of designs that don't match ratios
- No complex visual weight ML models (keep it heuristic)
- No opinion on which ratio is "best"

## Example Use Case

```
User: "Check if this pricing card is well-balanced"

Agent: 
1. Calls analyze_proportions on the card
2. Gets back ratio analysis showing 96% proximity to golden ratio
3. Gets visual weight showing slight left-heaviness (the $99 price)
4. Reports: "The pricing card uses a near-golden ratio split (0.40:0.60). 
   The large price on the left creates intentional visual weight that 
   draws attention before the benefits list. This appears to be 
   deliberate emphasis rather than imbalance."
```

## Open Questions

1. Should visual weight estimation be in v1, or start with just proportion analysis?
2. How to handle responsive layouts (different ratios at different breakpoints)?
3. Should we expose raw computation or only processed observations?
