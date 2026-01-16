// ============================================================================
// TYPES - Matching original IC implementation
// ============================================================================

export type Verdict = 'PASS' | 'ACTION_REQUIRED' | 'REJECTED';
export type Severity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ReviewBucket = 'AUTO_REJECT' | 'ACTION_REQUIRED' | 'NEEDS_EXPLANATION' | 'INFO';
export type Disposition = 'REJECTED' | 'ACTION_REQUIRED' | 'INFO';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type LocationType = 'CODE' | 'STRING' | 'COMMENT' | 'DOC' | 'TEST' | 'SOURCE_MAP' | 'UNKNOWN';

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
  severity?: Severity;
  reviewBucket?: ReviewBucket;
  disposition?: Disposition;
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
