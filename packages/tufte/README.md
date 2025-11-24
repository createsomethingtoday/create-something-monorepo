# @create-something/tufte

**Agentic visualization components embodying Edward Tufte's principles for displaying quantitative information.**

## Philosophy

This package demonstrates the intersection of **agentic engineering** and **data visualization excellence**:

- **Agentic Components:** Each component is an autonomous agent that knows how to display data correctly, enforcing Tufte's principles automatically
- **Tufte's Principles:** Maximize data-ink ratio, show variation not decoration, integrate text and graphics, use small multiples
- **CREATE SOMETHING Way:** Built-in design tokens, consistent spacing, proper typography

## Installation

```bash
pnpm add @create-something/tufte
```

## Components

### Sparkline

Compact trend visualization following Tufte's principle of "intense, word-sized graphics."

```svelte
<script>
  import { Sparkline } from '@create-something/tufte';

  const dailyViews = [
    { count: 120 },
    { count: 145 },
    { count: 132 },
    { count: 198 }
  ];
</script>

<Sparkline data={dailyViews} />
```

**Props:**
- `data: DataPoint[]` - Array of objects with `count` property (required)
- `width: number` - SVG viewBox width (default: 100)
- `height: number` - SVG viewBox height (default: 30)
- `showFill: boolean` - Show area fill under line (default: true)
- `showReferenceLine: boolean` - Show midpoint reference line (default: false)

### MetricCard

Integrates label, value, trend, and context following Tufte's principle #5.

```svelte
<script>
  import { MetricCard } from '@create-something/tufte';
</script>

<MetricCard
  label="Total Views"
  value={5432}
  trend={dailyViews}
  context="30 days"
  percentage={34}
/>
```

**Props:**
- `label: string` - Metric label (required)
- `value: number` - Primary value to display (required)
- `trend: DataPoint[] | undefined` - Optional trend data for inline sparkline
- `context: string | undefined` - Optional context text
- `percentage: number | undefined` - Optional percentage (shown if no trend)

### HighDensityTable

Ranked list with maximum information density per unit area.

```svelte
<script>
  import { HighDensityTable } from '@create-something/tufte';

  const topPages = [
    { label: '/home', count: 1234, property: 'io' },
    { label: '/about', count: 567, property: 'io' }
  ];
</script>

<HighDensityTable
  items={topPages}
  limit={10}
  labelKey="label"
  countKey="count"
  badgeKey="property"
/>
```

**Props:**
- `items: T[]` - Array of items to display (required)
- `limit: number` - Maximum items to show (default: 10)
- `showRank: boolean` - Show rank numbers (default: true)
- `showPercentage: boolean` - Show percentage of total (default: true)
- `labelKey: keyof T` - Key for label field (default: 'label')
- `countKey: keyof T` - Key for count field (default: 'count')
- `badgeKey: keyof T | undefined` - Optional badge field (e.g., category tag)
- `totalForPercentage: number | undefined` - Total for percentage calculation
- `emptyMessage: string` - Message when no data (default: 'No data yet')

### DailyGrid

Small multiples pattern for daily data comparison.

```svelte
<script>
  import { DailyGrid } from '@create-something/tufte';

  const dailyData = [
    { date: '2024-01-01', count: 120 },
    { date: '2024-01-02', count: 145 },
    // ... more days
  ];
</script>

<DailyGrid data={dailyData} days={7} />
```

**Props:**
- `data: DataPoint[]` - Array with `date` and `count` properties (required)
- `days: number` - Number of days to display (default: 7)

## Utilities

### Sparkline Path Generation

```typescript
import { generateSparklinePath, generateFillPath } from '@create-something/tufte';

const data = [{ count: 1 }, { count: 2 }, { count: 3 }];
const linePath = generateSparklinePath(data, 100, 30);
const fillPath = generateFillPath(linePath, 100, 30);
```

### Number Formatting

```typescript
import { formatNumber, getPercentage, formatCompact } from '@create-something/tufte';

formatNumber(1234);        // "1,234"
getPercentage(25, 100);    // 25
formatCompact(1234000);    // "1.2M"
```

### Date Formatting

```typescript
import { formatDate } from '@create-something/tufte';

formatDate('2024-01-15', 'short');    // "Jan 15"
formatDate('2024-01-15', 'long');     // "Jan 15, 2024"
formatDate('2024-01-15', 'weekday');  // "Mon"
```

## Tufte's Principles Implemented

1. **Maximize data-ink ratio** - Components remove all decoration, show only data
2. **Show data variation** - Sparklines and trends reveal patterns
3. **High data density** - Tables show 10+ items compactly
4. **Integrate text & data** - Labels appear with values, not in separate legends
5. **Small multiples** - DailyGrid enables comparison across dimensions
6. **Remove chartjunk** - No gradients, shadows, 3D effects, or heavy borders

## Agentic Behavior

These components are "agentic" because they:

- **Autonomous:** Make visualization decisions automatically (scaling, formatting, spacing)
- **Intelligent defaults:** Enforce Tufte's principles without developer intervention
- **Self-contained:** Encapsulate both logic and design standards
- **Composable:** Can be combined into larger visualizations
- **Standards-enforcing:** Impossible to violate data-ink ratio principles

## Design Tokens

Components use CREATE SOMETHING design system:

```css
/* Data (most important) */
text-white/80 to text-white

/* Labels (supporting) */
text-white/60

/* Context (subtle) */
text-white/40

/* Minimal (structure only) */
text-white/30
border-white/5 to border-white/10
bg-white/5
```

## Typography

All numeric values use `tabular-nums` for proper alignment. Font sizes follow mobile-first scale:

- Hero metric: `text-3xl` (30px)
- Primary data: `text-2xl` (24px)
- Secondary data: `text-sm` (14px)
- Labels: `text-xs` (12px)

## References

**Primary Source:**
- Tufte, Edward R. (1983). *The Visual Display of Quantitative Information*. Graphics Press.

**Canonical Implementation:**
- CREATE SOMETHING.ltd: https://createsomething.ltd/masters/edward-tufte
- Visualization Patterns: https://createsomething.io/methodology

## License

MIT
