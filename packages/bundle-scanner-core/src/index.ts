/**
 * @create-something/bundle-scanner-core
 * 
 * Core scanning engine for Webflow Marketplace bundle analysis.
 * Provides deterministic rule-based scanning for security, privacy,
 * network, and UX policy compliance.
 */

// Scanner functions
export { processZipFile, processZipBuffer } from './scanner/zip';
export { buildInventory } from './scanner/inventory';
export { runScan } from './scanner/scan';
export { generateReport } from './scanner/report';
export type { ReportSummaryInput } from './scanner/report';

// Policy
export { defaultRuleset } from './policy/default-ruleset';
export { defaultConfig } from './policy/default-config';

// Utilities
export { matchesAnyGlob, shouldExclude, getExtension } from './utils/glob';
export { generateRejectionEmail, generatePassEmail } from './utils/email';
export { 
  analyzeReportWithAi, 
  GeminiProvider, 
  createGeminiProviderFromEnv 
} from './utils/ai';
export type { AiProvider } from './utils/ai';

// All types
export type {
  // Verdict & Severity
  Verdict,
  Severity,
  ReviewBucket,
  Disposition,
  Confidence,
  LocationType,
  
  // Configuration
  ScanConfig,
  
  // Ruleset
  Ruleset,
  ScanRule,
  RuleMatcher,
  ConditionalOverride,
  
  // File handling
  FileEntry,
  UnzippedFile,
  
  // Findings
  Finding,
  FindingGroup,
  
  // Reports
  ScanReport,
  BundleSummary,
  ScanHistoryEntry,
  
  // AI
  AiAnalysisResult,
  AiMissedRisk,
  AiSuggestedRuleAddition,
  AiSuggestedNoiseReduction,
  
  // Callbacks
  ProgressCallback
} from './types';
