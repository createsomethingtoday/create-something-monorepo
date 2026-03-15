/**
 * Bundle Scanner Type Definitions
 * 
 * These types define the schema for rulesets, scan configuration,
 * findings, and reports used throughout the scanning process.
 */

// ============================================================================
// VERDICT & SEVERITY TYPES
// ============================================================================

/** Final verdict for a scan */
export type Verdict = 'PASS' | 'ACTION_REQUIRED' | 'REJECTED';

/** Severity level for a rule */
export type Severity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Review bucket classification */
export type ReviewBucket = 'AUTO_REJECT' | 'ACTION_REQUIRED' | 'NEEDS_EXPLANATION' | 'INFO';

/** Disposition for a finding */
export type Disposition = 'REJECTED' | 'ACTION_REQUIRED' | 'INFO';

/** Confidence level for a finding */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Location type where a finding was detected */
export type LocationType = 'CODE' | 'STRING' | 'COMMENT' | 'DOC' | 'TEST' | 'SOURCE_MAP' | 'UNKNOWN';

// ============================================================================
// SCANNER CONFIGURATION
// ============================================================================

/**
 * Global scanner configuration
 */
export interface ScanConfig {
  schemaVersion: string;
  configVersion: string;
  globalScanConfig: {
    /** Glob patterns for files to always exclude */
    hardExcludeGlobs: string[];
    /** File extensions to scan as text */
    textExtensions: string[];
    /** Extensions to inventory but not scan content */
    inventoryOnlyExtensions: string[];
    /** ZIP extraction safety limits */
    zipSafety: {
      preventZipSlip: boolean;
      maxTotalUnzippedBytes: number;
      maxFiles: number;
    };
  };
  /** Matching limits to prevent runaway scans */
  limits: {
    maxMatchesPerFile: number;
    maxMatchesPerRule: number;
  };
  /** Heuristics for identifying vendor/generated code */
  vendorHeuristics: {
    vendorDirGlobs: string[];
    generatedFileNameHints: string[];
  };
}

// ============================================================================
// RULESET DEFINITIONS
// ============================================================================

/**
 * Conditional override to escalate/de-escalate severity based on context
 */
export interface ConditionalOverride {
  /** Regex pattern to match against the snippet */
  pattern: string;
  flags?: string;
  newSeverity?: Severity;
  newReviewBucket?: ReviewBucket;
  newDisposition?: Disposition;
  note?: string;
}

/**
 * A single matcher within a rule
 */
export interface RuleMatcher {
  id: string;
  type: 'regex' | 'bundleMetric' | 'urlInventory';
  /** Regex pattern (for type: 'regex') */
  pattern?: string;
  flags?: string;
  /** Glob patterns for files to match against */
  fileGlobs: string[];
  /** Tokens that trigger this matcher (for documentation) */
  triggerTokens?: string[];
  /** Patterns that exempt a match */
  allowlistPatterns?: string[];
  /** Context-sensitive severity adjustments */
  conditionalOverrides?: ConditionalOverride[];
  confidence?: Confidence;
  notes?: string;
}

/**
 * A single scanning rule
 */
export interface ScanRule {
  ruleId: string;
  name: string;
  category: string;
  reviewBucket: ReviewBucket;
  severity: Severity;
  disposition: Disposition;
  description: string;
  matchers: RuleMatcher[];
}

/**
 * Complete ruleset configuration
 */
export interface Ruleset {
  schemaVersion: string;
  rulesetVersion: string;
  generatedAt?: string;
  rules: ScanRule[];
}

// ============================================================================
// FILE INVENTORY
// ============================================================================

/**
 * A file extracted from the bundle
 */
export interface FileEntry {
  path: string;
  sizeBytes: number;
  ext: string;
  isTextCandidate: boolean;
  content?: string;
  tags: string[];
  isIgnored: boolean;
}

/**
 * Raw file data from ZIP extraction
 */
export interface UnzippedFile {
  path: string;
  data: Uint8Array;
}

// ============================================================================
// FINDINGS
// ============================================================================

/**
 * A single finding from the scanner
 */
export interface Finding {
  ruleId: string;
  matcherId: string;
  filePath: string;
  line: number;
  col: number;
  snippet: string;
  triggerToken: string;
  locationType: LocationType;
  confidence: Confidence;
  confidenceReason?: string;
  tags?: string[];
  
  // Dynamic overrides based on specific finding context
  severity?: Severity;
  reviewBucket?: ReviewBucket;
  disposition?: Disposition;
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Bundle summary statistics
 */
export interface BundleSummary {
  fileCount: number;
  totalBytes: number;
  scannedFileCount: number;
  skippedFileCount: number;
}

/**
 * Grouped findings by rule
 */
export interface FindingGroup {
  rule: ScanRule;
  count: number;
  items: Finding[];
}

/**
 * Complete scan report
 */
export interface ScanReport {
  scanReportVersion: string;
  runId: string;
  createdAt: string;
  
  policyMetadata: {
    rulesetVersion: string;
    configVersion: string;
  };

  verdict: Verdict;
  verdictReasons: string[];
  
  bundleSummary: BundleSummary;
  
  findings: Record<string, FindingGroup>;
}

// ============================================================================
// HISTORY
// ============================================================================

/**
 * Entry for scan history storage
 */
export interface ScanHistoryEntry {
  runId: string;
  createdAt: string;
  verdict: Verdict;
  summary: string;
  fileCount: number;
  totalBytes: number;
  findingCount: number;
  fullReport: ScanReport;
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

/**
 * A potential risk missed by the scanner
 */
export interface AiMissedRisk {
  title: string;
  whyItMatters: string;
  evidence: Array<{ filePath: string; line: number | null; snippet: string }>;
  confidence: Confidence;
  suggestedNextCheck: string;
}

/**
 * Suggested new rule to add
 */
export interface AiSuggestedRuleAddition {
  proposedRuleName: string;
  rationale: string;
  suggestedRegexOrAstIdea: string;
  recommendedFileGlobs: string[];
  falsePositiveNotes: string[];
  confidence: Confidence;
}

/**
 * Suggestion to reduce false positives
 */
export interface AiSuggestedNoiseReduction {
  currentIssue: string;
  proposal: string;
  riskOfHidingRealIssues: Confidence;
}

/**
 * Complete AI analysis result
 */
export interface AiAnalysisResult {
  missedRisks: AiMissedRisk[];
  suggestedRuleAdditions: AiSuggestedRuleAddition[];
  suggestedNoiseReductions: AiSuggestedNoiseReduction[];
  questionsForReviewer: string[];
  reviewStatusRecommendation?: 'MANUAL_REVIEW_REQUIRED' | 'LOOKS_GOOD';
}

// ============================================================================
// PROGRESS CALLBACK
// ============================================================================

/**
 * Callback for progress updates during scanning
 */
export type ProgressCallback = (message: string) => void;
