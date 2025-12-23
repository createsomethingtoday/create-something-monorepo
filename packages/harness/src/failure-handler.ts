/**
 * @create-something/harness
 *
 * Failure Handler: Graceful handling of partial failures.
 *
 * Philosophy: Failures are information, not disasters.
 * The harness learns from failures and adjusts strategy accordingly.
 * "The tool recedes into transparent use"—failures should be handled
 * without requiring human intervention where possible.
 */

import type {
  SessionResult,
  SessionOutcome,
  FailureHandlingConfig,
  FailureRecord,
  FailureAttempt,
  FailureDecision,
  FailureAction,
  ModelEscalationLearning,
  BeadsIssue,
} from './types.js';
import { DEFAULT_FAILURE_HANDLING_CONFIG } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Failure Tracker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks failure state across the harness run.
 */
export interface FailureTracker {
  /** Failure records keyed by issue ID */
  records: Map<string, FailureRecord>;
  /** Count of consecutive failures (resets on success) */
  consecutiveFailures: number;
  /** Total failures across all issues */
  totalFailures: number;
  /** Total retries attempted */
  totalRetries: number;
  /** Total successful retries */
  successfulRetries: number;
}

/**
 * Create a new failure tracker.
 */
export function createFailureTracker(): FailureTracker {
  return {
    records: new Map(),
    consecutiveFailures: 0,
    totalFailures: 0,
    totalRetries: 0,
    successfulRetries: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Failure Decision Making
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine what action to take based on a session result and failure history.
 */
export function makeFailureDecision(
  result: SessionResult,
  tracker: FailureTracker,
  config: FailureHandlingConfig = DEFAULT_FAILURE_HANDLING_CONFIG
): FailureDecision {
  // Success case - reset consecutive failures
  if (result.outcome === 'success') {
    tracker.consecutiveFailures = 0;
    return {
      action: 'skip', // No failure to handle
      reason: 'Task completed successfully',
      shouldContinue: true,
      shouldCreateCheckpoint: false,
    };
  }

  // Track this failure
  tracker.consecutiveFailures++;
  tracker.totalFailures++;

  // Get or create failure record for this issue
  const existingRecord = tracker.records.get(result.issueId);
  const attemptCount = existingRecord?.attempts.length ?? 0;

  // Record this attempt
  const attempt: FailureAttempt = {
    attemptNumber: attemptCount + 1,
    timestamp: new Date().toISOString(),
    outcome: result.outcome,
    error: result.error,
    durationMs: result.durationMs,
  };

  const record: FailureRecord = existingRecord ?? {
    issueId: result.issueId,
    attempts: [],
    lastOutcome: result.outcome,
    finalAction: 'retry',
  };

  record.attempts.push(attempt);
  record.lastOutcome = result.outcome;
  tracker.records.set(result.issueId, record);

  // Check for too many consecutive failures (harness-wide concern)
  if (tracker.consecutiveFailures >= config.maxConsecutiveFailures) {
    return {
      action: 'pause',
      reason: `${tracker.consecutiveFailures} consecutive failures - pausing for human review`,
      shouldContinue: false,
      shouldCreateCheckpoint: true,
    };
  }

  // Determine strategy based on failure type
  const strategy = getStrategyForOutcome(result.outcome, config);

  // Check if we've exhausted retries
  if (strategy === 'retry' && record.attempts.length >= config.maxRetries) {
    record.finalAction = 'skip';
    return {
      action: 'skip',
      reason: `Exhausted ${config.maxRetries} retry attempts for ${result.issueId}`,
      shouldContinue: config.continueOnFailure,
      shouldCreateCheckpoint: true,
    };
  }

  // Apply the strategy
  switch (strategy) {
    case 'retry':
      tracker.totalRetries++;
      return {
        action: 'retry',
        reason: `Retrying ${result.issueId} (attempt ${record.attempts.length + 1}/${config.maxRetries})`,
        shouldContinue: true,
        shouldCreateCheckpoint: false,
        retryAfterMs: config.retryDelayMs,
      };

    case 'skip':
      record.finalAction = 'skip';
      return {
        action: 'skip',
        reason: `Skipping ${result.issueId} - ${getSkipReason(result.outcome)}`,
        shouldContinue: config.continueOnFailure,
        shouldCreateCheckpoint: result.outcome === 'failure',
      };

    case 'pause':
      record.finalAction = 'pause';
      return {
        action: 'pause',
        reason: `Pausing harness - ${result.issueId} requires human attention`,
        shouldContinue: false,
        shouldCreateCheckpoint: true,
      };

    case 'escalate':
      record.finalAction = 'escalate';
      return {
        action: 'escalate',
        reason: `Escalating ${result.issueId} - critical failure detected`,
        shouldContinue: false,
        shouldCreateCheckpoint: true,
      };

    default:
      return {
        action: 'skip',
        reason: 'Unknown strategy - defaulting to skip',
        shouldContinue: config.continueOnFailure,
        shouldCreateCheckpoint: true,
      };
  }
}

/**
 * Get the configured strategy for a given outcome.
 */
function getStrategyForOutcome(
  outcome: SessionOutcome,
  config: FailureHandlingConfig
): FailureAction {
  switch (outcome) {
    case 'context_overflow':
      return config.strategies.contextOverflow;
    case 'partial':
      return config.strategies.partial;
    case 'failure':
      // Check if it looks like a timeout
      return config.strategies.failure;
    default:
      return 'skip';
  }
}

/**
 * Get a human-readable skip reason for an outcome.
 */
function getSkipReason(outcome: SessionOutcome): string {
  switch (outcome) {
    case 'context_overflow':
      return 'context overflow (task may be too large)';
    case 'partial':
      return 'partial completion (some work done)';
    case 'failure':
      return 'general failure';
    default:
      return 'unknown reason';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a successful retry (when a retry attempt succeeds).
 */
export function recordSuccessfulRetry(
  tracker: FailureTracker,
  issueId: string
): void {
  tracker.successfulRetries++;
  tracker.consecutiveFailures = 0;

  const record = tracker.records.get(issueId);
  if (record) {
    record.finalAction = 'retry'; // Mark that retry strategy worked
    record.lastOutcome = 'success';
  }
}

/**
 * Check if an issue should be retried based on its failure history.
 */
export function shouldRetry(
  tracker: FailureTracker,
  issueId: string,
  config: FailureHandlingConfig = DEFAULT_FAILURE_HANDLING_CONFIG
): boolean {
  const record = tracker.records.get(issueId);
  if (!record) return false;

  // Check if we have retries left
  return record.attempts.length < config.maxRetries;
}

/**
 * Get the number of attempts for an issue.
 */
export function getAttemptCount(
  tracker: FailureTracker,
  issueId: string
): number {
  return tracker.records.get(issueId)?.attempts.length ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Failure Annotation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a failure annotation for recording in Beads.
 */
export function formatFailureAnnotation(record: FailureRecord): string {
  const lines: string[] = [];

  lines.push(`## Failure Record`);
  lines.push('');
  lines.push(`**Final Action**: ${record.finalAction}`);
  lines.push(`**Last Outcome**: ${record.lastOutcome}`);
  lines.push(`**Attempts**: ${record.attempts.length}`);
  lines.push('');

  lines.push('### Attempt History');
  for (const attempt of record.attempts) {
    lines.push(`- **Attempt ${attempt.attemptNumber}** (${attempt.timestamp})`);
    lines.push(`  - Outcome: ${attempt.outcome}`);
    lines.push(`  - Duration: ${(attempt.durationMs / 1000).toFixed(1)}s`);
    if (attempt.error) {
      lines.push(`  - Error: ${attempt.error.slice(0, 200)}`);
    }
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get failure statistics from the tracker.
 */
export function getFailureStats(tracker: FailureTracker): {
  totalFailures: number;
  totalRetries: number;
  successfulRetries: number;
  retrySuccessRate: number;
  issuesWithFailures: number;
  skippedIssues: number;
} {
  let skippedIssues = 0;
  for (const record of tracker.records.values()) {
    if (record.finalAction === 'skip' && record.lastOutcome !== 'success') {
      skippedIssues++;
    }
  }

  return {
    totalFailures: tracker.totalFailures,
    totalRetries: tracker.totalRetries,
    successfulRetries: tracker.successfulRetries,
    retrySuccessRate: tracker.totalRetries > 0
      ? tracker.successfulRetries / tracker.totalRetries
      : 0,
    issuesWithFailures: tracker.records.size,
    skippedIssues,
  };
}

/**
 * Format failure statistics for display.
 */
export function formatFailureStats(tracker: FailureTracker): string {
  const stats = getFailureStats(tracker);

  if (stats.totalFailures === 0) {
    return '  No failures recorded.';
  }

  const lines: string[] = [];
  lines.push(`  Failures: ${stats.totalFailures}`);
  lines.push(`  Retries: ${stats.totalRetries}`);
  if (stats.totalRetries > 0) {
    lines.push(`  Retry Success Rate: ${(stats.retrySuccessRate * 100).toFixed(0)}%`);
  }
  lines.push(`  Skipped Issues: ${stats.skippedIssues}`);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Escalation (Self-Healing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine if a task should escalate to a more capable model.
 *
 * Philosophy: When cheaper models fail, escalate to opus rather than giving up.
 * This implements self-healing: the system repairs itself by using more capable
 * tools when simpler ones fail.
 *
 * Heideggerian framing: The tool (cheaper model) has broken down, becoming
 * present-at-hand. Escalation returns the system to ready-to-hand operation.
 */
export function shouldEscalateModel(
  tracker: FailureTracker,
  issueId: string,
  currentModel: 'opus' | 'sonnet' | 'haiku'
): { escalate: boolean; toModel: 'opus' | 'sonnet' | 'haiku'; reason: string } {
  // Already using opus—no escalation possible
  if (currentModel === 'opus') {
    return { escalate: false, toModel: 'opus', reason: 'Already using opus' };
  }

  const record = tracker.records.get(issueId);
  if (!record) {
    return { escalate: false, toModel: currentModel, reason: 'No failure history' };
  }

  // Count failures with current model
  const currentModelFailures = record.attempts.filter(
    a => a.model === currentModel && a.outcome !== 'success'
  ).length;

  // Escalation thresholds
  // Haiku → Sonnet after 1 failure
  // Sonnet → Opus after 2 failures
  // Haiku → Opus after 2 failures (if already tried sonnet)
  if (currentModel === 'haiku' && currentModelFailures >= 1) {
    // Check if we already tried sonnet
    const sonnetAttempts = record.attempts.filter(a => a.model === 'sonnet');
    if (sonnetAttempts.length > 0) {
      return {
        escalate: true,
        toModel: 'opus',
        reason: `Failed with haiku (${currentModelFailures}x) and sonnet—escalating to opus`,
      };
    }
    return {
      escalate: true,
      toModel: 'sonnet',
      reason: `Failed with haiku (${currentModelFailures}x)—escalating to sonnet`,
    };
  }

  if (currentModel === 'sonnet' && currentModelFailures >= 2) {
    return {
      escalate: true,
      toModel: 'opus',
      reason: `Failed with sonnet (${currentModelFailures}x)—escalating to opus`,
    };
  }

  return { escalate: false, toModel: currentModel, reason: 'Not enough failures to escalate' };
}

/**
 * Record that a task was escalated and succeeded.
 * This creates a learning record for future pattern refinement.
 */
export function recordEscalationSuccess(
  tracker: FailureTracker,
  issue: BeadsIssue,
  originalModel: 'sonnet' | 'haiku',
  succeededWithOpus: boolean
): ModelEscalationLearning {
  const record = tracker.records.get(issue.id);

  // Mark escalation in the record
  if (record) {
    record.originalModel = originalModel;
    record.escalatedToOpus = succeededWithOpus;
    record.escalationReason = `Task "${issue.title}" required opus after failing with ${originalModel}`;
  }

  // Extract potential patterns from the issue
  const suggestedPatterns = extractPatternsForLearning(issue);

  const learning: ModelEscalationLearning = {
    issueId: issue.id,
    issueTitle: issue.title,
    originalModel,
    failedAttempts: record?.attempts.length ?? 0,
    escalatedAt: new Date().toISOString(),
    succeededWithOpus,
    suggestedPatterns,
  };

  return learning;
}

/**
 * Extract keywords from an issue that might indicate it needs opus.
 * Used for learning and pattern refinement.
 */
function extractPatternsForLearning(issue: BeadsIssue): string[] {
  const patterns: string[] = [];
  const title = issue.title.toLowerCase();
  const desc = (issue.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Common words that might indicate complexity
  const complexityIndicators = [
    'multiple', 'across', 'all', 'entire', 'whole',
    'complex', 'advanced', 'sophisticated',
    'debug', 'investigate', 'diagnose',
    'integrate', 'coordinate', 'orchestrate',
    'optimize', 'performance', 'memory',
    'architecture', 'design', 'refactor',
    'migration', 'upgrade', 'convert',
    'security', 'authentication', 'authorization',
  ];

  for (const indicator of complexityIndicators) {
    if (combined.includes(indicator)) {
      patterns.push(indicator);
    }
  }

  // Extract the main action verb + noun if possible
  const actionMatch = title.match(/^(add|implement|create|fix|update|refactor|migrate)\s+(.+)/i);
  if (actionMatch) {
    const verb = actionMatch[1].toLowerCase();
    const noun = actionMatch[2].split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    patterns.push(`${verb} ${noun}`);
  }

  return [...new Set(patterns)].slice(0, 5); // Dedupe and limit
}

/**
 * Format an escalation learning record for annotation in Beads.
 */
export function formatEscalationLearning(learning: ModelEscalationLearning): string {
  const lines: string[] = [];

  lines.push('## Model Escalation Learning');
  lines.push('');
  lines.push(`**Original Model**: ${learning.originalModel}`);
  lines.push(`**Failed Attempts**: ${learning.failedAttempts}`);
  lines.push(`**Escalated At**: ${learning.escalatedAt}`);
  lines.push(`**Succeeded with Opus**: ${learning.succeededWithOpus ? 'Yes' : 'No'}`);
  lines.push('');
  lines.push('### Suggested Patterns for Opus Selection');
  lines.push('');
  lines.push('Consider adding these patterns to `opusPatterns` in `selectModelForTask`:');
  lines.push('');
  for (const pattern of learning.suggestedPatterns) {
    lines.push(`- \`${pattern}\``);
  }
  lines.push('');
  lines.push('*This annotation was auto-generated by the harness self-healing system.*');

  return lines.join('\n');
}

/**
 * Get the effective model for a task, considering escalation history.
 * Call this instead of selectModelForTask when you have failure history.
 */
export function getEffectiveModel(
  tracker: FailureTracker,
  issueId: string,
  heuristicModel: 'opus' | 'sonnet' | 'haiku'
): { model: 'opus' | 'sonnet' | 'haiku'; escalated: boolean; reason: string } {
  const escalation = shouldEscalateModel(tracker, issueId, heuristicModel);

  if (escalation.escalate) {
    return {
      model: escalation.toModel,
      escalated: true,
      reason: escalation.reason,
    };
  }

  return {
    model: heuristicModel,
    escalated: false,
    reason: 'Using heuristic selection',
  };
}
