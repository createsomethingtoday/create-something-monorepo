/**
 * @create-something/orchestration
 *
 * Resume brief generation from checkpoints.
 * Converts checkpoint context into a concise brief for session resumption.
 */

import { generateResumeBrief as harnessGenerateResumeBrief } from '@create-something/harness';
import type { StoredCheckpoint, OrchestrationContext } from '../types.js';

/**
 * Generate a resume brief from a checkpoint.
 *
 * Philosophy: The resume brief gives Claude Code enough context to pick up where
 * it left off. It extends the harness resume brief with orchestration-specific info.
 */
export function generateResumeBrief(checkpoint: StoredCheckpoint): string {
  const context = checkpoint.context;

  // Start with harness-generated brief (files, issues, decisions, etc.)
  const harnessBrief = harnessGenerateResumeBrief(context);

  // Add orchestration-specific context
  const lines: string[] = [];

  lines.push('## Orchestration Context');
  lines.push('');
  lines.push(`**Epic**: ${context.epicId}`);
  lines.push(`**Session Number**: ${context.sessionNumber}`);
  lines.push(`**Checkpoint ID**: ${checkpoint.id}`);
  lines.push(`**Checkpoint Reason**: ${checkpoint.reason}`);
  lines.push('');

  // Cost information
  if (context.budgetRemaining !== null) {
    const initialBudget = context.budgetRemaining + context.cumulativeCost;
    const percentUsed = (context.cumulativeCost / initialBudget) * 100;

    lines.push('### Budget Status');
    lines.push(`- Initial: $${initialBudget.toFixed(4)}`);
    lines.push(`- Consumed: $${context.cumulativeCost.toFixed(4)} (${percentUsed.toFixed(0)}%)`);
    lines.push(`- Remaining: $${context.budgetRemaining.toFixed(4)}`);
    lines.push('');
  } else {
    lines.push('### Cost Tracking');
    lines.push(`- Total cost so far: $${context.cumulativeCost.toFixed(4)}`);
    lines.push(`- Current session: $${context.sessionCost.toFixed(4)}`);
    lines.push('');
  }

  // Convoy information
  if (context.convoyId) {
    lines.push('### Convoy Coordination');
    lines.push(`- Convoy ID: ${context.convoyId}`);
    if (context.workerId) {
      lines.push(`- Worker ID: ${context.workerId}`);
    }
    if (context.assignedIssues.length > 0) {
      lines.push(`- Assigned Issues: ${context.assignedIssues.join(', ')}`);
    }
    lines.push('');
  }

  // Background execution
  if (context.backgroundPid !== null) {
    lines.push('### Background Execution');
    lines.push(`- Process ID: ${context.backgroundPid}`);
    lines.push(`- Started: ${context.backgroundStarted}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Combine orchestration context with harness brief
  return lines.join('\n') + '\n' + harnessBrief;
}

/**
 * Format checkpoint summary for display.
 */
export function formatCheckpointSummary(checkpoint: StoredCheckpoint): string {
  const lines: string[] = [];

  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push(`  CHECKPOINT: ${checkpoint.id}`);
  lines.push(`  Epic: ${checkpoint.epicId} | Session: ${checkpoint.sessionNumber}`);
  lines.push(`  ${checkpoint.timestamp}`);
  lines.push(`═══════════════════════════════════════════════════════════════`);
  lines.push('');
  lines.push(`Reason: ${checkpoint.reason}`);
  lines.push('');
  lines.push(checkpoint.summary);
  lines.push('');

  const context = checkpoint.context;

  // Cost info
  if (context.budgetRemaining !== null) {
    const initialBudget = context.budgetRemaining + context.cumulativeCost;
    const percentUsed = (context.cumulativeCost / initialBudget) * 100;
    lines.push(`Budget: $${context.cumulativeCost.toFixed(4)} / $${initialBudget.toFixed(4)} (${percentUsed.toFixed(0)}% used)`);
  } else {
    lines.push(`Cost: $${context.cumulativeCost.toFixed(4)}`);
  }

  lines.push(`Git Commit: ${checkpoint.gitCommit}`);
  lines.push('');

  // Context summary
  lines.push('Context:');
  if (context.filesModified.length > 0) {
    lines.push(`  - ${context.filesModified.length} files modified`);
  }
  if (context.issuesUpdated.length > 0) {
    lines.push(`  - ${context.issuesUpdated.length} issues updated`);
  }
  if (context.blockers.length > 0) {
    lines.push(`  - ${context.blockers.length} blockers encountered`);
  }
  if (context.currentTask) {
    lines.push(`  - Current task: ${context.currentTask.issueId} (${context.currentTask.progressPercent}%)`);
  }

  lines.push(`═══════════════════════════════════════════════════════════════`);

  return lines.join('\n');
}

/**
 * Check if a checkpoint has meaningful context for resumption.
 */
export function hasResumableContext(checkpoint: StoredCheckpoint): boolean {
  const ctx = checkpoint.context;

  return (
    ctx.currentTask !== null ||
    ctx.filesModified.length > 0 ||
    ctx.issuesUpdated.length > 0 ||
    ctx.blockers.length > 0 ||
    ctx.agentNotes.length > 0 ||
    ctx.assignedIssues.length > 0
  );
}
