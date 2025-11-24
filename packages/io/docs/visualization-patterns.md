# Data Visualization Patterns for CREATE SOMETHING

**Following Edward Tufte's principles for displaying quantitative information**

## Philosophy

Data visualization in research isn't decoration—it's evidence presentation. Poor visualization undermines credibility. Excellent visualization makes patterns obvious and builds trust.

Every visualization decision should maximize the **data-ink ratio**: the proportion of ink (pixels) dedicated to displaying actual data versus decoration.

## Core Principles

### 1. Maximize Data-Ink Ratio

**Principle:** Every pixel should convey information. Remove elements that don't represent data.

**Bad:**
```svelte
<!-- Heavy borders, excessive padding, decorative backgrounds -->
<div class="p-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-2xl border-4 border-white">
  <div class="text-6xl font-bold drop-shadow-lg">1,234</div>
  <div class="text-xl uppercase tracking-widest">Page Views</div>
</div>
```

**Good:**
```svelte
<!-- Minimal decoration, focus on data -->
<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
  <div class="text-sm text-white/60">Page Views</div>
  <div class="text-3xl font-bold tabular-nums">1,234</div>
</div>
```

**Why it's better:**
- Removed gradient background (decorative)
- Removed drop shadows (chartjunk)
- Reduced padding (more space for data)
- Used subtle borders (data stands out)
- Tabular numbers for easy scanning

### 2. Show Data Variation, Not Design Variation

**Principle:** Display change, trends, and patterns—not just static values.

**Bad:**
```svelte
<!-- Just a number with no context -->
<div class="stat">
  <div class="value">5,432</div>
  <div class="label">Total Views</div>
</div>
```

**Good:**
```svelte
<!-- Number + inline trend shows change over time -->
<div class="stat">
  <div class="flex items-baseline justify-between">
    <div class="text-sm text-white/60">Total Views</div>
    <svg viewBox="0 0 40 12" class="w-12 h-4">
      <path
        d={generateSparkline(dailyData, 40, 12)}
        fill="none"
        stroke="white"
        stroke-opacity="0.3"
        stroke-width="1.5"
      />
    </svg>
  </div>
  <div class="text-3xl font-bold">5,432</div>
  <div class="text-xs text-white/40">↑ 12% vs last period</div>
</div>
```

**Why it's better:**
- Sparkline shows trend without taking much space
- Percentage change gives context
- Arrow indicates direction
- All context integrated with the number

### 3. High Data Density

**Principle:** Maximize meaningful information per unit area.

**Bad:**
```svelte
<!-- Only 3 items with excessive spacing -->
<div class="space-y-8">
  {#each experiments.slice(0, 3) as exp}
    <div class="p-8 bg-white/10 rounded-xl">
      <h3 class="text-2xl mb-4">{exp.title}</h3>
      <div class="text-xl">{exp.count} views</div>
    </div>
  {/each}
</div>
```

**Good:**
```svelte
<!-- 10+ items with compact layout -->
<div class="space-y-1">
  {#each experiments.slice(0, 10) as exp, i}
    <div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5">
      <span class="text-white/30 w-4 text-right">{i + 1}</span>
      <span class="flex-1 truncate">{exp.title}</span>
      <span class="text-white/60 tabular-nums w-12 text-right">{exp.count}</span>
      <span class="text-white/30 w-10 text-right">{getPercentage(exp.count, total)}%</span>
    </div>
  {/each}
</div>
```

**Why it's better:**
- Shows 10 items instead of 3 in same space
- Each row includes: rank, title, count, percentage
- Subtle dividers instead of heavy borders
- Monospace font for easy scanning
- Tabular numbers align properly

### 4. Integrate Text & Data

**Principle:** Labels, numbers, and context should appear together—no separate legends.

**Bad:**
```svelte
<!-- Data and context are separated -->
<div class="chart-container">
  <div class="chart">
    <!-- Chart without labels -->
  </div>
</div>
<div class="legend">
  <div>■ Property A</div>
  <div>■ Property B</div>
</div>
```

**Good:**
```svelte
<!-- Data and labels integrated -->
<div class="p-4 bg-white/5 rounded">
  <div class="flex items-baseline justify-between mb-2">
    <div class="text-sm text-white/60">.agency</div>
    <div class="text-xs text-white/40 font-mono">34%</div>
  </div>
  <div class="text-3xl font-bold tabular-nums">1,234</div>
  <div class="text-xs text-white/40">34% of total</div>
</div>
```

**Why it's better:**
- Property label right with the data
- Percentage shown twice: once for scanning, once for context
- No need to look elsewhere for meaning

### 5. Small Multiples

**Principle:** Show multiple dimensions side-by-side for easy comparison.

**Pattern: 7-Day Grid**
```svelte
<!-- Show last 7 days in compact grid -->
<div class="grid grid-cols-7 gap-1 text-xs font-mono">
  {#each dailyViews.slice(-7) as day}
    <div class="text-center p-2 bg-white/5 rounded">
      <div class="text-white/40 text-[10px] mb-1">
        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
      </div>
      <div class="text-white/80 font-semibold">{formatNumber(day.count)}</div>
    </div>
  {/each}
</div>
```

**Pattern: Property Comparison**
```svelte
<!-- Compare metrics across all properties -->
<div class="grid grid-cols-4 gap-4">
  {#each ['agency', 'io', 'space', 'ltd'] as property}
    <div class="p-4 bg-white/5 rounded">
      <div class="text-sm text-white/60">.{property}</div>
      <div class="text-2xl font-bold tabular-nums">{getCount(property)}</div>
      <div class="text-xs text-white/40">{getPercentage(property)}%</div>
    </div>
  {/each}
</div>
```

**Why it works:**
- Patterns visible at a glance (weekend dips, property distribution)
- No need to read each number individually
- Consistent layout aids comparison

### 6. Remove Chartjunk

**Principle:** Eliminate visual elements that don't represent data.

**Chartjunk to avoid:**
- ❌ Gradient backgrounds
- ❌ Drop shadows
- ❌ 3D effects
- ❌ Decorative icons
- ❌ Excessive animation
- ❌ Heavy borders
- ❌ Grid lines on every axis
- ❌ Redundant labels

**Minimal elements to keep:**
- ✅ Subtle borders for structure
- ✅ Muted backgrounds for hierarchy
- ✅ Light dividers between rows
- ✅ Single reference line (like midpoint)

**Example:**
```svelte
<!-- Clean table with minimal decoration -->
<div class="bg-white/5 border border-white/10 rounded-lg p-4">
  <h3 class="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">
    Top Pages
  </h3>
  <div class="space-y-1">
    {#each pages as page, i}
      <div class="flex gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
        <span class="text-white/30 w-4 text-right">{i + 1}</span>
        <span class="flex-1 truncate text-white/80">{page.path}</span>
        <span class="text-white/60 tabular-nums">{page.count}</span>
      </div>
    {/each}
  </div>
</div>
```

## Pattern Library

### Pattern: Sparkline

**Use when:** You need to show trends compactly alongside numbers.

```svelte
<script>
function generateSparkline(data: any[], width: number = 100, height: number = 20): string {
  if (data.length === 0) return '';

  const values = data.map(d => d.count);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
}
</script>

<svg viewBox="0 0 100 30" class="w-full h-24" preserveAspectRatio="none">
  <!-- Optional: subtle reference line -->
  <line x1="0" y1="15" x2="100" y2="15" stroke="white" stroke-opacity="0.05" stroke-width="0.5"/>

  <!-- Data line -->
  <path
    d={generateSparkline(dailyViews, 100, 30)}
    fill="none"
    stroke="white"
    stroke-opacity="0.6"
    stroke-width="1.5"
    vector-effect="non-scaling-stroke"
  />

  <!-- Subtle fill for context -->
  <path
    d="{generateSparkline(dailyViews, 100, 30)} L 100,30 L 0,30 Z"
    fill="white"
    fill-opacity="0.1"
  />
</svg>
```

### Pattern: High-Density Table

**Use when:** Showing ranked lists (top pages, experiments, countries, referrers).

```svelte
<div class="space-y-1">
  {#each items.slice(0, 10) as item, i}
    <div class="flex items-center gap-2 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
      <!-- Rank -->
      <span class="text-white/30 w-4 text-right">{i + 1}</span>

      <!-- Label (truncate if needed) -->
      <span class="flex-1 truncate text-white/80">{item.label}</span>

      <!-- Absolute value -->
      <span class="text-white/60 tabular-nums w-12 text-right">
        {formatNumber(item.count)}
      </span>

      <!-- Percentage of total -->
      <span class="text-white/30 w-10 text-right">
        {getPercentage(item.count, total)}%
      </span>
    </div>
  {/each}
</div>
```

**Key elements:**
- Rank number (left-aligned, muted)
- Item label (truncate, main color)
- Count (right-aligned, tabular numbers)
- Percentage (right-aligned, very muted)
- Subtle dividers (not heavy borders)
- Monospace font for alignment

### Pattern: Metric Card with Context

**Use when:** Displaying key metrics in dashboard overview.

```svelte
<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
  <!-- Header with label + inline sparkline -->
  <div class="flex items-baseline justify-between mb-2">
    <div class="text-sm text-white/60">Total Views</div>
    {#if dailyViews.length > 0}
      <svg viewBox="0 0 40 12" class="w-12 h-4" preserveAspectRatio="none">
        <path
          d={generateSparkline(dailyViews, 40, 12)}
          fill="none"
          stroke="white"
          stroke-opacity="0.3"
          stroke-width="1.5"
        />
      </svg>
    {/if}
  </div>

  <!-- Primary metric -->
  <div class="text-3xl font-bold tabular-nums">{formatNumber(totalViews)}</div>

  <!-- Context -->
  <div class="text-xs text-white/40 mt-1 font-mono">{days} days</div>
</div>
```

## Color Guidelines

Tufte emphasizes letting data, not color, tell the story. Use color sparingly:

**Good uses of color:**
- ✅ Muted backgrounds for hierarchy (white/5, white/10)
- ✅ Text opacity for importance (white/60 for labels, white/80 for data)
- ✅ Single accent for trends (one color line, not rainbow)

**Avoid:**
- ❌ Different colors for each category
- ❌ Bright, saturated colors
- ❌ Color as the only way to distinguish data

**CREATE SOMETHING palette (from Tufte):**
```css
/* Data (most important) */
text-white/80 to text-white     /* Primary data values */

/* Labels (supporting) */
text-white/60                   /* Metric labels, headers */

/* Context (subtle) */
text-white/40                   /* Secondary info, percentages */

/* Minimal (structure only) */
text-white/30                   /* Rank numbers, dividers */
border-white/5 to border-white/10  /* Subtle borders */
bg-white/5                      /* Minimal backgrounds */
```

## Typography

**Principle:** Use tabular (monospace) numbers for alignment.

```svelte
<!-- Bad: proportional numbers don't align -->
<div class="text-2xl">1,234</div>
<div class="text-2xl">567</div>

<!-- Good: tabular numbers align -->
<div class="text-2xl font-bold tabular-nums">1,234</div>
<div class="text-2xl font-bold tabular-nums">567</div>
```

**Font sizes (mobile-first):**
- **Hero metric:** `text-3xl` (30px) → `md:text-4xl` (36px)
- **Primary data:** `text-2xl` (24px)
- **Secondary data:** `text-sm` (14px)
- **Labels:** `text-xs` (12px)
- **Context:** `text-[10px]` for very dense info

## Spacing

**Principle:** Minimize whitespace to maximize data density.

```svelte
<!-- Compact spacing for high-density tables -->
<div class="space-y-1">        <!-- 4px between rows -->
  <div class="py-1.5">         <!-- 6px vertical padding -->
    <div class="gap-2">        <!-- 8px between columns -->
```

**When to add space:**
- Between distinct sections (not rows)
- Around section headers
- To create visual hierarchy

## Implementation Checklist

When creating a new visualization, verify:

- [ ] **Data-ink ratio:** Can I remove any decoration?
- [ ] **Variation:** Am I showing change, not just values?
- [ ] **Density:** Can I show more data in the same space?
- [ ] **Integration:** Are labels and data together?
- [ ] **Comparison:** Can users spot patterns easily?
- [ ] **Chartjunk:** Have I removed all non-data elements?
- [ ] **Tabular numbers:** Are numbers aligned properly?
- [ ] **Color:** Am I using color sparingly?
- [ ] **Accessibility:** Can users extract insights quickly?

## References

**Primary Source:**
- Tufte, Edward R. (1983). *The Visual Display of Quantitative Information*. Graphics Press.

**Key Concepts:**
- Data-ink ratio (maximize)
- Chartjunk (minimize)
- Small multiples (compare)
- Sparklines (inline trends)
- Micro/macro readings (overview + detail)

---

*This pattern library documents how CREATE SOMETHING implements Tufte's principles across analytics dashboards, experiment results, and research papers.*
