/**
 * @create-something/harness
 *
 * Review Pipeline: Orchestrates peer review at checkpoint boundaries.
 * Philosophy: Compound autonomy—humans review reviewer summaries, not raw code.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  ReviewPipelineConfig,
  ReviewContext,
  ReviewResult,
  ReviewAggregation,
  ReviewOutcome,
  Checkpoint,
  BeadsIssue,
  DEFAULT_REVIEW_PIPELINE_CONFIG,
  SessionOutcome,
} from './types.js';
import { runReviewer, getOutcomeIcon } from './reviewer.js';
import {
  createFailureTracker,
  type FailureTracker,
  getEffectiveModel,
  recordSuccessfulRetry,
} from './failure-handler.js';
import {
  runMetaReview,
  formatMetaReviewDisplay,
  DEFAULT_META_REVIEW_CONFIG,
  type MetaReviewConfig,
  type MetaReviewResult,
} from './meta-review.js';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// Context Building
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build review context from checkpoint data.
 * Enhanced: Now includes full harness diff for DRY violation detection.
 */
export async function buildReviewContext(
  checkpoint: Checkpoint,
  completedIssues: BeadsIssue[],
  cwd: string
): Promise<ReviewContext> {
  let gitDiff = '';
  let filesChanged: string[] = [];
  let recentCommits: string[] = [];
  let fullHarnessDiff = '';

  // Get git diff since start of checkpoint period
  // We estimate this by looking at commits proportional to completed issues
  const commitCount = Math.max(checkpoint.issuesCompleted.length, 5);

  try {
    // Get diff of recent changes (checkpoint period)
    const { stdout: diff } = await execAsync(`git diff HEAD~${commitCount}..HEAD 2>/dev/null || git diff HEAD~1..HEAD 2>/dev/null || echo ""`, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });
    gitDiff = diff;

    // NEW: Get full harness diff for DRY detection
    // Try to diff against main/master to see all harness changes
    try {
      const { stdout: harnessDiff } = await execAsync(
        `git diff main...HEAD 2>/dev/null || git diff master...HEAD 2>/dev/null || echo ""`,
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );
      fullHarnessDiff = harnessDiff;
    } catch {
      // Fall back to more commits if main/master not available
      try {
        const { stdout: harnessDiff } = await execAsync(`git diff HEAD~20..HEAD 2>/dev/null || echo ""`, {
          cwd,
          maxBuffer: 10 * 1024 * 1024,
        });
        fullHarnessDiff = harnessDiff;
      } catch {
        // Use checkpoint diff as fallback
        fullHarnessDiff = gitDiff;
      }
    }

    const { stdout: files } = await execAsync(
      `git diff --name-only HEAD~${commitCount}..HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD 2>/dev/null || echo ""`,
      { cwd }
    );
    filesChanged = files.trim().split('\n').filter(Boolean);
  } catch {
    // Fallback: try to get any recent diff
    try {
      const { stdout: diff } = await execAsync('git diff HEAD~1..HEAD 2>/dev/null || echo ""', { cwd });
      gitDiff = diff;

      const { stdout: files } = await execAsync(
        'git diff --name-only HEAD~1..HEAD 2>/dev/null || echo ""',
        { cwd }
      );
      filesChanged = files.trim().split('\n').filter(Boolean);
    } catch {
      // No git history available
    }
  }

  // Get recent commits for context
  try {
    const { stdout } = await execAsync('git log --oneline -10 2>/dev/null || echo ""', { cwd });
    recentCommits = stdout.trim().split('\n').filter(Boolean);
  } catch {
    // No commits available
  }

  return {
    checkpointId: checkpoint.id,
    harnessId: checkpoint.harnessId,
    gitDiff,
    fullHarnessDiff,
    completedIssues,
    filesChanged,
    recentCommits,
    checkpointSummary: checkpoint.summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full review pipeline.
 */
export async function runReviewPipeline(
  checkpoint: Checkpoint,
  completedIssues: BeadsIssue[],
  config: ReviewPipelineConfig,
  cwd: string
): Promise<ReviewAggregation> {
  const context = await buildReviewContext(checkpoint, completedIssues, cwd);

  // Filter to enabled reviewers
  const enabledReviewers = config.reviewers.filter((r) => r.enabled);

  if (enabledReviewers.length === 0) {
    // No reviewers enabled, return pass-through
    return {
      checkpointId: checkpoint.id,
      reviewers: [],
      overallOutcome: 'pass',
      overallConfidence: 1.0,
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0,
      shouldAdvance: true,
      blockingReasons: [],
      timestamp: new Date().toISOString(),
    };
  }

  console.log(`\n🔍 Running peer review: ${enabledReviewers.length} reviewer(s)`);

  // Create failure tracker for reviewers (enables model escalation)
  const failureTracker = createFailureTracker();

  // Run reviewers in parallel (respecting maxParallelReviewers)
  const results: ReviewResult[] = [];

  for (let i = 0; i < enabledReviewers.length; i += config.maxParallelReviewers) {
    const batch = enabledReviewers.slice(i, i + config.maxParallelReviewers);

    console.log(`  Batch ${Math.floor(i / config.maxParallelReviewers) + 1}: ${batch.map((r) => r.id).join(', ')}`);

    const batchResults = await Promise.all(
      batch.map((reviewer) => {
        console.log(`    [${reviewer.id}] Starting ${reviewer.type} review...`);
        return runReviewer(reviewer, context, {
          cwd,
          timeoutMs: config.reviewerTimeoutMs,
          failureTracker,
        });
      })
    );

    for (const result of batchResults) {
      const icon = getOutcomeIcon(result.outcome);
      const findingsText =
        result.findings.length > 0 ? `(${result.findings.length} findings)` : '';
      const modelText = result.model ? ` [${result.model}]` : '';
      console.log(
        `    [${result.reviewerId}] ${icon} ${result.outcome}${modelText} ${findingsText} - ${result.summary.slice(0, 60)}...`
      );

      // Track result in failure tracker (for future escalation)
      if (result.outcome !== 'pass' && result.outcome !== 'pass_with_findings') {
        // Convert ReviewOutcome to SessionOutcome
        const sessionOutcome: SessionOutcome = result.outcome === 'error' ? 'failure' : 'partial';

        const existingRecord = failureTracker.records.get(result.reviewerId) || {
          issueId: result.reviewerId,
          attempts: [],
          lastOutcome: sessionOutcome,
          finalAction: 'retry',
        };

        existingRecord.attempts.push({
          attemptNumber: existingRecord.attempts.length + 1,
          timestamp: new Date().toISOString(),
          outcome: sessionOutcome,
          error: result.error || null,
          durationMs: result.durationMs,
          model: result.model,
        });

        existingRecord.lastOutcome = sessionOutcome;
        failureTracker.records.set(result.reviewerId, existingRecord);
        failureTracker.totalFailures++;
      } else {
        // Successful review
        const attemptCount = failureTracker.records.get(result.reviewerId)?.attempts.length || 0;
        if (attemptCount > 0) {
          recordSuccessfulRetry(failureTracker, result.reviewerId);
        }
      }

      results.push(result);
    }
  }

  // Aggregate results
  const aggregation = aggregateReviewResults(checkpoint.id, results, config);

  // Run meta-review if enabled and there are sufficient findings
  const metaReviewConfig = DEFAULT_META_REVIEW_CONFIG; // TODO: Accept from config
  if (metaReviewConfig.enabled && aggregation.totalFindings >= metaReviewConfig.minFindingsThreshold) {
    console.log('\n🔬 Running meta-review to synthesize patterns...');
    const metaReview = await runMetaReview(aggregation, metaReviewConfig);

    console.log(formatMetaReviewDisplay(metaReview));

    // Store meta-review in aggregation for later use
    (aggregation as any).metaReview = metaReview;
  }

  return aggregation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Aggregation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate multiple review results into a single decision.
 */
export function aggregateReviewResults(
  checkpointId: string,
  results: ReviewResult[],
  config: ReviewPipelineConfig
): ReviewAggregation {
  // Count findings by severity
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  for (const result of results) {
    for (const finding of result.findings) {
      switch (finding.severity) {
        case 'critical':
          criticalCount++;
          break;
        case 'high':
          highCount++;
          break;
        case 'medium':
          mediumCount++;
          break;
        case 'low':
          lowCount++;
          break;
        case 'info':
          infoCount++;
          break;
      }
    }
  }

  // Determine overall outcome
  const hasError = results.some((r) => r.outcome === 'error');
  const hasFail = results.some((r) => r.outcome === 'fail');
  const hasFindings = results.some((r) => r.outcome === 'pass_with_findings');

  let overallOutcome: ReviewOutcome;
  if (hasError) overallOutcome = 'error';
  else if (hasFail) overallOutcome = 'fail';
  else if (hasFindings) overallOutcome = 'pass_with_findings';
  else overallOutcome = 'pass';

  // Calculate overall confidence
  const confidences = results.filter((r) => r.outcome !== 'error').map((r) => r.confidence);
  const overallConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  // Determine if should advance
  const blockingReasons: string[] = [];

  if (config.blockOnCritical && criticalCount > 0) {
    blockingReasons.push(`${criticalCount} critical finding(s)`);
  }
  if (config.blockOnHigh && highCount > 0) {
    blockingReasons.push(`${highCount} high finding(s)`);
  }
  if (overallConfidence < config.minConfidenceToAdvance) {
    blockingReasons.push(
      `Confidence ${(overallConfidence * 100).toFixed(0)}% below threshold ${(config.minConfidenceToAdvance * 100).toFixed(0)}%`
    );
  }

  // Check if any blocking reviewer failed
  for (const result of results) {
    const reviewerConfig = config.reviewers.find((r) => r.id === result.reviewerId);
    if (reviewerConfig?.canBlock && result.outcome === 'fail') {
      blockingReasons.push(`Blocking reviewer failed: ${result.reviewerId}`);
    }
  }

  const shouldAdvance = blockingReasons.length === 0;

  return {
    checkpointId,
    reviewers: results,
    overallOutcome,
    overallConfidence,
    totalFindings: criticalCount + highCount + mediumCount + lowCount + infoCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    shouldAdvance,
    blockingReasons,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format review aggregation for display.
 */
export function formatReviewDisplay(aggregation: ReviewAggregation): string {
  const lines: string[] = [];

  lines.push('┌─────────────────────────────────────────────────────────────┐');
  lines.push('│  PEER REVIEW SUMMARY                                        │');
  lines.push('├─────────────────────────────────────────────────────────────┤');

  // Outcome
  const outcomeIcon = getOutcomeIcon(aggregation.overallOutcome);
  lines.push(
    `│  Outcome: ${outcomeIcon} ${aggregation.overallOutcome.toUpperCase().padEnd(20)}              │`
  );
  lines.push(
    `│  Confidence: ${(aggregation.overallConfidence * 100).toFixed(0)}%`.padEnd(60) + '│'
  );

  // Findings summary
  if (aggregation.totalFindings > 0) {
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│  Findings: ${aggregation.totalFindings}`.padEnd(60) + '│');
    if (aggregation.criticalCount > 0) {
      lines.push(`│    🔴 Critical: ${aggregation.criticalCount}`.padEnd(60) + '│');
    }
    if (aggregation.highCount > 0) {
      lines.push(`│    🟠 High: ${aggregation.highCount}`.padEnd(60) + '│');
    }
    if (aggregation.mediumCount > 0) {
      lines.push(`│    🟡 Medium: ${aggregation.mediumCount}`.padEnd(60) + '│');
    }
    if (aggregation.lowCount > 0) {
      lines.push(`│    🔵 Low: ${aggregation.lowCount}`.padEnd(60) + '│');
    }
    if (aggregation.infoCount > 0) {
      lines.push(`│    ⚪ Info: ${aggregation.infoCount}`.padEnd(60) + '│');
    }
  }

  // Per-reviewer breakdown
  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push('│  Reviewers:'.padEnd(60) + '│');
  for (const result of aggregation.reviewers) {
    const icon = getOutcomeIcon(result.outcome);
    const findingsCount = result.findings.length;
    const line = `│    ${icon} ${result.reviewerId.padEnd(15)} ${result.outcome.padEnd(18)} (${findingsCount})`;
    lines.push(line.padEnd(60) + '│');
  }

  // Decision
  lines.push('├─────────────────────────────────────────────────────────────┤');
  if (aggregation.shouldAdvance) {
    lines.push('│  ✅ AUTO-ADVANCING - All checks passed                       │');
  } else {
    lines.push('│  ⏸️  PAUSING FOR REVIEW                                       │');
    for (const reason of aggregation.blockingReasons.slice(0, 3)) {
      lines.push(`│    • ${reason.slice(0, 50)}`.padEnd(60) + '│');
    }
  }

  lines.push('└─────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Format review findings for a detailed report.
 */
export function formatFindingsReport(aggregation: ReviewAggregation): string {
  const lines: string[] = [];

  lines.push('# Peer Review Findings\n');
  lines.push(`**Checkpoint**: ${aggregation.checkpointId}`);
  lines.push(`**Timestamp**: ${aggregation.timestamp}`);
  lines.push(`**Overall**: ${aggregation.overallOutcome} (${(aggregation.overallConfidence * 100).toFixed(0)}% confidence)\n`);

  for (const result of aggregation.reviewers) {
    if (result.findings.length === 0) continue;

    lines.push(`## ${result.reviewerId} (${result.reviewerType})\n`);
    lines.push(`${result.summary}\n`);

    for (const finding of result.findings) {
      const icon =
        finding.severity === 'critical'
          ? '🔴'
          : finding.severity === 'high'
            ? '🟠'
            : finding.severity === 'medium'
              ? '🟡'
              : finding.severity === 'low'
                ? '🔵'
                : '⚪';

      lines.push(`### ${icon} ${finding.title}\n`);
      lines.push(`**Severity**: ${finding.severity}`);
      lines.push(`**Category**: ${finding.category}`);
      if (finding.file) {
        lines.push(`**File**: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
      }
      lines.push('');
      lines.push(finding.description);
      if (finding.suggestion) {
        lines.push('');
        lines.push(`**Suggestion**: ${finding.suggestion}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
