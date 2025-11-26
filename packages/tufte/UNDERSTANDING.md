# Understanding: @create-something/tufte

> **Visualization components embodying Edward Tufte's principles for displaying quantitative information—high data density, minimal chartjunk.**

## Ontological Position

**Mode of Being**: Foundation (Specialized)

This package extends the component foundation with data visualization. While `@create-something/components` handles structure and layout, `@create-something/tufte` handles the *display of quantitative information*. It embodies Tufte's principles: maximize data-ink ratio, avoid chartjunk, use small multiples.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `svelte ^5.0` | Reactive updates for real-time data display |
| Edward Tufte's principles | Philosophical foundation for all design decisions |

*No internal package dependencies—standalone visualization library.*

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/io` | How to display experiment metrics and analytics |
| Admin dashboards | High-density data presentation patterns |
| Agentic interfaces | Real-time metric visualization |

## Internal Structure

```
src/lib/
├── components/
│   ├── Sparkline.svelte           → Inline trend visualization
│   ├── MetricCard.svelte          → Single metric with context
│   ├── HighDensityTable.svelte    → Data-rich tabular display
│   ├── DailyGrid.svelte           → Calendar-style data grid
│   ├── HourlyHeatmap.svelte       → Time-based intensity map
│   ├── DistributionBar.svelte     → Proportion visualization
│   ├── ComparativeSparklines.svelte → Multiple trend comparison
│   └── TrendIndicator.svelte      → Direction/change indicator
└── utils/
    ├── sparkline.ts               → SVG path generation
    └── formatters.ts              → Number/date formatting
```

## To Understand This Package, Read

1. **`src/lib/components/index.ts`** — All available visualization components
2. **`src/lib/components/Sparkline.svelte`** — Core pattern: data → SVG path
3. **`src/lib/utils/sparkline.ts`** — Algorithm for sparkline generation
4. **`src/lib/components/MetricCard.svelte`** — Composition pattern for metrics

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Sparkline | Word-sized graphic showing trend | `Sparkline.svelte` |
| Data-Ink Ratio | Proportion of ink displaying data vs decoration | All components |
| Small Multiples | Repeated small charts for comparison | `ComparativeSparklines.svelte` |
| High-Density Display | Maximum information per pixel | `HighDensityTable.svelte` |

## This Package Helps You Understand

- **Tufte's principles in code**: Data-ink ratio, chartjunk avoidance
- **SVG generation**: How to create responsive, scalable graphics
- **Agentic visualization**: Real-time metric display for AI systems
- **Minimal decoration**: Black/white aesthetic, no gradients or 3D effects

## Common Tasks

| Task | Start Here |
|------|------------|
| Show a trend | `<Sparkline data={numbers} />` |
| Display a metric | `<MetricCard value={n} label="..." />` |
| Compare trends | `<ComparativeSparklines series={[...]} />` |
| Show time patterns | `<HourlyHeatmap data={...} />` |

## Design Principles (Tufte)

1. **Above all else, show the data** — No decoration without information
2. **Maximize data-ink ratio** — Every pixel should convey data
3. **Erase non-data ink** — Remove gridlines, borders, backgrounds
4. **Erase redundant data-ink** — Don't repeat information
5. **Revise and edit** — Simplify until it breaks, then add one thing back

---

*Last validated: 2024-11-25*
