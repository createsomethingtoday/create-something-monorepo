/**
 * @create-something/harness
 *
 * Aggregation: Combine results across parallel sessions.
 *
 * Philosophy: Parallel execution reveals the true shape of work.
 * Aggregation makes that shape visible—efficiency, throughput, time saved.
 */

import type {
  SessionResult,
  ParallelSessionResult,
  AggregatedResults,
  BatchStats,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Batch Statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate statistics for a single parallel batch.
 */
export function calculateBatchStats(
  results: SessionResult[],
  totalDurationMs: number,
  agentCount: number
): BatchStats {
  if (results.length === 0) {
    return {
      agentCount,
      successRate: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      minDurationMs: 0,
      throughput: 0,
      efficiency: 0,
    };
  }

  const durations = results.map((r) => r.durationMs);
  const successCount = results.filter((r) => r.outcome === 'success').length;
  const totalSessionTime = durations.reduce((sum, d) => sum + d, 0);

  // Throughput: sessions per minute
  const throughput = totalDurationMs > 0
    ? (results.length / totalDurationMs) * 60000
    : 0;

  // Efficiency: how well we utilized parallel capacity
  // 1.0 = perfect (all agents working constantly), <1.0 = idle time
  // Calculated as: (sum of actual work time) / (wall time * agent count)
  const maxPossibleWork = totalDurationMs * agentCount;
  const efficiency = maxPossibleWork > 0
    ? Math.min(1, totalSessionTime / maxPossibleWork)
    : 0;

  return {
    agentCount,
    successRate: successCount / results.length,
    avgDurationMs: totalSessionTime / results.length,
    maxDurationMs: Math.max(...durations),
    minDurationMs: Math.min(...durations),
    throughput,
    efficiency,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Aggregator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregator that accumulates results across multiple parallel batches.
 */
export interface ResultAggregator {
  /** All batch results */
  batches: ParallelSessionResult[];
  /** Running total of wall clock time */
  totalWallTimeMs: number;
  /** Start time of aggregation */
  startTime: number;
}

/**
 * Create a new result aggregator.
 */
export function createResultAggregator(): ResultAggregator {
  return {
    batches: [],
    totalWallTimeMs: 0,
    startTime: Date.now(),
  };
}

/**
 * Add a parallel batch result to the aggregator.
 */
export function addBatchResult(
  aggregator: ResultAggregator,
  batch: ParallelSessionResult
): void {
  aggregator.batches.push(batch);
  aggregator.totalWallTimeMs += batch.totalDurationMs;
}

/**
 * Add a sequential (single-session) result to the aggregator.
 * Wraps it in a batch with stats for consistent handling.
 */
export function addSequentialResult(
  aggregator: ResultAggregator,
  result: SessionResult
): void {
  const batch: ParallelSessionResult = {
    results: [result],
    completed: result.outcome === 'success' ? [result.issueId] : [],
    failed: result.outcome === 'failure' ? [result.issueId] : [],
    totalDurationMs: result.durationMs,
    allSucceeded: result.outcome === 'success',
    stats: calculateBatchStats([result], result.durationMs, 1),
  };
  addBatchResult(aggregator, batch);
}

/**
 * Compute aggregated results from all batches.
 */
export function computeAggregatedResults(
  aggregator: ResultAggregator
): AggregatedResults {
  const allResults: SessionResult[] = [];
  const gitCommits: string[] = [];
  let cumulativeSessionTimeMs = 0;

  for (const batch of aggregator.batches) {
    for (const result of batch.results) {
      allResults.push(result);
      cumulativeSessionTimeMs += result.durationMs;
      if (result.gitCommit) {
        gitCommits.push(result.gitCommit);
      }
    }
  }

  const successfulSessions = allResults.filter((r) => r.outcome === 'success').length;
  const failedSessions = allResults.filter((r) => r.outcome === 'failure').length;
  const partialSessions = allResults.filter(
    (r) => r.outcome === 'partial' || r.outcome === 'context_overflow'
  ).length;

  const totalSessions = allResults.length;
  const totalWallTimeMs = aggregator.totalWallTimeMs;

  // Time saved = cumulative time - wall time
  // (How much time we would have spent if running sequentially)
  const timeSavedMs = Math.max(0, cumulativeSessionTimeMs - totalWallTimeMs);

  // Overall success rate
  const overallSuccessRate = totalSessions > 0
    ? successfulSessions / totalSessions
    : 0;

  // Overall throughput
  const overallThroughput = totalWallTimeMs > 0
    ? (totalSessions / totalWallTimeMs) * 60000
    : 0;

  // Average batch efficiency
  const avgBatchEfficiency = aggregator.batches.length > 0
    ? aggregator.batches.reduce((sum, b) => sum + b.stats.efficiency, 0) /
      aggregator.batches.length
    : 0;

  return {
    allResults,
    batches: aggregator.batches,
    totalSessions,
    successfulSessions,
    failedSessions,
    partialSessions,
    totalWallTimeMs,
    cumulativeSessionTimeMs,
    timeSavedMs,
    overallSuccessRate,
    overallThroughput,
    avgBatchEfficiency,
    gitCommits,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format batch statistics for display.
 */
export function formatBatchStats(stats: BatchStats): string {
  const lines: string[] = [];

  lines.push(`  Agents: ${stats.agentCount}`);
  lines.push(`  Success Rate: ${(stats.successRate * 100).toFixed(0)}%`);
  lines.push(`  Avg Duration: ${formatDuration(stats.avgDurationMs)}`);
  lines.push(`  Range: ${formatDuration(stats.minDurationMs)} - ${formatDuration(stats.maxDurationMs)}`);
  lines.push(`  Throughput: ${stats.throughput.toFixed(1)} sessions/min`);
  lines.push(`  Efficiency: ${(stats.efficiency * 100).toFixed(0)}%`);

  return lines.join('\n');
}

/**
 * Format aggregated results for display.
 */
export function formatAggregatedResults(results: AggregatedResults): string {
  const lines: string[] = [];

  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`  AGGREGATED RESULTS`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push('');
  lines.push(`  Sessions: ${results.totalSessions}`);
  lines.push(`    ✓ Successful: ${results.successfulSessions}`);
  lines.push(`    ✗ Failed: ${results.failedSessions}`);
  lines.push(`    ◐ Partial: ${results.partialSessions}`);
  lines.push('');
  lines.push(`  Time:`);
  lines.push(`    Wall Clock: ${formatDuration(results.totalWallTimeMs)}`);
  lines.push(`    Sequential Would Be: ${formatDuration(results.cumulativeSessionTimeMs)}`);
  lines.push(`    Time Saved: ${formatDuration(results.timeSavedMs)}`);
  lines.push('');
  lines.push(`  Performance:`);
  lines.push(`    Success Rate: ${(results.overallSuccessRate * 100).toFixed(0)}%`);
  lines.push(`    Throughput: ${results.overallThroughput.toFixed(1)} sessions/min`);
  lines.push(`    Avg Batch Efficiency: ${(results.avgBatchEfficiency * 100).toFixed(0)}%`);
  lines.push('');
  lines.push(`  Batches: ${results.batches.length}`);
  lines.push(`  Commits: ${results.gitCommits.length}`);
  lines.push(`═══════════════════════════════════════════════════════════════`);

  return lines.join('\n');
}

/**
 * Format a summary line for aggregated results.
 */
export function formatAggregatedSummary(results: AggregatedResults): string {
  const timeSavedPct = results.cumulativeSessionTimeMs > 0
    ? (results.timeSavedMs / results.cumulativeSessionTimeMs) * 100
    : 0;

  if (results.batches.length > 1 && results.timeSavedMs > 0) {
    return `${results.successfulSessions}/${results.totalSessions} sessions succeeded across ${results.batches.length} batches. ` +
           `Parallel execution saved ${formatDuration(results.timeSavedMs)} (${timeSavedPct.toFixed(0)}%).`;
  }

  return `${results.successfulSessions}/${results.totalSessions} sessions succeeded.`;
}

/**
 * Format duration in human-readable form.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate checkpoint summary from aggregated results.
 * Provides richer context than individual session summaries.
 */
export function generateAggregatedCheckpointSummary(
  results: AggregatedResults,
  featuresCompleted: number,
  featuresTotal: number
): string {
  const lines: string[] = [];

  // Main progress line
  lines.push(formatAggregatedSummary(results));
  lines.push('');

  // Feature progress
  lines.push(`Overall progress: ${featuresCompleted}/${featuresTotal} features.`);

  // Parallel efficiency insight
  if (results.batches.length > 1) {
    lines.push('');
    if (results.avgBatchEfficiency >= 0.8) {
      lines.push(`Parallel efficiency: Excellent (${(results.avgBatchEfficiency * 100).toFixed(0)}%)`);
    } else if (results.avgBatchEfficiency >= 0.5) {
      lines.push(`Parallel efficiency: Good (${(results.avgBatchEfficiency * 100).toFixed(0)}%)`);
    } else {
      lines.push(`Parallel efficiency: Could improve (${(results.avgBatchEfficiency * 100).toFixed(0)}%)`);
    }
  }

  return lines.join('\n');
}
