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

### ComparativeSparklines

Overlay multiple data series for direct comparison with shared scale.

```svelte
<script>
  import { ComparativeSparklines } from '@create-something/tufte';

  const series = [
    { label: '.agency', data: agencyViews, color: 'rgb(59, 130, 246)' },
    { label: '.io', data: ioViews, color: 'rgb(16, 185, 129)' }
  ];
</script>

<ComparativeSparklines {series} />
```

**Props:**
- `series: Series[]` - Array of series with `label`, `data`, optional `color` and `opacity` (required)
- `width: number` - SVG viewBox width (default: 100)
- `height: number` - SVG viewBox height (default: 30)
- `showLegend: boolean` - Display legend with series labels (default: true)

**Reveals:** Relative performance, divergence/convergence, which metrics are growing/declining

### DistributionBar

Visualize proportional distribution with automatic percentage calculation.

```svelte
<script>
  import { DistributionBar } from '@create-something/tufte';

  const segments = [
    { label: '.agency', count: 1234 },
    { label: '.io', count: 2456 },
    { label: '.space', count: 890 }
  ];
</script>

<DistributionBar {segments} />
```

**Props:**
- `segments: Segment[]` - Array with `label`, `count`, optional `color` (required)
- `showLabels: boolean` - Show legend below bar (default: true)
- `showPercentages: boolean` - Show percentages in legend (default: true)
- `height: string` - Tailwind height class (default: 'h-8')
- `minLabelWidth: number` - Minimum % width to show inline label (default: 8)

**Reveals:** Proportional breakdown at a glance, imbalances in distribution

### TrendIndicator

Show direction and magnitude of change between two values.

```svelte
<script>
  import { TrendIndicator } from '@create-something/tufte';
</script>

<TrendIndicator current={5432} previous={4800} format="percentage" />
```

**Props:**
- `current: number` - Current period value (required)
- `previous: number` - Previous period value (required)
- `format: 'number' | 'percentage' | 'compact'` - Display format (default: 'percentage')
- `showDirection: boolean` - Show arrow indicator (default: true)
- `flatThreshold: number` - Changes below this % are "flat" (default: 0.5)

**Reveals:** Whether metrics are improving (↑), declining (↓), or stable (→)

### HourlyHeatmap

Show patterns across time dimensions using small multiples (hour × day grid).

```svelte
<script>
  import { HourlyHeatmap } from '@create-something/tufte';

  const hourlyData = [
    { date: '2024-01-01', hour: 9, count: 45 },
    { date: '2024-01-01', hour: 14, count: 89 },
    // ... more hours
  ];
</script>

<HourlyHeatmap data={hourlyData} days={7} />
```

**Props:**
- `data: HourlyDataPoint[]` - Array with `date`, `hour` (0-23), `count` (required)
- `days: number` - Number of days to display (default: 7)
- `showLabels: boolean` - Show day/hour labels and legend (default: true)

**Reveals:** When users are most active, daily/weekly patterns, peak traffic hours

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
