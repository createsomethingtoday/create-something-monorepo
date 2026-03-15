/**
 * @create-something/orchestration
 *
 * Metrics aggregator - computes aggregate statistics from individual metrics.
 *
 * Philosophy: Surface patterns that help identify improvement opportunities.
 * Show what's working, what's not, and where to focus attention.
 */

import type {
  WorkMetrics,
  AggregateMetrics,
  ComplexityMetrics,
  MetricsTrend,
  TrendDataPoint,
} from './types.js';

/**
 * Compute aggregate metrics from individual issue metrics.
 */
export function computeAggregateMetrics(
  targetId: string,
  targetType: 'convoy' | 'epic',
  metrics: WorkMetrics[]
): AggregateMetrics {
  if (metrics.length === 0) {
    return createEmptyAggregateMetrics(targetId, targetType);
  }

  // Determine time period
  const timestamps = metrics
    .filter((m) => m.createdAt)
    .map((m) => new Date(m.createdAt).getTime());
  const completedTimestamps = metrics
    .filter((m) => m.completedAt)
    .map((m) => new Date(m.completedAt!).getTime());

  const period = {
    start: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : new Date().toISOString(),
    end: completedTimestamps.length > 0 ? new Date(Math.max(...completedTimestamps)).toISOString() : new Date().toISOString(),
  };

  // Issue counts
  const totalIssues = metrics.length;
  const completedIssues = metrics.filter((m) => m.successful).length;
  const failedIssues = metrics.filter((m) => !m.successful && m.completedAt).length;
  const inProgressIssues = metrics.filter((m) => !m.completedAt).length;

  // Time metrics
  const cycleTimes = metrics.filter((m) => m.cycleTimeMinutes > 0).map((m) => m.cycleTimeMinutes);
  const avgCycleTime = cycleTimes.length > 0 ? average(cycleTimes) : 0;
  const medianCycleTime = cycleTimes.length > 0 ? median(cycleTimes) : 0;
  const p90CycleTime = cycleTimes.length > 0 ? percentile(cycleTimes, 90) : 0;

  // Iteration metrics
  const avgIterations = average(metrics.map((m) => m.iterations));
  const totalCorrections = sum(metrics.map((m) => m.corrections));
  const correctionRate = totalIssues > 0 ? totalCorrections / totalIssues : 0;
  const issuesWithRetries = metrics.filter((m) => m.retries > 0).length;

  // Review metrics
  const totalReviewerFindings = sum(metrics.map((m) => m.totalFindings));
  const findingsByReviewer = {
    security: sum(metrics.map((m) => m.reviewerFindings.security.total)),
    architecture: sum(metrics.map((m) => m.reviewerFindings.architecture.total)),
    quality: sum(metrics.map((m) => m.reviewerFindings.quality.total)),
  };
  const reviewerCatchRate = totalIssues > 0 ? totalReviewerFindings / totalIssues : 0;
  const findingsRequiringRework = sum(metrics.map((m) => m.findingsRequiringRework));

  // Cost metrics
  const totalCost = sum(metrics.map((m) => m.costUsd));
  const avgCostPerIssue = totalIssues > 0 ? totalCost / totalIssues : 0;
  const costPerSuccess = completedIssues > 0 ? totalCost / completedIssues : 0;

  // Efficiency metrics
  const successRate = totalIssues > 0 ? completedIssues / totalIssues : 0;
  const firstTimeSuccess = metrics.filter((m) => m.successful && m.retries === 0).length;
  const firstTimeSuccessRate = totalIssues > 0 ? firstTimeSuccess / totalIssues : 0;

  // Breakdown by complexity
  const byComplexity = computeComplexityBreakdown(metrics);

  return {
    targetId,
    targetType,
    period,
    totalIssues,
    completedIssues,
    failedIssues,
    inProgressIssues,
    avgCycleTime,
    medianCycleTime,
    p90CycleTime,
    avgIterations,
    totalCorrections,
    correctionRate,
    issuesWithRetries,
    totalReviewerFindings,
    findingsByReviewer,
    reviewerCatchRate,
    findingsRequiringRework,
    totalCost,
    avgCostPerIssue,
    costPerSuccess,
    successRate,
    firstTimeSuccessRate,
    byComplexity,
  };
}

/**
 * Compute complexity breakdown.
 */
function computeComplexityBreakdown(metrics: WorkMetrics[]): Record<string, ComplexityMetrics> {
  const breakdown: Record<string, ComplexityMetrics> = {};

  // Group by complexity label
  const groups = new Map<string, WorkMetrics[]>();

  for (const m of metrics) {
    // Find complexity label
    const complexityLabel = m.labels.find(
      (l) => l.startsWith('complexity:') || l.startsWith('model:')
    );
    const complexity = complexityLabel
      ? complexityLabel.split(':')[1]
      : 'unknown';

    if (!groups.has(complexity)) {
      groups.set(complexity, []);
    }
    groups.get(complexity)!.push(m);
  }

  // Compute metrics for each group
  for (const [complexity, groupMetrics] of groups) {
    const count = groupMetrics.length;
    const successful = groupMetrics.filter((m) => m.successful).length;

    breakdown[complexity] = {
      complexity,
      count,
      avgCycleTime: average(groupMetrics.map((m) => m.cycleTimeMinutes)),
      avgIterations: average(groupMetrics.map((m) => m.iterations)),
      successRate: count > 0 ? successful / count : 0,
      avgCost: average(groupMetrics.map((m) => m.costUsd)),
    };
  }

  return breakdown;
}

/**
 * Compute trends over time.
 */
export function computeTrends(
  historicalMetrics: AggregateMetrics[],
  windowDays: number = 7
): MetricsTrend[] {
  if (historicalMetrics.length < 2) {
    return [];
  }

  const trends: MetricsTrend[] = [];

  // Cycle time trend
  trends.push(
    computeTrend(
      'avgCycleTime',
      historicalMetrics.map((m) => ({
        timestamp: m.period.end,
        value: m.avgCycleTime,
        sampleSize: m.totalIssues,
      })),
      'lower_is_better'
    )
  );

  // Iteration trend
  trends.push(
    computeTrend(
      'avgIterations',
      historicalMetrics.map((m) => ({
        timestamp: m.period.end,
        value: m.avgIterations,
        sampleSize: m.totalIssues,
      })),
      'lower_is_better'
    )
  );

  // Success rate trend
  trends.push(
    computeTrend(
      'successRate',
      historicalMetrics.map((m) => ({
        timestamp: m.period.end,
        value: m.successRate,
        sampleSize: m.totalIssues,
      })),
      'higher_is_better'
    )
  );

  // Reviewer catch rate trend
  trends.push(
    computeTrend(
      'reviewerCatchRate',
      historicalMetrics.map((m) => ({
        timestamp: m.period.end,
        value: m.reviewerCatchRate,
        sampleSize: m.totalIssues,
      })),
      'higher_is_better'
    )
  );

  // Cost per issue trend
  trends.push(
    computeTrend(
      'avgCostPerIssue',
      historicalMetrics.map((m) => ({
        timestamp: m.period.end,
        value: m.avgCostPerIssue,
        sampleSize: m.totalIssues,
      })),
      'lower_is_better'
    )
  );

  return trends;
}

/**
 * Compute a single trend.
 */
function computeTrend(
  metric: string,
  dataPoints: TrendDataPoint[],
  direction: 'higher_is_better' | 'lower_is_better'
): MetricsTrend {
  if (dataPoints.length < 2) {
    return {
      metric,
      dataPoints,
      trend: 'stable',
      percentChange: 0,
    };
  }

  // Sort by timestamp
  const sorted = [...dataPoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate percent change
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const percentChange = first !== 0 ? ((last - first) / first) * 100 : 0;

  // Determine trend direction
  let trend: 'improving' | 'stable' | 'declining';

  if (Math.abs(percentChange) < 5) {
    trend = 'stable';
  } else if (direction === 'higher_is_better') {
    trend = percentChange > 0 ? 'improving' : 'declining';
  } else {
    trend = percentChange < 0 ? 'improving' : 'declining';
  }

  return {
    metric,
    dataPoints: sorted,
    trend,
    percentChange,
  };
}

/**
 * Create empty aggregate metrics.
 */
function createEmptyAggregateMetrics(
  targetId: string,
  targetType: 'convoy' | 'epic'
): AggregateMetrics {
  const now = new Date().toISOString();

  return {
    targetId,
    targetType,
    period: { start: now, end: now },
    totalIssues: 0,
    completedIssues: 0,
    failedIssues: 0,
    inProgressIssues: 0,
    avgCycleTime: 0,
    medianCycleTime: 0,
    p90CycleTime: 0,
    avgIterations: 0,
    totalCorrections: 0,
    correctionRate: 0,
    issuesWithRetries: 0,
    totalReviewerFindings: 0,
    findingsByReviewer: {},
    reviewerCatchRate: 0,
    findingsRequiringRework: 0,
    totalCost: 0,
    avgCostPerIssue: 0,
    costPerSuccess: 0,
    successRate: 0,
    firstTimeSuccessRate: 0,
    byComplexity: {},
  };
}

// Helper functions

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
