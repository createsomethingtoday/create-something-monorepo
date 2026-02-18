// Shared TypeScript types for Webflow Review

export type CheckType = 'seo' | 'links' | 'a11y' | 'performance' | 'interactions';
export type Severity = 'critical' | 'warning' | 'info';
export type ReviewStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Finding {
  id?: string;
  checkType: CheckType;
  severity: Severity;
  message: string;
  pageUrl?: string;
  elementSelector?: string;
  evidence?: Record<string, any>;
  autoFixable?: boolean;
  createdAt?: number;
}

export interface PolicySourceSnapshot {
  url: string;
  title: string;
  fetchedAt: string;
  contentHash: string;
}

export interface PolicyContext {
  policyVersion: string;
  generatedAt: string;
  sources: {
    submissionGuidelines: PolicySourceSnapshot;
    gradingRubric: PolicySourceSnapshot;
  };
}

export interface Review {
  id: string;
  projectId: string;
  createdAt: number;
  completedAt?: number;
  status: ReviewStatus;
  overallScore?: number;
  reportUrl?: string;
  webhookUrl?: string;
  error?: string;
}

export interface ReviewPageRequest {
  url: string;
  checks?: CheckType[];
  includePolicyContext?: boolean;
}

export interface ReviewPageResponse {
  findings: Finding[];
  score: number;
  duration?: number;
  policy?: PolicyContext;
}

export interface ReviewProjectRequest {
  projectId: string;
  webhookUrl?: string;
  pages?: string[];
}

export interface ReviewProjectResponse {
  reviewId: string;
  statusUrl: string;
}

export interface ReviewStatusResponse {
  status: ReviewStatus;
  progress: number;
  score?: number;
  error?: string;
}

export interface AgentQueryRequest {
  question: string;
  projectId: string;
  context?: Record<string, any>;
}

export interface AgentQueryResponse {
  answer: string;
  evidence?: Finding[];
  suggestions?: string[];
}

export interface DurableObjectEnv {
  REVIEW_SESSIONS: DurableObjectNamespace;
}

export interface Env extends DurableObjectEnv {
  DB: D1Database;
  KV: KVNamespace;
  QUEUE: Queue;
  SCREENSHOTS: R2Bucket;
  AI: Ai;
  BROWSER: Fetcher;
}
