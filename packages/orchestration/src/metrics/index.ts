/**
 * @create-something/orchestration
 *
 * Metrics module.
 *
 * Philosophy: Measure what matters. Track cycle time, iterations, and
 * reviewer efficacy to identify patterns and improve over time.
 * Inspired by RoboDev's 40% PR cycle time reduction measurement.
 *
 * Key metrics:
 * - Cycle time: How long from issue creation to close
 * - Iterations: How many attempts to complete an issue
 * - Corrections: How many times the agent was corrected
 * - Reviewer efficacy: How many issues caught by peer review
 * - Cost: Total and per-issue costs
 */

// Types
export type {
  WorkMetrics,
  ReviewerFindings,
  FindingsSummary,
  AggregateMetrics,
  ComplexityMetrics,
  MetricsTrend,
  TrendDataPoint,
  StoredMetrics,
} from './types.js';

export { EMPTY_REVIEWER_FINDINGS } from './types.js';

// Collection
export {
  collectIssueMetrics,
  collectConvoyMetrics,
  collectEpicMetrics,
} from './collector.js';

// Aggregation
export {
  computeAggregateMetrics,
  computeTrends,
} from './aggregator.js';

// Storage and reporting
export {
  saveMetrics,
  loadMetrics,
  listMetrics,
  generateMetricsReport,
} from './store.js';
