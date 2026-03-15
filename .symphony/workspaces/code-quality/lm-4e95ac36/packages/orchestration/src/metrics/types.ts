/**
 * @create-something/orchestration
 *
 * Types for work metrics tracking.
 *
 * Philosophy: Measure what matters. Track cycle time, iterations, and
 * reviewer efficacy to identify patterns and improve over time.
 * Inspired by RoboDev's 40% PR cycle time reduction measurement.
 */

/**
 * Metrics for a single issue.
 */
export interface WorkMetrics {
  /** Issue ID */
  issueId: string;
  /** Issue title */
  title: string;
  /** Labels on the issue */
  labels: string[];

  // Time metrics
  /** Cycle time in minutes (creation to close) */
  cycleTimeMinutes: number;
  /** Time in each status (minutes) */
  timeInStatus: Record<string, number>;
  /** First response time (creation to first work) */
  firstResponseMinutes: number | null;

  // Iteration metrics
  /** Number of sessions that worked on this issue */
  sessions: number;
  /** Number of iterations/attempts */
  iterations: number;
  /** Number of corrections received */
  corrections: number;
  /** Number of retries after failure */
  retries: number;

  // Review metrics
  /** Peer review findings by reviewer */
  reviewerFindings: ReviewerFindings;
  /** Total findings across all reviewers */
  totalFindings: number;
  /** Findings that required rework */
  findingsRequiringRework: number;

  // Cost metrics
  /** Total cost in USD */
  costUsd: number;
  /** Cost per iteration */
  costPerIteration: number;

  // Outcome
  /** Whether the issue was successful */
  successful: boolean;
  /** Final status */
  finalStatus: string;
  /** Failure reasons if any */
  failureReasons: string[];

  // Timestamps
  /** Creation timestamp */
  createdAt: string;
  /** Completion timestamp */
  completedAt: string | null;
}

/**
 * Findings from peer reviewers.
 */
export interface ReviewerFindings {
  /** Security reviewer findings */
  security: FindingsSummary;
  /** Architecture reviewer findings */
  architecture: FindingsSummary;
  /** Quality reviewer findings */
  quality: FindingsSummary;
}

/**
 * Summary of findings from a reviewer.
 */
export interface FindingsSummary {
  /** Total findings */
  total: number;
  /** Critical findings */
  critical: number;
  /** High severity findings */
  high: number;
  /** Medium severity findings */
  medium: number;
  /** Low severity findings */
  low: number;
  /** Findings that blocked the work */
  blocking: number;
}

/**
 * Aggregate metrics for a convoy or epic.
 */
export interface AggregateMetrics {
  /** Target ID (convoy or epic) */
  targetId: string;
  /** Target type */
  targetType: 'convoy' | 'epic';
  /** Time period */
  period: {
    start: string;
    end: string;
  };

  // Issue counts
  /** Total issues */
  totalIssues: number;
  /** Completed issues */
  completedIssues: number;
  /** Failed issues */
  failedIssues: number;
  /** In-progress issues */
  inProgressIssues: number;

  // Time metrics
  /** Average cycle time (minutes) */
  avgCycleTime: number;
  /** Median cycle time (minutes) */
  medianCycleTime: number;
  /** 90th percentile cycle time */
  p90CycleTime: number;

  // Iteration metrics
  /** Average iterations per issue */
  avgIterations: number;
  /** Total corrections */
  totalCorrections: number;
  /** Correction rate (corrections / issues) */
  correctionRate: number;
  /** Issues requiring retry */
  issuesWithRetries: number;

  // Review metrics
  /** Total reviewer findings */
  totalReviewerFindings: number;
  /** Findings by reviewer type */
  findingsByReviewer: Record<string, number>;
  /** Catch rate (findings / issues) */
  reviewerCatchRate: number;
  /** Findings requiring rework */
  findingsRequiringRework: number;

  // Cost metrics
  /** Total cost */
  totalCost: number;
  /** Average cost per issue */
  avgCostPerIssue: number;
  /** Cost per successful issue */
  costPerSuccess: number;

  // Efficiency metrics
  /** Success rate */
  successRate: number;
  /** First-time success rate (no retries) */
  firstTimeSuccessRate: number;

  // Breakdown by complexity
  /** Metrics by complexity label */
  byComplexity: Record<string, ComplexityMetrics>;
}

/**
 * Metrics broken down by complexity.
 */
export interface ComplexityMetrics {
  /** Complexity label */
  complexity: string;
  /** Number of issues */
  count: number;
  /** Average cycle time */
  avgCycleTime: number;
  /** Average iterations */
  avgIterations: number;
  /** Success rate */
  successRate: number;
  /** Average cost */
  avgCost: number;
}

/**
 * Trend data for metrics over time.
 */
export interface MetricsTrend {
  /** Metric name */
  metric: string;
  /** Data points */
  dataPoints: TrendDataPoint[];
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Percent change */
  percentChange: number;
}

/**
 * A single data point in a trend.
 */
export interface TrendDataPoint {
  /** Timestamp */
  timestamp: string;
  /** Value */
  value: number;
  /** Sample size */
  sampleSize: number;
}

/**
 * Stored metrics for persistence.
 * Stored at .orchestration/metrics/{targetId}.json
 */
export interface StoredMetrics {
  /** Individual issue metrics */
  issues: WorkMetrics[];
  /** Aggregate metrics */
  aggregate: AggregateMetrics;
  /** Trends */
  trends: MetricsTrend[];
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Default empty reviewer findings.
 */
export const EMPTY_REVIEWER_FINDINGS: ReviewerFindings = {
  security: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
  architecture: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
  quality: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
};
