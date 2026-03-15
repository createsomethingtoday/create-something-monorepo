/**
 * @create-something/orchestration
 *
 * Session lifecycle management - start, pause, resume, complete.
 */

import type {
  Session,
  SessionConfig,
  SessionStatus,
  OrchestrationContext,
  StoredCheckpoint,
  DEFAULT_CHECKPOINT_POLICY,
} from '../types.js';
import { createSessionContext, generateSessionId, updateSessionCost, isBudgetExceeded } from './context.js';
import { saveCheckpoint, loadLatestCheckpoint, hasCheckpoints } from '../checkpoint/store.js';
import { shouldCheckpoint } from '../checkpoint/policy.js';
import { generateResumeBrief, hasResumableContext } from '../checkpoint/brief.js';

/**
 * Start a new orchestration session.
 *
 * Philosophy: Sessions are the unit of work in orchestration. They can be
 * paused and resumed across crashes, context limits, or explicit pauses.
 */
export async function startSession(config: SessionConfig): Promise<{
  session: Session;
  context: OrchestrationContext;
  resumeBrief: string | null;
}> {
  const cwd = config.cwd || process.cwd();
  const sessionId = generateSessionId();

  // Check if we're resuming
  let context: OrchestrationContext;
  let resumeBrief: string | null = null;
  let sessionNumber = 1;
  let parentSessionId: string | null = null;

  if (config.resume) {
    // Load latest checkpoint
    const checkpoint = await loadLatestCheckpoint(config.epicId, cwd);

    if (checkpoint) {
      // Resume from checkpoint
      context = {
        ...checkpoint.context,
        sessionNumber: checkpoint.sessionNumber + 1,
        parentSessionId: checkpoint.sessionId,
        sessionCost: 0, // Reset session cost
        backgroundPid: null, // Clear background info
        backgroundStarted: null,
      };

      sessionNumber = context.sessionNumber;
      parentSessionId = checkpoint.sessionId;

      // Generate resume brief if there's meaningful context
      if (hasResumableContext(checkpoint)) {
        resumeBrief = generateResumeBrief(checkpoint);
      }
    } else {
      // No checkpoint found, start fresh
      context = createSessionContext({
        epicId: config.epicId,
        budget: config.budget,
      });
    }
  } else {
    // Start fresh session
    context = createSessionContext({
      epicId: config.epicId,
      budget: config.budget,
    });
  }

  // Create session metadata
  const session: Session = {
    id: sessionId,
    epicId: config.epicId,
    status: 'initializing',
    parentSessionId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    outcome: null,
    costUsd: 0,
    checkpointCount: 0,
    latestCheckpointId: null,
    issuesWorked: [],
    issuesCompleted: [],
  };

  return { session, context, resumeBrief };
}

/**
 * Pause a session and create a checkpoint.
 *
 * Returns the checkpoint for resume.
 */
export async function pauseSession(
  session: Session,
  context: OrchestrationContext,
  reason: string,
  cwd: string = process.cwd()
): Promise<StoredCheckpoint> {
  const summary = generatePauseSummary(session, context);

  const checkpoint = await saveCheckpoint(
    context,
    reason,
    summary,
    session.id,
    cwd
  );

  // Update session metadata
  session.status = 'paused';
  session.latestCheckpointId = checkpoint.id;
  session.checkpointCount++;

  return checkpoint;
}

/**
 * Resume a session from a checkpoint.
 *
 * Returns the session and context with resume brief.
 */
export async function resumeSession(
  epicId: string,
  cwd: string = process.cwd()
): Promise<{
  session: Session;
  context: OrchestrationContext;
  resumeBrief: string;
} | null> {
  // Load latest checkpoint
  const checkpoint = await loadLatestCheckpoint(epicId, cwd);

  if (!checkpoint) {
    return null;
  }

  // Create new session continuing from checkpoint
  const sessionId = generateSessionId();

  const context: OrchestrationContext = {
    ...checkpoint.context,
    sessionNumber: checkpoint.sessionNumber + 1,
    parentSessionId: checkpoint.sessionId,
    sessionCost: 0, // Reset session cost
    backgroundPid: null,
    backgroundStarted: null,
  };

  const session: Session = {
    id: sessionId,
    epicId,
    status: 'running',
    parentSessionId: checkpoint.sessionId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    outcome: null,
    costUsd: 0,
    checkpointCount: 0,
    latestCheckpointId: checkpoint.id,
    issuesWorked: [...checkpoint.context.assignedIssues],
    issuesCompleted: [],
  };

  const resumeBrief = generateResumeBrief(checkpoint);

  return { session, context, resumeBrief };
}

/**
 * Complete a session.
 *
 * Creates a final checkpoint if needed.
 */
export async function completeSession(
  session: Session,
  context: OrchestrationContext,
  outcome: 'success' | 'failure' | 'budget_exceeded',
  cwd: string = process.cwd()
): Promise<StoredCheckpoint | null> {
  session.status = outcome === 'success' ? 'completed' : outcome === 'budget_exceeded' ? 'budget_exceeded' : 'failed';
  session.completedAt = new Date().toISOString();
  session.outcome = outcome === 'budget_exceeded' ? 'failure' : outcome;
  session.costUsd = context.sessionCost;

  // Create final checkpoint
  const summary = generateCompletionSummary(session, context);
  const reason = outcome === 'success'
    ? 'Session completed successfully'
    : outcome === 'budget_exceeded'
    ? 'Budget exceeded'
    : 'Session failed';

  const checkpoint = await saveCheckpoint(
    context,
    reason,
    summary,
    session.id,
    cwd
  );

  session.latestCheckpointId = checkpoint.id;
  session.checkpointCount++;

  return checkpoint;
}

/**
 * Generate pause summary for checkpoint.
 */
function generatePauseSummary(session: Session, context: OrchestrationContext): string {
  const lines: string[] = [];

  lines.push(`Session ${context.sessionNumber} paused`);
  lines.push('');

  if (session.issuesCompleted.length > 0) {
    lines.push(`Completed: ${session.issuesCompleted.join(', ')}`);
  }

  if (session.issuesWorked.length > 0) {
    lines.push(`In Progress: ${session.issuesWorked.join(', ')}`);
  }

  if (context.cumulativeCost > 0) {
    lines.push(`Cost: $${context.cumulativeCost.toFixed(4)}`);
  }

  return lines.join('\n');
}

/**
 * Generate completion summary for checkpoint.
 */
function generateCompletionSummary(session: Session, context: OrchestrationContext): string {
  const lines: string[] = [];

  lines.push(`Session ${context.sessionNumber} completed`);
  lines.push('');

  lines.push(`Status: ${session.status}`);
  lines.push(`Outcome: ${session.outcome}`);
  lines.push('');

  if (session.issuesCompleted.length > 0) {
    lines.push(`Completed: ${session.issuesCompleted.join(', ')}`);
  }

  if (context.cumulativeCost > 0) {
    lines.push(`Total Cost: $${context.cumulativeCost.toFixed(4)}`);
  }

  if (context.budgetRemaining !== null) {
    lines.push(`Budget Remaining: $${context.budgetRemaining.toFixed(4)}`);
  }

  return lines.join('\n');
}

/**
 * Check if a session should create a checkpoint.
 */
export function checkCheckpointTrigger(
  session: Session,
  context: OrchestrationContext,
  lastCheckpointTime: number,
  event?: {
    type: 'session_start' | 'issue_complete' | 'error';
    issueId?: string;
    error?: Error;
  }
): { should: boolean; reason: string } {
  // Use default policy for now (can be made configurable later)
  const policy = {
    intervalMinutes: 15,
    events: {
      onSessionStart: true,
      onIssueComplete: false,
      onError: true,
      onCostThreshold: 0.8,
    },
  };

  return shouldCheckpoint(policy, context, lastCheckpointTime, event);
}
