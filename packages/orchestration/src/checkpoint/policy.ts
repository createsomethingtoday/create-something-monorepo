/**
 * @create-something/orchestration
 *
 * Checkpoint policy - when to create checkpoints.
 */

import type { CheckpointPolicy, OrchestrationContext } from '../types.js';

/**
 * Check if a checkpoint should be created based on policy.
 *
 * Philosophy: Checkpoints balance durability with cost. Too frequent = expensive,
 * too infrequent = data loss on crash.
 */
export function shouldCheckpoint(
  policy: CheckpointPolicy,
  context: OrchestrationContext,
  lastCheckpointTime: number,
  event?: {
    type: 'session_start' | 'issue_complete' | 'error';
    issueId?: string;
    error?: Error;
  }
): { should: boolean; reason: string } {
  // Event-based checkpointing
  if (event) {
    if (event.type === 'session_start' && policy.events.onSessionStart) {
      return { should: true, reason: 'Session start baseline' };
    }

    if (event.type === 'issue_complete' && policy.events.onIssueComplete) {
      return { should: true, reason: `Issue ${event.issueId} completed` };
    }

    if (event.type === 'error' && policy.events.onError) {
      return { should: true, reason: `Error encountered: ${event.error?.message || 'unknown'}` };
    }
  }

  // Time-based checkpointing
  const now = Date.now();
  const elapsedMinutes = (now - lastCheckpointTime) / (1000 * 60);

  if (elapsedMinutes >= policy.intervalMinutes) {
    return {
      should: true,
      reason: `${policy.intervalMinutes} minutes elapsed (${elapsedMinutes.toFixed(1)}min)`,
    };
  }

  // Cost-based checkpointing (if budget exists)
  if (policy.events.onCostThreshold !== null && context.budgetRemaining !== null) {
    const initialBudget = context.budgetRemaining + context.cumulativeCost;
    const percentConsumed = (context.cumulativeCost / initialBudget) * 100;

    if (percentConsumed >= policy.events.onCostThreshold * 100) {
      return {
        should: true,
        reason: `Cost threshold reached: ${percentConsumed.toFixed(0)}% of budget consumed`,
      };
    }
  }

  return { should: false, reason: '' };
}

/**
 * Get checkpoint interval in milliseconds.
 */
export function getCheckpointIntervalMs(policy: CheckpointPolicy): number {
  return policy.intervalMinutes * 60 * 1000;
}

/**
 * Calculate next checkpoint time.
 */
export function getNextCheckpointTime(
  policy: CheckpointPolicy,
  lastCheckpointTime: number
): number {
  return lastCheckpointTime + getCheckpointIntervalMs(policy);
}

/**
 * Format checkpoint reason for display.
 */
export function formatCheckpointReason(reason: string): string {
  return `[CHECKPOINT] ${reason}`;
}
