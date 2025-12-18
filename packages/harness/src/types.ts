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
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

export interface StartOptions {
  specFile: string;
  checkpointEvery?: number;
  maxHours?: number;
  dryRun?: boolean;
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
