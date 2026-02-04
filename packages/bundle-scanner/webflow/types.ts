// ============================================================================
// TYPES - Aligned with Cortex v4.0 (@cortex/shared-types)
// ============================================================================

export type Verdict = 'PASS' | 'FAIL' | 'INVESTIGATE' | 'ACTION_REQUIRED' | 'REJECTED';
export type Severity = 'CRITICAL' | 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ReviewBucket = 'AUTO_REJECT' | 'ACTION_REQUIRED' | 'NEEDS_EXPLANATION' | 'INFO';
export type Disposition = 'REJECTED' | 'ACTION_REQUIRED' | 'INFO';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type LocationType = 'CODE' | 'STRING' | 'COMMENT' | 'DOC' | 'TEST' | 'SOURCE_MAP' | 'UNKNOWN';

// New types from Cortex v4.0
export type Tier = 'BLOCKER' | 'ACTION_REQUIRED' | 'INVESTIGATE' | 'LOGS';
export type SignalType = 'SECURITY' | 'INTEGRITY';
export type Phase = 'P1-filter' | 'P2-hunter' | 'P3-memory' | 'P4-judge';

/**
 * Code snippet with context lines (for AI verification in P4)
 */
export interface CodeSnippet {
  /** The actual code that triggered the finding */
  code: string;
  /** Lines before for context */
  before?: string[];
  /** Lines after for context */
  after?: string[];
  /** Highlighted range within the code */
  highlightStart?: number;
  highlightEnd?: number;
}

/**
 * Code location in a file
 */
export interface CodeLocation {
  /** File path (normalized) */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed, optional) */
  column?: number;
  /** End line for multi-line spans */
  endLine?: number;
  /** End column for multi-line spans */
  endColumn?: number;
}

export interface ScanConfig {
  schemaVersion: string;
  configVersion: string;
  globalScanConfig: {
    hardExcludeGlobs: string[];
    textExtensions: string[];
    inventoryOnlyExtensions: string[];
    zipSafety: {
      preventZipSlip: boolean;
      maxTotalUnzippedBytes: number;
      maxFiles: number;
    };
  };
  limits: {
    maxMatchesPerFile: number;
    maxMatchesPerRule: number;
  };
  vendorHeuristics: {
    vendorDirGlobs: string[];
    generatedFileNameHints: string[];
  };
}

export interface ConditionalOverride {
  pattern: string;
  flags?: string;
  newSeverity?: Severity;
  newReviewBucket?: ReviewBucket;
  newDisposition?: Disposition;
  note?: string;
}

export interface RuleMatcher {
  id: string;
  type: 'regex' | 'bundleMetric' | 'urlInventory';
  pattern?: string;
  flags?: string;
  fileGlobs: string[];
  triggerTokens?: string[];
  allowlistPatterns?: string[];
  conditionalOverrides?: ConditionalOverride[];
  confidence?: Confidence;
  notes?: string;
}

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

export interface Ruleset {
  schemaVersion: string;
  rulesetVersion: string;
  generatedAt?: string;
  rules: ScanRule[];
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
  ext: string;
  isTextCandidate: boolean;
  content?: string;
  tags: string[];
  isIgnored: boolean;
}

export interface Finding {
  /** Unique finding ID (SHA-256 of content for deduplication) */
  id?: string;
  ruleId: string;
  matcherId: string;
  /** Pattern ID within the rule (if applicable) - from Cortex */
  patternId?: string;
  filePath: string;
  line: number;
  col: number;
  snippet: string;
  triggerToken: string;
  locationType: LocationType;
  confidence: Confidence;
  confidenceReason?: string;
  tags?: string[];
  severity?: Severity;
  reviewBucket?: ReviewBucket;
  disposition?: Disposition;
  /** UI category tier - from Cortex */
  tier?: Tier;
  /** Signal type - from Cortex */
  signalType?: SignalType;
  /** Code context with before/after lines - from Cortex */
  context?: CodeSnippet;
  /** Final verdict (from AI or rules) - from Cortex */
  verdict?: Verdict;
  /** Human-readable explanation of why this is flagged */
  reasoning?: string;
  /** Suggested fix */
  remediation?: string;
  /** Confidence score (0-100) */
  confidenceScore?: number;
  /** Phase that produced this finding */
  phase?: Phase;
  /** Whether manually marked as false positive */
  isFalsePositive?: boolean;
  /** Fingerprint for deduplication */
  fingerprint?: string;
}

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
  bundleSummary: {
    fileCount: number;
    totalBytes: number;
    scannedFileCount: number;
    skippedFileCount: number;
  };
  findings: {
    [ruleId: string]: {
      rule: ScanRule;
      count: number;
      items: Finding[];
    };
  };
}

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

export interface AiMissedRisk {
  title: string;
  whyItMatters: string;
  evidence: { filePath: string; line: number | null; snippet: string }[];
  confidence: Confidence;
  suggestedNextCheck: string;
}

export interface AiSuggestedRuleAddition {
  proposedRuleName: string;
  rationale: string;
  suggestedRegexOrAstIdea: string;
  recommendedFileGlobs: string[];
  falsePositiveNotes: string[];
  confidence: Confidence;
}

export interface AiSuggestedNoiseReduction {
  currentIssue: string;
  proposal: string;
  riskOfHidingRealIssues: Confidence;
}

export interface AiAnalysisResult {
  missedRisks: AiMissedRisk[];
  suggestedRuleAdditions: AiSuggestedRuleAddition[];
  suggestedNoiseReductions: AiSuggestedNoiseReduction[];
  questionsForReviewer: string[];
  reviewStatusRecommendation?: 'MANUAL_REVIEW_REQUIRED' | 'LOOKS_GOOD';
}

export interface RemediationInfo {
  whyItMatters: string;
  howToFix: string;
  badExample?: string;
  goodExample?: string;
  commonMistake?: string;
  estimatedFixTime?: string;
  officialDocs: {
    title: string;
    url: string;
    quote?: string;
  }[];
}

// ============================================================================
// API TYPES - For Cloudflare Worker integration (P3-memory + P4-judge)
// ============================================================================

/**
 * Request to verify findings via the scanner API
 */
export interface VerifyFindingsRequest {
  /** Findings from P2-hunter to verify */
  findings: Finding[];
  /** Scan context */
  context: {
    /** Bundle hash for deduplication */
    bundleHash?: string;
    /** App type for risk profiling */
    appType?: 'designer_extension' | 'data_client' | 'hybrid_app';
    /** Total files scanned */
    filesScanned: number;
  };
  /** Options */
  options?: {
    /** Enable P3 memory similarity search */
    enableMemory?: boolean;
    /** Enable P4 AI verification */
    enableAI?: boolean;
    /** Max findings to verify (to limit API costs) */
    maxFindings?: number;
  };
}

/**
 * Response from the scanner API
 */
export interface VerifyFindingsResponse {
  /** Verified findings with AI verdicts */
  findings: Finding[];
  /** Summary of the verification */
  summary: {
    /** Total findings received */
    totalReceived: number;
    /** Findings resolved by P3 memory */
    resolvedByMemory: number;
    /** Findings verified by P4 AI */
    verifiedByAI: number;
    /** Final BLOCKER count */
    blockerCount: number;
    /** Final ACTION_REQUIRED count */
    actionRequiredCount: number;
    /** Final INVESTIGATE count */
    investigateCount: number;
  };
  /** Phase timing */
  phases?: {
    p3Memory?: { timeMs: number; cacheHits: number };
    p4Judge?: { timeMs: number; llmCalls: number; tokensUsed: number };
  };
}

/**
 * Scanner API configuration
 */
export interface ScannerApiConfig {
  /** API endpoint URL (Cloudflare Worker) */
  endpoint: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}
