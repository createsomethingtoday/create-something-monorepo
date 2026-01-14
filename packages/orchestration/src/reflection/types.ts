/**
 * @create-something/orchestration
 *
 * Types for agent reflection and learning extraction.
 *
 * Philosophy: Agents "sleep" to reorganize memory. During reflection,
 * we extract patterns from past sessions to improve future performance.
 * Inspired by RoboDev's self-reflection concept.
 */

/**
 * A learning extracted from reflection on past sessions.
 */
export interface Learning {
  /** Unique learning ID */
  id: string;
  /** Type of learning */
  type: LearningType;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Pattern that triggered this learning (code pattern, behavior, etc.) */
  pattern: string;
  /** Suggested prevention or improvement */
  suggestion: string;
  /** Source sessions/convoys that contributed to this learning */
  sources: LearningSource[];
  /** Confidence level (0-1) */
  confidence: number;
  /** Target rule file for this learning (e.g., 'cloudflare-patterns.md') */
  targetRuleFile: string | null;
  /** Creation timestamp */
  createdAt: string;
  /** Whether this learning has been applied to rules */
  applied: boolean;
}

/**
 * Types of learnings we can extract.
 */
export type LearningType =
  | 'correction' // User corrected agent behavior
  | 'failure' // Agent failed and had to retry
  | 'inefficiency' // Agent took unnecessary steps
  | 'missing_context' // Agent lacked needed context
  | 'pattern_violation' // Violated existing pattern
  | 'new_pattern'; // Discovered new useful pattern

/**
 * Source of a learning (session, convoy, or checkpoint).
 */
export interface LearningSource {
  /** Source type */
  type: 'session' | 'convoy' | 'checkpoint' | 'issue';
  /** Source ID */
  id: string;
  /** Specific evidence from this source */
  evidence: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Reflection result from analyzing a convoy or session.
 */
export interface ReflectionResult {
  /** Reflection ID */
  id: string;
  /** What was analyzed */
  target: ReflectionTarget;
  /** Extracted learnings */
  learnings: Learning[];
  /** Summary statistics */
  stats: ReflectionStats;
  /** Timestamp of reflection */
  timestamp: string;
}

/**
 * What we're reflecting on.
 */
export interface ReflectionTarget {
  /** Target type */
  type: 'convoy' | 'epic' | 'session';
  /** Target ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Start timestamp of the analyzed period */
  startedAt: string;
  /** End timestamp of the analyzed period */
  completedAt: string | null;
}

/**
 * Statistics from reflection analysis.
 */
export interface ReflectionStats {
  /** Total sessions analyzed */
  sessionsAnalyzed: number;
  /** Total issues completed */
  issuesCompleted: number;
  /** Total issues failed */
  issuesFailed: number;
  /** Average iterations per issue */
  avgIterations: number;
  /** Total corrections received */
  corrections: number;
  /** Total cost (USD) */
  totalCost: number;
  /** Cycle time in minutes (creation to close) */
  avgCycleTime: number;
}

/**
 * Work metrics for an issue.
 */
export interface IssueMetrics {
  /** Issue ID */
  issueId: string;
  /** Cycle time in minutes (creation to close) */
  cycleTimeMinutes: number;
  /** Number of iterations/attempts */
  iterations: number;
  /** Number of corrections received */
  corrections: number;
  /** Peer review findings count */
  reviewerFindings: number;
  /** Cost in USD */
  costUsd: number;
  /** Whether the issue was eventually successful */
  successful: boolean;
  /** Failure reasons if any */
  failureReasons: string[];
}

/**
 * Configuration for reflection.
 */
export interface ReflectionConfig {
  /** Minimum confidence threshold for learnings (0-1) */
  minConfidence: number;
  /** Whether to auto-apply learnings to rule files */
  autoApply: boolean;
  /** Whether to create a PR for changes */
  createPR: boolean;
  /** Branch name for changes */
  branchName: string;
}

/**
 * Default reflection configuration.
 */
export const DEFAULT_REFLECTION_CONFIG: ReflectionConfig = {
  minConfidence: 0.7,
  autoApply: false,
  createPR: true,
  branchName: 'agent/learnings',
};

/**
 * Stored reflection for persistence.
 * Stored at .orchestration/reflections/{id}.json
 */
export interface StoredReflection {
  /** Reflection result */
  reflection: ReflectionResult;
  /** Configuration used */
  config: ReflectionConfig;
  /** Applied learnings (IDs) */
  appliedLearnings: string[];
  /** Pending learnings (IDs) */
  pendingLearnings: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}
