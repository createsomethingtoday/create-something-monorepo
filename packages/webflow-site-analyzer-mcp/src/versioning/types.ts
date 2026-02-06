/**
 * Versioning Types
 * 
 * Types for the script versioning and modification system.
 * The intelligence layer observes and evolves the automation layer.
 */

// =============================================================================
// Script Version Types
// =============================================================================

export interface ScriptVersion {
  id: string;                    // Unique version ID (e.g., "touchpoints-v1.2.0")
  scriptName: string;            // Name of the script (e.g., "touchpoints")
  version: string;               // Semantic version
  code: string;                  // The actual script code
  createdAt: string;             // ISO timestamp
  createdBy: 'human' | 'agent';  // Who created this version
  parentVersion?: string;        // Previous version this was derived from
  changelog: string;             // Description of changes
  status: 'draft' | 'testing' | 'active' | 'deprecated';
}

export interface ScriptMetrics {
  versionId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
  averageItemsExtracted: number;
  errorRate: number;
  // Quality signals
  userFeedbackScore?: number;    // 1-5 rating from users
  completenessScore?: number;    // How complete is the extraction (0-100)
  accuracyScore?: number;        // How accurate are the results (0-100)
}

export interface VersionComparison {
  baseVersion: string;
  compareVersion: string;
  metrics: {
    base: ScriptMetrics;
    compare: ScriptMetrics;
  };
  improvement: {
    successRate: number;         // Percentage improvement
    duration: number;            // Percentage improvement (negative = faster)
    itemsExtracted: number;      // Percentage improvement
  };
  recommendation: 'promote' | 'keep_testing' | 'rollback' | 'deprecate';
}

// =============================================================================
// Feedback Types
// =============================================================================

export interface ExtractionFeedback {
  id: string;
  versionId: string;
  url: string;
  timestamp: string;
  // What the script found
  extractedData: unknown;
  // What should have been found (ground truth)
  expectedData?: unknown;
  // Specific issues
  issues: FeedbackIssue[];
  // Overall rating
  rating: 1 | 2 | 3 | 4 | 5;
  // Free-form notes
  notes?: string;
}

export interface FeedbackIssue {
  type: 'missing' | 'incorrect' | 'extra' | 'timeout' | 'error';
  description: string;
  selector?: string;             // CSS selector of problematic element
  expected?: unknown;
  actual?: unknown;
}

// =============================================================================
// Modification Types
// =============================================================================

export interface ScriptModification {
  id: string;
  targetVersion: string;
  proposedBy: 'agent' | 'human';
  proposedAt: string;
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  // The change
  modification: {
    type: 'patch' | 'minor' | 'major';
    description: string;
    rationale: string;           // Why this change is needed
    evidence: string[];          // URLs or feedback IDs that support this change
  };
  // The new code (if approved)
  newCode?: string;
  newVersion?: string;
  // Review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface ModificationProposal {
  targetScript: string;
  currentVersion: string;
  proposedChanges: ProposedChange[];
  rationale: string;
  evidence: EvidenceItem[];
}

export interface ProposedChange {
  type: 'add_selector' | 'remove_selector' | 'modify_logic' | 'add_field' | 'fix_bug';
  description: string;
  codeChange: {
    search: string;              // Pattern to find
    replace: string;             // Replacement
  };
}

export interface EvidenceItem {
  type: 'feedback' | 'metric' | 'url' | 'error_log';
  id: string;
  summary: string;
}

// =============================================================================
// Registry Types
// =============================================================================

export interface ScriptRegistry {
  scripts: Record<string, ScriptEntry>;
  activeVersions: Record<string, string>;  // scriptName -> versionId
  testingVersions: Record<string, string>; // scriptName -> versionId (A/B testing)
}

export interface ScriptEntry {
  name: string;
  description: string;
  versions: ScriptVersion[];
  metrics: Record<string, ScriptMetrics>;  // versionId -> metrics
  feedback: ExtractionFeedback[];
  modifications: ScriptModification[];
}

// =============================================================================
// Event Types (for observability)
// =============================================================================

export type VersioningEvent =
  | { type: 'version_created'; version: ScriptVersion }
  | { type: 'version_promoted'; versionId: string; from: string; to: string }
  | { type: 'version_deprecated'; versionId: string; reason: string }
  | { type: 'feedback_recorded'; feedback: ExtractionFeedback }
  | { type: 'modification_proposed'; modification: ScriptModification }
  | { type: 'modification_applied'; modificationId: string; newVersionId: string }
  | { type: 'ab_test_started'; baseVersion: string; testVersion: string }
  | { type: 'ab_test_completed'; comparison: VersionComparison };
