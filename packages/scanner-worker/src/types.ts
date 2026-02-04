/**
 * Scanner Worker Types
 * For P3-memory and P4-judge phases
 */

export interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  AI: Ai;
  ENVIRONMENT: string;
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

// ============================================================================
// Finding Types (aligned with bundle-scanner)
// ============================================================================

export type Verdict = 'PASS' | 'FAIL' | 'INVESTIGATE';
export type Severity = 'CRITICAL' | 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Tier = 'BLOCKER' | 'ACTION_REQUIRED' | 'INVESTIGATE' | 'LOGS';
export type SignalType = 'SECURITY' | 'INTEGRITY';
export type Phase = 'P2-hunter' | 'P3-memory' | 'P4-judge';

export interface CodeSnippet {
  code: string;
  before?: string[];
  after?: string[];
  highlightStart?: number;
  highlightEnd?: number;
}

export interface Finding {
  id?: string;
  ruleId: string;
  matcherId?: string;
  patternId?: string;
  filePath: string;
  line: number;
  col?: number;
  snippet: string;
  triggerToken?: string;
  tier?: Tier;
  signalType?: SignalType;
  severity?: Severity;
  confidence?: string;
  confidenceScore?: number;
  context?: CodeSnippet;
  verdict?: Verdict;
  reasoning?: string;
  remediation?: string;
  phase?: Phase;
  fingerprint?: string;
  isFalsePositive?: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface VerifyFindingsRequest {
  findings: Finding[];
  context: {
    bundleHash?: string;
    appType?: 'designer_extension' | 'data_client' | 'hybrid_app';
    filesScanned: number;
  };
  options?: {
    enableMemory?: boolean;
    enableAI?: boolean;
    maxFindings?: number;
  };
}

export interface VerifyFindingsResponse {
  findings: Finding[];
  summary: {
    totalReceived: number;
    resolvedByMemory: number;
    verifiedByAI: number;
    blockerCount: number;
    actionRequiredCount: number;
    investigateCount: number;
  };
  phases?: {
    p3Memory?: { timeMs: number; cacheHits: number };
    p4Judge?: { timeMs: number; llmCalls: number; tokensUsed: number };
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}

// ============================================================================
// Database Types
// ============================================================================

export interface StoredFinding {
  id: string;
  fingerprint: string;
  rule_id: string;
  snippet: string;
  verdict: Verdict;
  is_false_positive: number;
  reasoning?: string;
  created_at: string;
  updated_at: string;
}
