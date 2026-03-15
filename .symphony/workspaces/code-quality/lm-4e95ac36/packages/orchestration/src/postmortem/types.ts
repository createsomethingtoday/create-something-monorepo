/**
 * @create-something/orchestration
 *
 * Types for postmortem analysis and prevention rule generation.
 *
 * Philosophy: Incidents are learning opportunities. Capture the root cause,
 * identify the code pattern that caused it, and generate prevention rules
 * that future agents can use to avoid the same mistake.
 */

/**
 * A postmortem analysis of an incident.
 */
export interface Postmortem {
  /** Unique postmortem ID */
  id: string;
  /** Issue ID that triggered the postmortem */
  issueId: string;
  /** Human-readable title */
  title: string;
  /** Incident description */
  description: string;
  /** Root cause analysis */
  rootCause: RootCause;
  /** Impact assessment */
  impact: Impact;
  /** Timeline of events */
  timeline: TimelineEvent[];
  /** Prevention rules generated */
  preventionRules: PreventionRule[];
  /** Status of the postmortem */
  status: PostmortemStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Completion timestamp */
  completedAt: string | null;
  /** Analyst (human or agent) */
  analyst: string;
}

/**
 * Root cause analysis.
 */
export interface RootCause {
  /** Category of root cause */
  category: RootCauseCategory;
  /** Detailed description */
  description: string;
  /** Code pattern that caused the issue */
  codePattern: string | null;
  /** Files involved */
  files: string[];
  /** Contributing factors */
  contributingFactors: string[];
  /** Why existing safeguards didn't catch this */
  safeguardGaps: string[];
}

/**
 * Categories of root causes.
 */
export type RootCauseCategory =
  | 'code_logic' // Bug in code logic
  | 'missing_validation' // Input not validated
  | 'race_condition' // Concurrency issue
  | 'resource_exhaustion' // Memory, connections, etc.
  | 'configuration' // Config error
  | 'dependency' // External dependency failure
  | 'security' // Security vulnerability
  | 'deployment' // Deployment/infrastructure issue
  | 'documentation' // Missing/wrong documentation
  | 'communication' // Team communication failure
  | 'other';

/**
 * Impact assessment.
 */
export interface Impact {
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Users affected (estimate) */
  usersAffected: number | null;
  /** Duration in minutes */
  durationMinutes: number | null;
  /** Services affected */
  servicesAffected: string[];
  /** Data impact (if any) */
  dataImpact: string | null;
  /** Financial impact (if any) */
  financialImpact: string | null;
}

/**
 * Timeline event during the incident.
 */
export interface TimelineEvent {
  /** ISO timestamp */
  timestamp: string;
  /** Event description */
  event: string;
  /** Actor (person/system) */
  actor: string;
  /** Event type */
  type: 'detection' | 'investigation' | 'mitigation' | 'resolution' | 'communication';
}

/**
 * A prevention rule generated from the postmortem.
 */
export interface PreventionRule {
  /** Unique rule ID */
  id: string;
  /** Rule title */
  title: string;
  /** What pattern to detect */
  pattern: string;
  /** What the agent should do when pattern is detected */
  action: string;
  /** Example of bad code */
  badExample: string | null;
  /** Example of good code */
  goodExample: string | null;
  /** Target rule file */
  targetRuleFile: string;
  /** Whether this rule has been applied */
  applied: boolean;
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Postmortem status.
 */
export type PostmortemStatus =
  | 'draft' // Initial creation
  | 'analyzing' // Root cause analysis in progress
  | 'review' // Ready for human review
  | 'approved' // Rules approved for application
  | 'applied' // Rules applied to rule files
  | 'closed'; // Postmortem complete

/**
 * Configuration for postmortem analysis.
 */
export interface PostmortemConfig {
  /** Auto-generate prevention rules */
  autoGenerateRules: boolean;
  /** Auto-apply approved rules */
  autoApplyRules: boolean;
  /** Require human review before applying */
  requireReview: boolean;
  /** Minimum confidence for auto-apply */
  minConfidence: number;
}

/**
 * Default postmortem configuration.
 */
export const DEFAULT_POSTMORTEM_CONFIG: PostmortemConfig = {
  autoGenerateRules: true,
  autoApplyRules: false, // Require explicit approval
  requireReview: true,
  minConfidence: 0.8,
};

/**
 * Stored postmortem for persistence.
 * Stored at .orchestration/postmortems/{id}.json
 */
export interface StoredPostmortem {
  /** Postmortem data */
  postmortem: Postmortem;
  /** Configuration used */
  config: PostmortemConfig;
  /** Applied rules */
  appliedRules: string[];
  /** Pending rules */
  pendingRules: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}
