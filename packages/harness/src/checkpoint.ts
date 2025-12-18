/**
 * @create-something/harness
 *
 * Checkpoint Generator: Creates progress reports as Beads issues.
 */

import type {
  Checkpoint,
  CheckpointPolicy,
  HarnessState,
  SessionResult,
  BeadsIssue,
} from './types.js';
import { createCheckpointIssue, getOpenIssues } from './beads.js';

/**
 * Checkpoint tracking state.
 */
interface CheckpointTracker {
  sessionsSinceCheckpoint: number;
  lastCheckpointTime: number;
  sessionsResults: SessionResult[];
}

/**
 * Create a new checkpoint tracker.
 */
export function createCheckpointTracker(): CheckpointTracker {
  return {
    sessionsSinceCheckpoint: 0,
    lastCheckpointTime: Date.now(),
    sessionsResults: [],
  };
}

/**
 * Record a session result in the tracker.
 */
export function recordSession(
  tracker: CheckpointTracker,
  result: SessionResult
): void {
  tracker.sessionsSinceCheckpoint++;
  tracker.sessionsResults.push(result);
}

/**
 * Check if a checkpoint should be created based on policy.
 */
export function shouldCreateCheckpoint(
  tracker: CheckpointTracker,
  policy: CheckpointPolicy,
  lastResult: SessionResult,
  redirectDetected: boolean
): { create: boolean; reason: string } {
  // Check session count
  if (tracker.sessionsSinceCheckpoint >= policy.afterSessions) {
    return { create: true, reason: `${policy.afterSessions} sessions completed` };
  }

  // Check time elapsed
  const hoursElapsed = (Date.now() - tracker.lastCheckpointTime) / (1000 * 60 * 60);
  if (hoursElapsed >= policy.afterHours) {
    return { create: true, reason: `${policy.afterHours} hours elapsed` };
  }

  // Check for errors
  if (policy.onError && lastResult.outcome === 'failure') {
    return { create: true, reason: 'Task failure detected' };
  }

  // Check for redirects
  if (policy.onRedirect && redirectDetected) {
    return { create: true, reason: 'Human redirect detected' };
  }

  return { create: false, reason: '' };
}

/**
 * Calculate confidence score based on recent session results.
 */
export function calculateConfidence(results: SessionResult[]): number {
  if (results.length === 0) return 1.0;

  const successCount = results.filter((r) => r.outcome === 'success').length;
  const failureCount = results.filter((r) => r.outcome === 'failure').length;
  const partialCount = results.filter((r) => r.outcome === 'partial').length;

  // Weighted calculation
  const score =
    (successCount * 1.0 + partialCount * 0.5 + failureCount * 0.0) /
    results.length;

  // Recent failures have more weight
  const recentResults = results.slice(-3);
  const recentFailures = recentResults.filter((r) => r.outcome === 'failure').length;

  // Penalty for recent failures
  const recentPenalty = recentFailures * 0.15;

  return Math.max(0, Math.min(1, score - recentPenalty));
}

/**
 * Check if the harness should pause due to low confidence.
 */
export function shouldPauseForConfidence(
  results: SessionResult[],
  threshold: number
): boolean {
  const confidence = calculateConfidence(results);
  return confidence < threshold;
}

/**
 * Generate a checkpoint from tracked sessions.
 */
export async function generateCheckpoint(
  tracker: CheckpointTracker,
  harnessState: HarnessState,
  redirectNotes: string | null,
  cwd?: string
): Promise<Checkpoint> {
  const timestamp = new Date().toISOString();
  const sessionNumber = harnessState.sessionsCompleted + 1;

  // Categorize issues
  const issuesCompleted = tracker.sessionsResults
    .filter((r) => r.outcome === 'success')
    .map((r) => r.issueId);

  const issuesFailed = tracker.sessionsResults
    .filter((r) => r.outcome === 'failure')
    .map((r) => r.issueId);

  const issuesInProgress = tracker.sessionsResults
    .filter((r) => r.outcome === 'partial' || r.outcome === 'context_overflow')
    .map((r) => r.issueId);

  // Generate summary
  const summary = generateSummary(tracker.sessionsResults, harnessState);

  // Get latest git commit
  const gitCommit =
    tracker.sessionsResults
      .slice()
      .reverse()
      .find((r) => r.gitCommit)?.gitCommit || 'unknown';

  const confidence = calculateConfidence(tracker.sessionsResults);

  const checkpoint: Omit<Checkpoint, 'id'> = {
    harnessId: harnessState.id,
    sessionNumber,
    timestamp,
    summary,
    issuesCompleted,
    issuesInProgress,
    issuesFailed,
    gitCommit,
    confidence,
    redirectNotes,
  };

  // Create checkpoint issue in Beads
  const checkpointId = await createCheckpointIssue(checkpoint, cwd);

  return {
    id: checkpointId,
    ...checkpoint,
  };
}

/**
 * Generate a human-readable summary of checkpoint.
 */
function generateSummary(
  results: SessionResult[],
  harnessState: HarnessState
): string {
  const successCount = results.filter((r) => r.outcome === 'success').length;
  const failureCount = results.filter((r) => r.outcome === 'failure').length;
  const partialCount = results.filter((r) => r.outcome === 'partial').length;

  const lines: string[] = [];

  lines.push(
    `Completed ${successCount} of ${results.length} tasks in this checkpoint period.`
  );

  if (failureCount > 0) {
    lines.push(`${failureCount} task(s) failed and may need attention.`);
  }

  if (partialCount > 0) {
    lines.push(`${partialCount} task(s) partially completed.`);
  }

  lines.push('');
  lines.push(
    `Overall progress: ${harnessState.featuresCompleted}/${harnessState.featuresTotal} features.`
  );

  return lines.join('\n');
}

/**
 * Reset the tracker after creating a checkpoint.
 */
export function resetTracker(tracker: CheckpointTracker): void {
  tracker.sessionsSinceCheckpoint = 0;
  tracker.lastCheckpointTime = Date.now();
  tracker.sessionsResults = [];
}

/**
 * Format checkpoint for display.
 */
export function formatCheckpointDisplay(checkpoint: Checkpoint): string {
  const lines: string[] = [];

  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`  CHECKPOINT #${checkpoint.sessionNumber}`);
  lines.push(`  ${checkpoint.timestamp}`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push('');
  lines.push(checkpoint.summary);
  lines.push('');

  if (checkpoint.issuesCompleted.length > 0) {
    lines.push(`✓ Completed: ${checkpoint.issuesCompleted.join(', ')}`);
  }
  if (checkpoint.issuesFailed.length > 0) {
    lines.push(`✗ Failed: ${checkpoint.issuesFailed.join(', ')}`);
  }
  if (checkpoint.issuesInProgress.length > 0) {
    lines.push(`◐ In Progress: ${checkpoint.issuesInProgress.join(', ')}`);
  }

  lines.push('');
  lines.push(`Confidence: ${(checkpoint.confidence * 100).toFixed(0)}%`);
  lines.push(`Git Commit: ${checkpoint.gitCommit}`);

  if (checkpoint.redirectNotes) {
    lines.push('');
    lines.push(`Redirect: ${checkpoint.redirectNotes}`);
  }

  lines.push(`═══════════════════════════════════════════════════════════════`);

  return lines.join('\n');
}
