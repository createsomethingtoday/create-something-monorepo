/**
 * @create-something/harness
 *
 * Types for the autonomous agent harness.
 * Beads-based human oversight with progress reports and reactive redirection.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Spec & Features
// ─────────────────────────────────────────────────────────────────────────────

export interface Feature {
  id: string;
  title: string;
  description: string;
  priority: number; // 0-4 (P0=highest)
  dependsOn: string[]; // Feature IDs this depends on
  acceptanceCriteria: string[];
  labels: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  features: Feature[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Beads Integration
// ─────────────────────────────────────────────────────────────────────────────

export interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: number;
  issue_type: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  metadata?: Record<string, unknown>;
  dependencies?: Array<{
    issue_id: string;
    depends_on_id: string;
    type: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Harness State
// ─────────────────────────────────────────────────────────────────────────────

export type HarnessStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

export interface CheckpointPolicy {
  afterSessions: number; // Create checkpoint every N sessions
  afterHours: number; // Create checkpoint every M hours
  onError: boolean; // Create checkpoint on task failure
  onConfidenceBelow: number; // Pause if confidence drops below threshold
  onRedirect: boolean; // Create checkpoint when human redirects
}

export interface HarnessState {
  id: string;
  status: HarnessStatus;
  specFile: string;
  gitBranch: string;
  startedAt: string;
  currentSession: number;
  sessionsCompleted: number;
  featuresTotal: number;
  featuresCompleted: number;
  featuresFailed: number;
  lastCheckpoint: string | null;
  checkpointPolicy: CheckpointPolicy;
  pauseReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoints
// ─────────────────────────────────────────────────────────────────────────────

export interface Checkpoint {
  id: string;
  harnessId: string;
  sessionNumber: number;
  timestamp: string;
  summary: string;
  issuesCompleted: string[];
  issuesInProgress: string[];
  issuesFailed: string[];
  gitCommit: string;
  confidence: number;
  redirectNotes: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export type SessionOutcome = 'success' | 'failure' | 'partial' | 'context_overflow';

export interface SessionResult {
  issueId: string;
  outcome: SessionOutcome;
  summary: string;
  gitCommit: string | null;
  contextUsed: number;
  durationMs: number;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redirect Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface Redirect {
  type: 'priority_change' | 'new_urgent' | 'issue_closed' | 'pause_requested';
  issueId: string | null;
  description: string;
  detectedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priming Context
// ─────────────────────────────────────────────────────────────────────────────

export interface PrimingContext {
  currentIssue: BeadsIssue;
  recentCommits: string[];
  lastCheckpoint: Checkpoint | null;
  redirectNotes: string[];
  sessionGoal: string;
  // DRY Context Discovery
  existingPatterns?: string[];
  relevantFiles?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parallel Execution
// ─────────────────────────────────────────────────────────────────────────────

export interface ParallelExecutionConfig {
  /** Maximum number of agents to spawn in parallel (default: 1) */
  maxAgents: number;
  /** Whether to use independence analysis to determine parallelism (default: true) */
  useIndependenceAnalysis: boolean;
  /** Minimum batch size to trigger parallel execution (default: 2) */
  minBatchSize: number;
}

export interface ParallelSessionResult {
  /** Results from all sessions in the batch */
  results: SessionResult[];
  /** IDs of successfully completed issues */
  completed: string[];
  /** IDs of failed issues */
  failed: string[];
  /** Total duration for the batch */
  totalDurationMs: number;
  /** Whether all sessions succeeded */
  allSucceeded: boolean;
  /** Batch-level statistics */
  stats: BatchStats;
}

/**
 * Statistics for a single parallel batch.
 */
export interface BatchStats {
  /** Number of agents spawned */
  agentCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average duration per session */
  avgDurationMs: number;
  /** Maximum duration (slowest session) */
  maxDurationMs: number;
  /** Minimum duration (fastest session) */
  minDurationMs: number;
  /** Throughput: sessions per minute */
  throughput: number;
  /** Parallel efficiency: (sum of durations) / (totalDuration * agentCount) */
  efficiency: number;
}

/**
 * Aggregated results across multiple parallel batches.
 */
export interface AggregatedResults {
  /** All individual session results */
  allResults: SessionResult[];
  /** All batch results */
  batches: ParallelSessionResult[];
  /** Total sessions run */
  totalSessions: number;
  /** Total successful sessions */
  successfulSessions: number;
  /** Total failed sessions */
  failedSessions: number;
  /** Total partial sessions */
  partialSessions: number;
  /** Total wall clock time */
  totalWallTimeMs: number;
  /** Cumulative session time (would be sequential time) */
  cumulativeSessionTimeMs: number;
  /** Time saved via parallelism */
  timeSavedMs: number;
  /** Overall success rate */
  overallSuccessRate: number;
  /** Overall throughput (sessions per minute) */
  overallThroughput: number;
  /** Average batch efficiency */
  avgBatchEfficiency: number;
  /** Git commits produced */
  gitCommits: string[];
}

export const DEFAULT_PARALLEL_CONFIG: ParallelExecutionConfig = {
  maxAgents: 1,
  useIndependenceAnalysis: true,
  minBatchSize: 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

export interface StartOptions {
  specFile: string;
  checkpointEvery?: number;
  maxHours?: number;
  dryRun?: boolean;
  /** Number of parallel agents (default: 1 for sequential) */
  parallel?: number;
}

export interface ResumeOptions {
  harnessId?: string;
}

export interface PauseOptions {
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHECKPOINT_POLICY: CheckpointPolicy = {
  afterSessions: 3,
  afterHours: 4,
  onError: true,
  onConfidenceBelow: 0.7,
  onRedirect: true,
};
