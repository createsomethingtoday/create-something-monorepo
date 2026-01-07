/**
 * @create-something/harness
 *
 * Review Beads Integration: Store review findings in Beads issues.
 * Philosophy: Findings become trackable issues for human review and resolution.
 */

import type { ReviewAggregation, ReviewFinding } from './types.js';
import { createIssue, addDependency } from './beads.js';

// ─────────────────────────────────────────────────────────────────────────────
// Review Issue Creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a review summary issue for a checkpoint.
 * Links to the checkpoint and contains all findings.
 */
export async function createReviewIssue(
  aggregation: ReviewAggregation,
  harnessId: string,
  cwd: string
): Promise<string> {
  const description = formatReviewDescription(aggregation);

  // Determine priority based on findings
  let priority = 2; // Default medium
  if (aggregation.criticalCount > 0) {
    priority = 0; // Critical → P0
  } else if (aggregation.highCount > 0) {
    priority = 1; // High → P1
  }

  const result = await createIssue(
    `Review: ${aggregation.overallOutcome} (${aggregation.totalFindings} findings)`,
    {
      type: 'task',
      priority,
      labels: [
        'review',
        `harness:${harnessId}`,
        `review:${aggregation.overallOutcome}`,
        ...(aggregation.criticalCount > 0 ? ['severity:critical'] : []),
        ...(aggregation.highCount > 0 ? ['severity:high'] : []),
      ],
      description,
    },
    cwd
  );

  // createIssue returns string when not in dry-run mode
  const issueId = result as string;

  // Link to the checkpoint
  try {
    await addDependency(issueId, aggregation.checkpointId, 'related', cwd);
  } catch {
    // Non-fatal if linking fails
    console.log(`  [Warning] Could not link review to checkpoint ${aggregation.checkpointId}`);
  }

  return issueId;
}

/**
 * Create individual issues for critical and high severity findings.
 * These become actionable items for the team to resolve.
 */
export async function createFindingIssues(
  aggregation: ReviewAggregation,
  harnessId: string,
  cwd: string
): Promise<string[]> {
  const issueIds: string[] = [];

  // Collect critical and high findings from all reviewers
  const importantFindings: Array<{ finding: ReviewFinding; reviewerId: string }> = [];

  for (const result of aggregation.reviewers) {
    for (const finding of result.findings) {
      if (finding.severity === 'critical' || finding.severity === 'high') {
        importantFindings.push({ finding, reviewerId: result.reviewerId });
      }
    }
  }

  // Create issues for each important finding
  for (const { finding, reviewerId } of importantFindings) {
    try {
      const result = await createIssue(
        `[${finding.severity.toUpperCase()}] ${finding.title}`,
        {
          type: 'bug', // Findings are bugs to fix
          priority: finding.severity === 'critical' ? 0 : 1,
          labels: [
            'review-finding',
            `harness:${harnessId}`,
            `severity:${finding.severity}`,
            `category:${finding.category}`,
            `reviewer:${reviewerId}`,
          ],
          description: formatFindingDescription(finding, reviewerId),
        },
        cwd
      );
      // createIssue returns string when not in dry-run mode
      const issueId = result as string;
      issueIds.push(issueId);
    } catch (error) {
      console.log(`  [Warning] Could not create issue for finding: ${finding.title}`);
    }
  }

  console.log(`  Created ${issueIds.length} finding issue(s)`);
  return issueIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Description Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format the review aggregation as a markdown description.
 */
function formatReviewDescription(aggregation: ReviewAggregation): string {
  const lines: string[] = [];

  lines.push('## Review Summary');
  lines.push(`- **Outcome**: ${aggregation.overallOutcome}`);
  lines.push(`- **Confidence**: ${(aggregation.overallConfidence * 100).toFixed(0)}%`);
  lines.push(`- **Total Findings**: ${aggregation.totalFindings}`);
  lines.push(`- **Should Advance**: ${aggregation.shouldAdvance ? 'Yes' : 'No'}`);
  lines.push('');

  lines.push('## Findings by Severity');
  lines.push(`- Critical: ${aggregation.criticalCount}`);
  lines.push(`- High: ${aggregation.highCount}`);
  lines.push(`- Medium: ${aggregation.mediumCount}`);
  lines.push(`- Low: ${aggregation.lowCount}`);
  lines.push(`- Info: ${aggregation.infoCount}`);
  lines.push('');

  if (aggregation.blockingReasons.length > 0) {
    lines.push('## Blocking Reasons');
    for (const reason of aggregation.blockingReasons) {
      lines.push(`- ${reason}`);
    }
    lines.push('');
  }

  lines.push('## Reviewer Results');
  for (const result of aggregation.reviewers) {
    const icon =
      result.outcome === 'pass'
        ? '✅'
        : result.outcome === 'pass_with_findings'
          ? '⚠️'
          : result.outcome === 'fail'
            ? '❌'
            : '💥';
    lines.push(`### ${icon} ${result.reviewerId} (${result.reviewerType})`);
    lines.push(`- **Outcome**: ${result.outcome}`);
    lines.push(`- **Confidence**: ${(result.confidence * 100).toFixed(0)}%`);
    lines.push(`- **Summary**: ${result.summary}`);
    lines.push(`- **Findings**: ${result.findings.length}`);

    if (result.findings.length > 0) {
      lines.push('');
      lines.push('**Top Findings**:');
      // Show first 3 findings inline
      for (const finding of result.findings.slice(0, 3)) {
        const severityIcon =
          finding.severity === 'critical'
            ? '🔴'
            : finding.severity === 'high'
              ? '🟠'
              : finding.severity === 'medium'
                ? '🟡'
                : '🔵';
        lines.push(`- ${severityIcon} ${finding.title}`);
      }
      if (result.findings.length > 3) {
        lines.push(`- ... and ${result.findings.length - 3} more`);
      }
    }
    lines.push('');
  }

  lines.push('## Metadata');
  lines.push(`- **Checkpoint**: ${aggregation.checkpointId}`);
  lines.push(`- **Timestamp**: ${aggregation.timestamp}`);

  return lines.join('\n');
}

/**
 * Format a single finding as a markdown description.
 */
function formatFindingDescription(finding: ReviewFinding, reviewerId: string): string {
  const lines: string[] = [];

  lines.push('## Description');
  lines.push(finding.description);
  lines.push('');

  lines.push('## Details');
  lines.push(`- **Severity**: ${finding.severity}`);
  lines.push(`- **Category**: ${finding.category}`);
  lines.push(`- **Reviewer**: ${reviewerId}`);

  if (finding.file) {
    lines.push(`- **File**: \`${finding.file}\`${finding.line ? `:${finding.line}` : ''}`);
  }

  if (finding.suggestion) {
    lines.push('');
    lines.push('## Suggested Fix');
    lines.push(finding.suggestion);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a summary line for a review aggregation.
 */
export function getReviewSummaryLine(aggregation: ReviewAggregation): string {
  const icon =
    aggregation.overallOutcome === 'pass'
      ? '✅'
      : aggregation.overallOutcome === 'pass_with_findings'
        ? '⚠️'
        : aggregation.overallOutcome === 'fail'
          ? '❌'
          : '💥';

  const findingsSummary: string[] = [];
  if (aggregation.criticalCount > 0) findingsSummary.push(`${aggregation.criticalCount}C`);
  if (aggregation.highCount > 0) findingsSummary.push(`${aggregation.highCount}H`);
  if (aggregation.mediumCount > 0) findingsSummary.push(`${aggregation.mediumCount}M`);

  const findingsText =
    findingsSummary.length > 0 ? ` (${findingsSummary.join('/')})` : '';

  return `${icon} Review: ${aggregation.overallOutcome}${findingsText} - ${aggregation.shouldAdvance ? 'advancing' : 'paused'}`;
}
