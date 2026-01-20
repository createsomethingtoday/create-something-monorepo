/**
 * @create-something/orchestration
 *
 * Metrics storage and reporting.
 *
 * Philosophy: Persist metrics to Git for historical analysis.
 * Generate reports that surface actionable insights.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  WorkMetrics,
  AggregateMetrics,
  MetricsTrend,
  StoredMetrics,
} from './types.js';
import { formatDate } from '../utils/format.js';

const execAsync = promisify(exec);

const METRICS_DIR = '.orchestration/metrics';

/**
 * Save metrics to Git storage.
 */
export async function saveMetrics(
  targetId: string,
  issues: WorkMetrics[],
  aggregate: AggregateMetrics,
  trends: MetricsTrend[],
  cwd: string = process.cwd()
): Promise<StoredMetrics> {
  const stored: StoredMetrics = {
    issues,
    aggregate,
    trends,
    updatedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const dir = path.join(cwd, METRICS_DIR);
  await fs.mkdir(dir, { recursive: true });

  // Write metrics file
  const filePath = path.join(dir, `${targetId}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');

  // Commit to Git
  try {
    await execAsync(`git add "${filePath}"`, { cwd });
    await execAsync(
      `git commit -m "Metrics: ${targetId}\n\nIssues: ${issues.length}\nSuccess rate: ${(aggregate.successRate * 100).toFixed(0)}%"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit metrics to Git:', error);
  }

  return stored;
}

/**
 * Load metrics by target ID.
 */
export async function loadMetrics(
  targetId: string,
  cwd: string = process.cwd()
): Promise<StoredMetrics | null> {
  const filePath = path.join(cwd, METRICS_DIR, `${targetId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StoredMetrics;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all metrics files.
 */
export async function listMetrics(
  cwd: string = process.cwd()
): Promise<StoredMetrics[]> {
  const dir = path.join(cwd, METRICS_DIR);

  try {
    const files = await fs.readdir(dir);
    const metricsFiles = files.filter((f) => f.endsWith('.json'));

    const metrics = await Promise.all(
      metricsFiles.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        return JSON.parse(content) as StoredMetrics;
      })
    );

    // Sort by update time (newest first)
    metrics.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return metrics;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Generate a markdown report of metrics.
 */
export function generateMetricsReport(stored: StoredMetrics): string {
  const lines: string[] = [];
  const agg = stored.aggregate;

  lines.push(`# Metrics Report: ${agg.targetId}`);
  lines.push('');
  lines.push(`**Type**: ${agg.targetType}`);
  lines.push(`**Period**: ${formatDate(agg.period.start)} - ${formatDate(agg.period.end)}`);
  lines.push(`**Updated**: ${formatDate(stored.updatedAt)}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Issues | ${agg.totalIssues} |`);
  lines.push(`| Completed | ${agg.completedIssues} |`);
  lines.push(`| Failed | ${agg.failedIssues} |`);
  lines.push(`| Success Rate | ${(agg.successRate * 100).toFixed(0)}% |`);
  lines.push(`| First-Time Success | ${(agg.firstTimeSuccessRate * 100).toFixed(0)}% |`);
  lines.push('');

  // Time metrics
  lines.push('## Cycle Time');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Average | ${agg.avgCycleTime.toFixed(0)} min |`);
  lines.push(`| Median | ${agg.medianCycleTime.toFixed(0)} min |`);
  lines.push(`| 90th Percentile | ${agg.p90CycleTime.toFixed(0)} min |`);
  lines.push('');

  // Iteration metrics
  lines.push('## Iterations');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Avg Iterations | ${agg.avgIterations.toFixed(1)} |`);
  lines.push(`| Total Corrections | ${agg.totalCorrections} |`);
  lines.push(`| Correction Rate | ${(agg.correctionRate * 100).toFixed(0)}% |`);
  lines.push(`| Issues with Retries | ${agg.issuesWithRetries} |`);
  lines.push('');

  // Review metrics
  lines.push('## Reviewer Efficacy');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Findings | ${agg.totalReviewerFindings} |`);
  lines.push(`| Catch Rate | ${(agg.reviewerCatchRate * 100).toFixed(0)}% |`);
  lines.push(`| Findings Requiring Rework | ${agg.findingsRequiringRework} |`);
  lines.push('');

  if (Object.keys(agg.findingsByReviewer).length > 0) {
    lines.push('**By Reviewer**:');
    lines.push('');
    lines.push(`| Reviewer | Findings |`);
    lines.push(`|----------|----------|`);
    for (const [reviewer, count] of Object.entries(agg.findingsByReviewer)) {
      lines.push(`| ${reviewer} | ${count} |`);
    }
    lines.push('');
  }

  // Cost metrics
  lines.push('## Cost');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Cost | $${agg.totalCost.toFixed(4)} |`);
  lines.push(`| Avg per Issue | $${agg.avgCostPerIssue.toFixed(4)} |`);
  lines.push(`| Cost per Success | $${agg.costPerSuccess.toFixed(4)} |`);
  lines.push('');

  // Complexity breakdown
  if (Object.keys(agg.byComplexity).length > 0) {
    lines.push('## By Complexity');
    lines.push('');
    lines.push(`| Complexity | Count | Avg Cycle | Avg Iterations | Success Rate | Avg Cost |`);
    lines.push(`|------------|-------|-----------|----------------|--------------|----------|`);
    for (const [complexity, metrics] of Object.entries(agg.byComplexity)) {
      lines.push(
        `| ${complexity} | ${metrics.count} | ${metrics.avgCycleTime.toFixed(0)} min | ${metrics.avgIterations.toFixed(1)} | ${(metrics.successRate * 100).toFixed(0)}% | $${metrics.avgCost.toFixed(4)} |`
      );
    }
    lines.push('');
  }

  // Trends
  if (stored.trends.length > 0) {
    lines.push('## Trends');
    lines.push('');
    lines.push(`| Metric | Trend | Change |`);
    lines.push(`|--------|-------|--------|`);
    for (const trend of stored.trends) {
      const icon = trend.trend === 'improving' ? '📈' : trend.trend === 'declining' ? '📉' : '➡️';
      const change = trend.percentChange >= 0 ? `+${trend.percentChange.toFixed(0)}%` : `${trend.percentChange.toFixed(0)}%`;
      lines.push(`| ${trend.metric} | ${icon} ${trend.trend} | ${change} |`);
    }
    lines.push('');
  }

  // Individual issues (top 10 by cycle time)
  if (stored.issues.length > 0) {
    lines.push('## Top Issues by Cycle Time');
    lines.push('');
    lines.push(`| Issue | Cycle Time | Iterations | Cost | Status |`);
    lines.push(`|-------|------------|------------|------|--------|`);

    const sorted = [...stored.issues]
      .filter((i) => i.cycleTimeMinutes > 0)
      .sort((a, b) => b.cycleTimeMinutes - a.cycleTimeMinutes)
      .slice(0, 10);

    for (const issue of sorted) {
      const status = issue.successful ? '✓' : '✗';
      lines.push(
        `| ${issue.issueId} | ${issue.cycleTimeMinutes.toFixed(0)} min | ${issue.iterations} | $${issue.costUsd.toFixed(4)} | ${status} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
