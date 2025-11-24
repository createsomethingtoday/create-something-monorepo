// Main package exports

// Components
export { default as Sparkline } from './components/Sparkline.svelte';
export { default as MetricCard } from './components/MetricCard.svelte';
export { default as HighDensityTable } from './components/HighDensityTable.svelte';
export { default as DailyGrid } from './components/DailyGrid.svelte';
export { default as ComparativeSparklines } from './components/ComparativeSparklines.svelte';
export { default as DistributionBar } from './components/DistributionBar.svelte';
export { default as TrendIndicator } from './components/TrendIndicator.svelte';
export { default as HourlyHeatmap } from './components/HourlyHeatmap.svelte';

// Utilities
export { generateSparklinePath, generateFillPath, formatNumber, getPercentage, formatCompact, formatDate } from './utils/index.js';

// Types
export type { DataPoint } from './utils/index.js';
