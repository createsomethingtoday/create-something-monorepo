/**
 * @create-something/orchestration
 *
 * Core types for the orchestration layer.
 * Extends harness types with multi-session capabilities.
 */

import type { AgentContext, SessionOutcome } from '@create-something/harness';

/**
 * Orchestration context extends harness AgentContext with multi-session support.
 *
 * Philosophy: Sessions can crash, restart, or be paused. This context enables
 * nondeterministic idempotence across session boundaries.
 */
export interface OrchestrationContext extends AgentContext {
  // Convoy coordination
  /** ID of the convoy this session belongs to (null for standalone) */
  convoyId: string | null;
  /** Worker ID for this session (null for coordinator) */
  workerId: string | null;
  /** Issues assigned to this worker */
  assignedIssues: string[];

  // Session continuity
  /** Current session number within this epic */
  sessionNumber: number;
  /** Epic ID - groups related sessions across restarts */
  epicId: string;
  /** Parent session ID for tracking continuity */
  parentSessionId: string | null;

  // Cost tracking
  /** Cost of current session in USD */
  sessionCost: number;
  /** Cumulative cost across all sessions in this epic */
  cumulativeCost: number;
  /** Remaining budget (null if no budget set) */
  budgetRemaining: number | null;

  // Background execution
  /** Process ID if running in background (null if foreground) */
  backgroundPid: number | null;
  /** Timestamp when background execution started */
  backgroundStarted: string | null;
}

/**
 * Checkpoint storage format.
 * Stored in Git at .orchestration/checkpoints/{epicId}/ckpt-{id}.json
 */
export interface StoredCheckpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Epic ID this checkpoint belongs to */
  epicId: string;
  /** Session ID when checkpoint was created */
  sessionId: string;
  /** Session number within the epic */
  sessionNumber: number;
  /** ISO timestamp of checkpoint creation */
  timestamp: string;
  /** Git commit hash at checkpoint time */
  gitCommit: string;
  /** Full orchestration context for resume */
  context: OrchestrationContext;
  /** Human-readable summary */
  summary: string;
  /** Reason for checkpoint (time/event/cost) */
  reason: string;
}

/**
 * Session configuration options.
 */
export interface SessionConfig {
  /** Epic ID - groups related sessions */
  epicId: string;
  /** Resume from latest checkpoint */
  resume: boolean;
  /** Budget in USD (null for no budget) */
  budget: number | null;
  /** Run in background (via Task subagent) */
  background: boolean;
  /** Checkpoint policy override */
  checkpointPolicy?: CheckpointPolicy;
  /** Working directory */
  cwd?: string;
}

/**
 * Checkpoint policy - when to create checkpoints.
 */
export interface CheckpointPolicy {
  /** Create checkpoint every N minutes */
  intervalMinutes: number;
  /** Create checkpoint on specific events */
  events: {
    /** On session start (baseline check) */
    onSessionStart: boolean;
    /** On issue completion */
    onIssueComplete: boolean;
    /** On error/failure */
    onError: boolean;
    /** On cost threshold (% of budget) */
    onCostThreshold: number | null;
  };
}

/**
 * Default checkpoint policy.
 * Philosophy: Frequent enough to prevent data loss, but not so frequent as to be costly.
 */
export const DEFAULT_CHECKPOINT_POLICY: CheckpointPolicy = {
  intervalMinutes: 15,
  events: {
    onSessionStart: true,
    onIssueComplete: false, // Too frequent
    onError: true,
    onCostThreshold: 0.8, // 80% of budget
  },
};

/**
 * Session status.
 */
export type SessionStatus =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'budget_exceeded';

/**
 * Session metadata for tracking.
 */
export interface Session {
  /** Unique session ID */
  id: string;
  /** Epic ID */
  epicId: string;
  /** Session status */
  status: SessionStatus;
  /** Parent session ID (for resume) */
  parentSessionId: string | null;
  /** Session start timestamp */
  startedAt: string;
  /** Session end timestamp */
  completedAt: string | null;
  /** Session outcome */
  outcome: SessionOutcome | null;
  /** Session cost in USD */
  costUsd: number;
  /** Number of checkpoints created */
  checkpointCount: number;
  /** Latest checkpoint ID */
  latestCheckpointId: string | null;
  /** Issues worked on in this session */
  issuesWorked: string[];
  /** Issues completed in this session */
  issuesCompleted: string[];
}

/**
 * Cost tracker for budget enforcement.
 */
export interface CostTracker {
  /** Total budget in USD */
  budget: number;
  /** Consumed so far */
  consumed: number;
  /** Remaining budget */
  remaining: number;
  /** Whether budget is exceeded */
  exceeded: boolean;
  /** Warnings issued (at threshold %) */
  warnings: { threshold: number; issuedAt: string }[];
}

/**
 * Convoy - groups issues for parallel execution.
 * Inspired by Gastown but implemented with Task subagents.
 */
export interface Convoy {
  /** Unique convoy ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Issue IDs in this convoy */
  issueIds: string[];
  /** Convoy status */
  status: 'pending' | 'active' | 'completing' | 'completed' | 'failed';
  /** Creation timestamp */
  createdAt: string;
  /** Completion timestamp */
  completedAt: string | null;
  /** Worker assignments (issueId → workerId) */
  workers: Map<string, string>;
  /** Cost tracker for this convoy */
  costTracker: CostTracker | null;
  /** Epic ID for this convoy */
  epicId: string;
}

/**
 * Worker status within a convoy.
 */
export interface WorkerStatus {
  /** Worker ID */
  workerId: string;
  /** Assigned issue ID */
  issueId: string;
  /** Worker status */
  status: 'spawning' | 'running' | 'completed' | 'failed';
  /** Task subagent ID (from Claude Code Task tool) */
  taskId: string | null;
  /** Latest checkpoint ID */
  checkpoint: string | null;
  /** Cost in USD */
  costUsd: number;
  /** Start timestamp */
  startedAt: string;
  /** Completion timestamp */
  completedAt: string | null;
  /** Error message if failed */
  error: string | null;
}

/**
 * Stored convoy format for Git persistence.
 * Stored at .orchestration/convoys/{epicId}/convoy-{id}.json
 */
export interface StoredConvoy {
  /** Core convoy data */
  convoy: Convoy;
  /** Current worker states */
  workers: WorkerStatus[];
  /** Aggregated costs */
  costTracker: ConvoyCostTracker;
  /** Worker checkpoint IDs */
  checkpointIds: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Worker signal file for communication.
 * Written to .orchestration/workers/{workerId}/status.json
 */
export interface WorkerSignal {
  /** Worker ID */
  workerId: string;
  /** Assigned issue ID */
  issueId: string;
  /** Current status */
  status: 'running' | 'completed' | 'failed';
  /** Session outcome (when completed) */
  outcome?: SessionOutcome;
  /** Latest checkpoint ID */
  checkpoint?: string;
  /** Cost in USD */
  costUsd: number;
  /** Error message if failed */
  error?: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Cost tracker for convoy-level budget enforcement.
 * Three-level hierarchy: session → worker → convoy → epic
 */
export interface ConvoyCostTracker {
  /** Cost per session ID */
  sessionCosts: Record<string, number>;
  /** Cost per worker ID */
  workerCosts: Record<string, number>;
  /** Total convoy cost (sum of all workers) */
  convoyCost: number;
  /** Epic budget (null if no budget set) */
  epicBudget: number | null;
  /** Remaining budget */
  epicRemaining: number | null;
}

/**
 * Worker health report.
 */
export interface HealthReport {
  /** Number of healthy (running) workers */
  healthy: number;
  /** Number of completed workers */
  completed: number;
  /** Number of failed workers */
  failed: number;
  /** Number of stale workers (>20 min no checkpoint) */
  stale: number;
  /** Stale worker IDs */
  staleWorkerIds: string[];
}

/**
 * Convoy status report.
 */
export interface ConvoyStatus {
  /** Convoy ID */
  convoyId: string;
  /** Convoy name */
  name: string;
  /** Overall status */
  status: 'pending' | 'active' | 'completing' | 'completed' | 'failed';
  /** Total issues */
  totalIssues: number;
  /** Completed issues */
  completedIssues: number;
  /** Failed issues */
  failedIssues: number;
  /** In-progress issues */
  inProgressIssues: number;
  /** Worker health */
  health: HealthReport;
  /** Total cost */
  totalCost: number;
  /** Budget remaining (if set) */
  budgetRemaining: number | null;
  /** Created timestamp */
  createdAt: string;
  /** Estimated completion (null if can't estimate) */
  estimatedCompletion: string | null;
}

/**
 * Worker spawn configuration.
 */
export interface WorkerConfig {
  /** Epic ID */
  epicId: string;
  /** Convoy ID */
  convoyId: string;
  /** Working directory */
  cwd: string;
  /** Budget for this worker (null if no budget) */
  budget: number | null;
  /** Model to use for this worker (optional override) */
  modelOverride?: 'haiku' | 'sonnet' | 'opus';
  /** Actual model being used (set during spawn) */
  model?: 'haiku' | 'sonnet' | 'opus';
}
