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
  SwarmProgress,
  SwarmCheckpoint,
  SwarmAgentStatus,
} from './types.js';
import { createCheckpointIssue, getOpenIssues } from './beads.js';

/**
 * Checkpoint tracking state.
 */
interface CheckpointTracker {
  sessionsSinceCheckpoint: number;
  lastCheckpointTime: number;
  sessionsResults: SessionResult[];
  /** Swarm-specific tracking */
  swarmBatches: SwarmBatchTracker[];
  currentSwarmBatch: SwarmBatchTracker | null;
}

/**
 * Tracks a single swarm batch (a group of parallel sessions).
 */
interface SwarmBatchTracker {
  batchId: string;
  startedAt: string;
  agentStatuses: Map<string, SwarmAgentStatus>;
  results: SessionResult[];
}

/**
 * Create a new checkpoint tracker.
 */
export function createCheckpointTracker(): CheckpointTracker {
  return {
    sessionsSinceCheckpoint: 0,
    lastCheckpointTime: Date.now(),
    sessionsResults: [],
    swarmBatches: [],
    currentSwarmBatch: null,
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

  // Also record in current swarm batch if one is active
  if (tracker.currentSwarmBatch) {
    tracker.currentSwarmBatch.results.push(result);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Swarm Batch Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique batch ID for swarm tracking.
 */
function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `swarm-${timestamp}${random}`;
}

/**
 * Start a new swarm batch for parallel execution tracking.
 */
export function startSwarmBatch(tracker: CheckpointTracker): string {
  const batchId = generateBatchId();
  const batch: SwarmBatchTracker = {
    batchId,
    startedAt: new Date().toISOString(),
    agentStatuses: new Map(),
    results: [],
  };

  tracker.currentSwarmBatch = batch;
  return batchId;
}

/**
 * Register an agent starting work in the current swarm batch.
 */
export function registerSwarmAgent(
  tracker: CheckpointTracker,
  agentId: string,
  issueId: string
): void {
  if (!tracker.currentSwarmBatch) return;

  const status: SwarmAgentStatus = {
    agentId,
    issueId,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    outcome: null,
    error: null,
  };

  tracker.currentSwarmBatch.agentStatuses.set(agentId, status);
}

/**
 * Update an agent's status in the current swarm batch.
 */
export function updateSwarmAgentStatus(
  tracker: CheckpointTracker,
  agentId: string,
  result: SessionResult
): void {
  if (!tracker.currentSwarmBatch) return;

  const status = tracker.currentSwarmBatch.agentStatuses.get(agentId);
  if (!status) return;

  status.status = result.outcome === 'success' ? 'completed' : 'failed';
  status.completedAt = new Date().toISOString();
  status.outcome = result.outcome;
  status.error = result.error;

  tracker.currentSwarmBatch.agentStatuses.set(agentId, status);
}

/**
 * Complete the current swarm batch and archive it.
 */
export function completeSwarmBatch(tracker: CheckpointTracker): SwarmProgress | null {
  if (!tracker.currentSwarmBatch) return null;

  const batch = tracker.currentSwarmBatch;
  const agentStatuses = Array.from(batch.agentStatuses.values());

  const progress: SwarmProgress = {
    batchId: batch.batchId,
    startedAt: batch.startedAt,
    activeAgents: agentStatuses.filter((s) => s.status === 'running').length,
    totalAgents: agentStatuses.length,
    agentStatuses,
    issuesCompleted: agentStatuses
      .filter((s) => s.status === 'completed')
      .map((s) => s.issueId),
    issuesFailed: agentStatuses
      .filter((s) => s.status === 'failed')
      .map((s) => s.issueId),
    issuesInProgress: agentStatuses
      .filter((s) => s.status === 'running')
      .map((s) => s.issueId),
  };

  tracker.swarmBatches.push(batch);
  tracker.currentSwarmBatch = null;

  return progress;
}

/**
 * Get the current swarm progress (without completing the batch).
 */
export function getCurrentSwarmProgress(tracker: CheckpointTracker): SwarmProgress | null {
  if (!tracker.currentSwarmBatch) return null;

  const batch = tracker.currentSwarmBatch;
  const agentStatuses = Array.from(batch.agentStatuses.values());

  return {
    batchId: batch.batchId,
    startedAt: batch.startedAt,
    activeAgents: agentStatuses.filter((s) => s.status === 'running').length,
    totalAgents: agentStatuses.length,
    agentStatuses,
    issuesCompleted: agentStatuses
      .filter((s) => s.status === 'completed')
      .map((s) => s.issueId),
    issuesFailed: agentStatuses
      .filter((s) => s.status === 'failed')
      .map((s) => s.issueId),
    issuesInProgress: agentStatuses
      .filter((s) => s.status === 'running')
      .map((s) => s.issueId),
  };
}

/**
 * Check if there's an active swarm batch.
 */
export function hasActiveSwarmBatch(tracker: CheckpointTracker): boolean {
  return tracker.currentSwarmBatch !== null;
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
  tracker.swarmBatches = [];
  // Note: currentSwarmBatch is preserved if still active
}

// ─────────────────────────────────────────────────────────────────────────────
// Swarm-Aware Checkpoint Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a swarm-aware checkpoint with parallel execution data.
 */
export async function generateSwarmCheckpoint(
  tracker: CheckpointTracker,
  harnessState: HarnessState,
  redirectNotes: string | null,
  cwd?: string
): Promise<SwarmCheckpoint> {
  // First generate the base checkpoint
  const baseCheckpoint = await generateCheckpoint(tracker, harnessState, redirectNotes, cwd);

  // Get or complete swarm progress
  let swarmProgress: SwarmProgress | null = null;
  if (tracker.currentSwarmBatch) {
    swarmProgress = getCurrentSwarmProgress(tracker);
  } else if (tracker.swarmBatches.length > 0) {
    // Aggregate from completed batches
    swarmProgress = aggregateSwarmBatches(tracker.swarmBatches);
  }

  // Calculate parallelism efficiency
  let parallelismEfficiency: number | null = null;
  if (swarmProgress) {
    const total = swarmProgress.issuesCompleted.length + swarmProgress.issuesFailed.length;
    if (total > 0) {
      parallelismEfficiency = swarmProgress.issuesCompleted.length / total;
    }
  }

  const swarmCheckpoint: SwarmCheckpoint = {
    ...baseCheckpoint,
    isSwarmCheckpoint: swarmProgress !== null,
    swarmProgress,
    parallelismEfficiency,
  };

  return swarmCheckpoint;
}

/**
 * Aggregate multiple swarm batches into a single progress report.
 */
function aggregateSwarmBatches(batches: SwarmBatchTracker[]): SwarmProgress {
  const allStatuses: SwarmAgentStatus[] = [];
  const completed: string[] = [];
  const failed: string[] = [];
  const inProgress: string[] = [];

  for (const batch of batches) {
    for (const status of batch.agentStatuses.values()) {
      allStatuses.push(status);
      if (status.status === 'completed') {
        completed.push(status.issueId);
      } else if (status.status === 'failed') {
        failed.push(status.issueId);
      } else {
        inProgress.push(status.issueId);
      }
    }
  }

  return {
    batchId: `aggregated-${batches.length}-batches`,
    startedAt: batches[0]?.startedAt || new Date().toISOString(),
    activeAgents: inProgress.length,
    totalAgents: allStatuses.length,
    agentStatuses: allStatuses,
    issuesCompleted: completed,
    issuesFailed: failed,
    issuesInProgress: inProgress,
  };
}

/**
 * Generate a swarm-specific summary for checkpoint display.
 */
function generateSwarmSummary(
  results: SessionResult[],
  harnessState: HarnessState,
  swarmProgress: SwarmProgress
): string {
  const successCount = results.filter((r) => r.outcome === 'success').length;
  const failureCount = results.filter((r) => r.outcome === 'failure').length;
  const partialCount = results.filter((r) => r.outcome === 'partial').length;

  const lines: string[] = [];

  // Swarm header
  lines.push(`[SWARM] ${swarmProgress.totalAgents} parallel agents executed`);
  lines.push('');

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

  // Calculate parallelism speedup estimate
  if (swarmProgress.totalAgents > 1) {
    const avgCompleted = swarmProgress.issuesCompleted.length;
    if (avgCompleted > 0) {
      lines.push('');
      lines.push(`Parallelism efficiency: ${avgCompleted}/${swarmProgress.totalAgents} agents successful`);
    }
  }

  return lines.join('\n');
}

/**
 * Format checkpoint for display.
 * Supports both regular and swarm checkpoints.
 */
export function formatCheckpointDisplay(checkpoint: Checkpoint | SwarmCheckpoint): string {
  const lines: string[] = [];

  // Check if this is a swarm checkpoint
  const isSwarm = 'isSwarmCheckpoint' in checkpoint && checkpoint.isSwarmCheckpoint;

  lines.push(`═══════════════════════════════════════════════════════════════`);
  if (isSwarm) {
    lines.push(`  SWARM CHECKPOINT #${checkpoint.sessionNumber}`);
  } else {
    lines.push(`  CHECKPOINT #${checkpoint.sessionNumber}`);
  }
  lines.push(`  ${checkpoint.timestamp}`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push('');

  // For swarm checkpoints, add parallelism info
  if (isSwarm && (checkpoint as SwarmCheckpoint).swarmProgress) {
    const swarmProgress = (checkpoint as SwarmCheckpoint).swarmProgress!;
    lines.push(`Parallel Execution: ${swarmProgress.totalAgents} agents`);
    if (swarmProgress.activeAgents > 0) {
      lines.push(`  Active: ${swarmProgress.activeAgents}`);
    }
    lines.push('');
  }

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

  // Show parallelism efficiency for swarm checkpoints
  if (isSwarm && (checkpoint as SwarmCheckpoint).parallelismEfficiency !== null) {
    const efficiency = (checkpoint as SwarmCheckpoint).parallelismEfficiency!;
    lines.push(`Parallelism Efficiency: ${(efficiency * 100).toFixed(0)}%`);
  }

  lines.push(`Git Commit: ${checkpoint.gitCommit}`);

  if (checkpoint.redirectNotes) {
    lines.push('');
    lines.push(`Redirect: ${checkpoint.redirectNotes}`);
  }

  // For swarm checkpoints, show per-agent breakdown if there are failures
  if (isSwarm && (checkpoint as SwarmCheckpoint).swarmProgress) {
    const swarmProgress = (checkpoint as SwarmCheckpoint).swarmProgress!;
    const failedAgents = swarmProgress.agentStatuses.filter((s) => s.status === 'failed');

    if (failedAgents.length > 0) {
      lines.push('');
      lines.push(`── Agent Failures ──`);
      for (const agent of failedAgents.slice(0, 5)) {
        const errorMsg = agent.error ? `: ${agent.error.slice(0, 50)}` : '';
        lines.push(`  ${agent.agentId} → ${agent.issueId}${errorMsg}`);
      }
      if (failedAgents.length > 5) {
        lines.push(`  ... and ${failedAgents.length - 5} more`);
      }
    }
  }

  lines.push(`═══════════════════════════════════════════════════════════════`);

  return lines.join('\n');
}

/**
 * Format swarm progress for real-time display during parallel execution.
 */
export function formatSwarmProgressDisplay(progress: SwarmProgress): string {
  const lines: string[] = [];

  lines.push(`┌─────────────────────────────────────────────────────────────┐`);
  lines.push(`│  SWARM BATCH: ${progress.batchId.slice(0, 20).padEnd(20)}                    │`);
  lines.push(`├─────────────────────────────────────────────────────────────┤`);

  // Progress bar
  const total = progress.totalAgents;
  const completed = progress.issuesCompleted.length;
  const failed = progress.issuesFailed.length;
  const active = progress.activeAgents;

  const barWidth = 30;
  const completedWidth = Math.round((completed / total) * barWidth);
  const failedWidth = Math.round((failed / total) * barWidth);
  const activeWidth = Math.round((active / total) * barWidth);

  const progressBar =
    '█'.repeat(completedWidth) +
    '░'.repeat(activeWidth) +
    '✗'.repeat(failedWidth) +
    '·'.repeat(Math.max(0, barWidth - completedWidth - activeWidth - failedWidth));

  lines.push(`│  Progress: [${progressBar}]                │`);
  lines.push(`│  ✓ ${completed} completed  ◐ ${active} active  ✗ ${failed} failed         │`);

  // Per-agent status (compact)
  lines.push(`├─────────────────────────────────────────────────────────────┤`);
  lines.push(`│  Agents:                                                    │`);

  for (const status of progress.agentStatuses.slice(0, 5)) {
    const icon = status.status === 'completed' ? '✓' :
                 status.status === 'failed' ? '✗' :
                 status.status === 'running' ? '◐' : '○';
    const issueShort = status.issueId.slice(-8);
    const line = `│    ${icon} ${status.agentId.slice(0, 12).padEnd(12)} → ${issueShort.padEnd(10)}`;
    lines.push(line.padEnd(62) + '│');
  }

  if (progress.agentStatuses.length > 5) {
    lines.push(`│    ... and ${progress.agentStatuses.length - 5} more agents                           │`);
  }

  lines.push(`└─────────────────────────────────────────────────────────────┘`);

  return lines.join('\n');
}
