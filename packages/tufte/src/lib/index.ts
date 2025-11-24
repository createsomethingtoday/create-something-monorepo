// Main package exports

// Components
export { default as Sparkline } from './components/Sparkline.svelte';
export { default as MetricCard } from './components/MetricCard.svelte';
export { default as HighDensityTable } from './components/HighDensityTable.svelte';
export { default as DailyGrid } from './components/DailyGrid.svelte';

// Utilities
export { generateSparklinePath, generateFillPath, formatNumber, getPercentage, formatCompact, formatDate } from './utils/index.js';

// Types
export type { DataPoint } from './utils/index.js';
