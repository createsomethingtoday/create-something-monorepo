/**
 * @create-something/harness
 *
 * Meta-Review: Bloom-inspired pattern for synthesizing cross-cutting patterns
 * from individual reviewer findings.
 *
 * Philosophy: Individual reviewers see trees; meta-review sees the forest.
 * After all reviewers complete, meta-review discovers patterns that span
 * multiple reviews—issues that only become visible when synthesizing findings.
 *
 * Pattern from Anthropic's Bloom (December 2024):
 * "After all rollouts, synthesize suite-level patterns"
 */

import type {
  ReviewAggregation,
  ReviewResult,
  ReviewFinding,
  BeadsIssue,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MetaReviewResult {
  /** Overall synthesis of all reviewer findings */
  synthesis: string;
  /** Cross-cutting patterns discovered across reviewers */
  patterns: CrossCuttingPattern[];
  /** Issues to create in Beads */
  discoveredIssues: DiscoveredIssue[];
  /** Whether meta-review found critical systemic issues */
  hasSystemicIssues: boolean;
  /** Model used for meta-review */
  model: 'opus' | 'sonnet' | 'haiku';
  /** Confidence in the meta-analysis (0-1) */
  confidence: number;
}

export interface CrossCuttingPattern {
  /** Pattern ID (e.g., "all-reviewers-flag-auth") */
  id: string;
  /** Human-readable pattern description */
  description: string;
  /** Reviewers that contributed to this pattern */
  reviewers: string[];
  /** Severity of this pattern (highest severity from contributing findings) */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Specific findings that form this pattern */
  contributingFindings: ReviewFinding[];
}

export interface DiscoveredIssue {
  /** Issue title */
  title: string;
  /** Issue description */
  description: string;
  /** Priority (0-4, P0=highest) */
  priority: number;
  /** Labels to apply */
  labels: string[];
  /** Source pattern that triggered this issue */
  sourcePattern: string;
}

export interface MetaReviewConfig {
  /** Whether meta-review is enabled */
  enabled: boolean;
  /** Use Opus for security-critical work */
  useOpusForSecurityCritical: boolean;
  /** Minimum findings to trigger meta-review (default: 3) */
  minFindingsThreshold: number;
  /** Create Beads issues for discovered patterns (default: true) */
  createBeadsIssues: boolean;
}

export const DEFAULT_META_REVIEW_CONFIG: MetaReviewConfig = {
  enabled: true,
  useOpusForSecurityCritical: true,
  minFindingsThreshold: 3,
  createBeadsIssues: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Model Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select model for meta-review based on aggregation results.
 *
 * Use Opus when:
 * - Security reviewers found critical/high findings
 * - Multiple reviewers flagged same area (potential systemic issue)
 * - Architecture reviewer found coupling issues
 *
 * Otherwise use Sonnet (cost-effective for synthesis).
 */
export function selectMetaReviewModel(aggregation: ReviewAggregation, config: MetaReviewConfig): 'opus' | 'sonnet' {
  if (!config.useOpusForSecurityCritical) {
    return 'sonnet';
  }

  // Check for security-critical indicators
  const hasSecurityFindings = aggregation.reviewers.some(
    (r) => r.reviewerType === 'security' && r.findings.some((f) => f.severity === 'critical' || f.severity === 'high')
  );

  const hasArchitectureFindings = aggregation.reviewers.some(
    (r) => r.reviewerType === 'architecture' && r.findings.some((f) => f.severity === 'high')
  );

  const hasCriticalFindings = aggregation.criticalCount > 0;
  const hasMultipleHighFindings = aggregation.highCount >= 2;

  if (hasSecurityFindings || hasCriticalFindings || (hasArchitectureFindings && hasMultipleHighFindings)) {
    return 'opus';
  }

  return 'sonnet';
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta-Review Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run meta-review on aggregated review results.
 *
 * This is a reference implementation showing the interface.
 * In practice, this would call an AI model to synthesize patterns.
 */
export async function runMetaReview(
  aggregation: ReviewAggregation,
  config: MetaReviewConfig = DEFAULT_META_REVIEW_CONFIG
): Promise<MetaReviewResult> {
  // Early exit if not enough findings to synthesize
  if (aggregation.totalFindings < config.minFindingsThreshold) {
    return {
      synthesis: 'Insufficient findings for meta-analysis',
      patterns: [],
      discoveredIssues: [],
      hasSystemicIssues: false,
      model: 'sonnet',
      confidence: 1.0,
    };
  }

  const model = selectMetaReviewModel(aggregation, config);

  // Prepare context for meta-review
  const context = buildMetaReviewContext(aggregation);

  // Call AI model to synthesize patterns
  const result = await synthesizePatterns(context, model);

  // Extract Beads issues from patterns if enabled
  if (config.createBeadsIssues) {
    result.discoveredIssues = extractBeadsIssues(result.patterns);
  }

  return result;
}

/**
 * Build context for meta-review prompt.
 */
function buildMetaReviewContext(aggregation: ReviewAggregation): string {
  const lines: string[] = [];

  lines.push('# Review Aggregation Summary');
  lines.push('');
  lines.push(`**Checkpoint**: ${aggregation.checkpointId}`);
  lines.push(`**Overall Outcome**: ${aggregation.overallOutcome}`);
  lines.push(`**Confidence**: ${(aggregation.overallConfidence * 100).toFixed(0)}%`);
  lines.push(`**Total Findings**: ${aggregation.totalFindings}`);
  lines.push('');

  // Per-reviewer summaries
  lines.push('## Reviewer Results');
  lines.push('');
  for (const result of aggregation.reviewers) {
    lines.push(`### ${result.reviewerId} (${result.reviewerType})`);
    lines.push(`- **Outcome**: ${result.outcome}`);
    lines.push(`- **Confidence**: ${(result.confidence * 100).toFixed(0)}%`);
    lines.push(`- **Summary**: ${result.summary}`);

    if (result.findings.length > 0) {
      lines.push(`- **Findings**: ${result.findings.length}`);
      for (const finding of result.findings) {
        lines.push(`  - [${finding.severity.toUpperCase()}] ${finding.title}`);
        if (finding.file) {
          lines.push(`    File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
        }
      }
    }
    lines.push('');
  }

  // Findings by severity
  if (aggregation.totalFindings > 0) {
    lines.push('## Findings by Severity');
    lines.push('');
    if (aggregation.criticalCount > 0) lines.push(`- **Critical**: ${aggregation.criticalCount}`);
    if (aggregation.highCount > 0) lines.push(`- **High**: ${aggregation.highCount}`);
    if (aggregation.mediumCount > 0) lines.push(`- **Medium**: ${aggregation.mediumCount}`);
    if (aggregation.lowCount > 0) lines.push(`- **Low**: ${aggregation.lowCount}`);
    if (aggregation.infoCount > 0) lines.push(`- **Info**: ${aggregation.infoCount}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Synthesize patterns from review results.
 *
 * This is a placeholder showing the interface.
 * In practice, this would call Claude Code API with meta-review prompt.
 */
async function synthesizePatterns(context: string, model: 'opus' | 'sonnet'): Promise<MetaReviewResult> {
  // TODO: Implement AI model call
  // For now, return a basic pattern detection based on heuristics

  const result: MetaReviewResult = {
    synthesis: 'Meta-review synthesis (placeholder)',
    patterns: [],
    discoveredIssues: [],
    hasSystemicIssues: false,
    model,
    confidence: 0.8,
  };

  // Placeholder pattern detection
  // In practice, this would be done by the AI model

  return result;
}

/**
 * Extract Beads issues from discovered patterns.
 */
function extractBeadsIssues(patterns: CrossCuttingPattern[]): DiscoveredIssue[] {
  const issues: DiscoveredIssue[] = [];

  for (const pattern of patterns) {
    // Skip low-severity patterns
    if (pattern.severity === 'low' || pattern.severity === 'info') {
      continue;
    }

    // Map severity to priority
    const priority = severityToPriority(pattern.severity);

    // Create issue
    issues.push({
      title: `[Meta-Review] ${pattern.description}`,
      description: `Pattern detected across ${pattern.reviewers.join(', ')} reviewers:\n\n${formatPatternFindings(pattern)}`,
      priority,
      labels: ['harness:supervisor', 'meta-review', `severity:${pattern.severity}`],
      sourcePattern: pattern.id,
    });
  }

  return issues;
}

/**
 * Map finding severity to Beads priority.
 */
function severityToPriority(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): number {
  const map: Record<string, number> = {
    critical: 0, // P0
    high: 1,     // P1
    medium: 2,   // P2
    low: 3,      // P3
    info: 4,     // P4
  };
  return map[severity] ?? 2;
}

/**
 * Format pattern findings for issue description.
 */
function formatPatternFindings(pattern: CrossCuttingPattern): string {
  const lines: string[] = [];

  lines.push(`**Reviewers**: ${pattern.reviewers.join(', ')}`);
  lines.push(`**Severity**: ${pattern.severity}`);
  lines.push('');
  lines.push('**Contributing Findings**:');

  for (const finding of pattern.contributingFindings) {
    lines.push(`- ${finding.title}`);
    if (finding.file) {
      lines.push(`  File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
    }
    if (finding.description) {
      lines.push(`  ${finding.description.slice(0, 100)}${finding.description.length > 100 ? '...' : ''}`);
    }
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format meta-review results for display.
 */
export function formatMetaReviewDisplay(result: MetaReviewResult): string {
  const lines: string[] = [];

  lines.push('┌─────────────────────────────────────────────────────────────┐');
  lines.push('│  META-REVIEW SYNTHESIS                                      │');
  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push(`│  Model: ${result.model.toUpperCase()}`.padEnd(60) + '│');
  lines.push(`│  Confidence: ${(result.confidence * 100).toFixed(0)}%`.padEnd(60) + '│');

  if (result.patterns.length > 0) {
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│  Cross-Cutting Patterns: ${result.patterns.length}`.padEnd(60) + '│');

    for (const pattern of result.patterns.slice(0, 3)) {
      const severityIcon =
        pattern.severity === 'critical'
          ? '🔴'
          : pattern.severity === 'high'
            ? '🟠'
            : pattern.severity === 'medium'
              ? '🟡'
              : '🔵';

      const line = `│    ${severityIcon} ${pattern.description.slice(0, 48)}`;
      lines.push(line.padEnd(60) + '│');
    }
  }

  if (result.discoveredIssues.length > 0) {
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│  Issues Created: ${result.discoveredIssues.length}`.padEnd(60) + '│');

    for (const issue of result.discoveredIssues.slice(0, 3)) {
      const line = `│    • ${issue.title.slice(0, 52)}`;
      lines.push(line.padEnd(60) + '│');
    }
  }

  if (result.hasSystemicIssues) {
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push('│  ⚠️  SYSTEMIC ISSUES DETECTED                                │');
  }

  lines.push('└─────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}
