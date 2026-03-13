/**
 * KeyInsight Component System
 *
 * Shareable, exportable insight visuals for papers, presentations, and social media.
 * Follows Canon design principles: "Less, but better."
 *
 * @example
 * import { KeyInsight, KeyInsightCard, createInsight, createBugFixComparison } from '@create-something/canon/insights';
 *
 * const insight = createInsight('cumulative-state', 'Name fields for their semantics, not their content.', {
 *   comparison: createBugFixComparison(
 *     'published >= 5', 'Penalizes curation',
 *     'published + delisted >= 5', 'Preserves achievement'
 *   )
 * });
 */

// Components
export { default as KeyInsight } from './KeyInsight.svelte';
export { default as KeyInsightCard } from './KeyInsightCard.svelte';
export { default as StatementText } from './StatementText.svelte';

// Types
export type {
	StatementWord,
	Statement,
	ComparisonRow,
	InsightConfig,
	ExportFormat,
	RevelationPhase,
	AnimationConfig,
	KeyInsightProps,
	StatementTextProps
} from './types.js';

// Helpers
export {
	EXPORT_DIMENSIONS,
	parseStatement,
	createInsight,
	createBugFixComparison
} from './types.js';
