/**
 * Type definitions for the Audit Agent
 */

export interface Env {
  AI: Ai;
  ENVIRONMENT: string;
}

export interface WebflowApp {
  name: string;
  slug: string;
  clientId: string;
  workspaceId: string;
  error: string | null;
  editUrl: string;
}

export interface AuditData {
  generated: string;
  summary: {
    total: number;
    accessible: number;
    noAccess: number;
    errors: number;
    uniqueClientIds: number;
    duplicateClientIdGroups: number;
  };
  duplicateClientIds: DuplicateGroup[];
  allApps: WebflowApp[];
}

export interface DuplicateGroup {
  clientId: string;
  apps: Array<{
    name: string;
    slug: string;
    workspaceId: string;
  }>;
}

export type AppCategory = 
  | 'integration'
  | 'analytics'
  | 'forms-data'
  | 'ai-automation'
  | 'developer-tools'
  | 'ecommerce'
  | 'marketing'
  | 'localization'
  | 'accessibility'
  | 'other';

export interface CategorizedApp extends WebflowApp {
  category: AppCategory;
  confidence: number;
  reasoning: string;
}

export interface Issue {
  appSlug: string;
  appName: string;
  type: 'archived' | 'test' | 'duplicate-client-id' | 'naming-anomaly';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AuditReport {
  id: string;
  generatedAt: string;
  inputSummary: {
    totalApps: number;
    duplicateGroups: number;
  };
  categories: Record<AppCategory, CategorizedApp[]>;
  categoryCounts: Record<AppCategory, number>;
  issues: Issue[];
  issueCounts: Record<Issue['type'], number>;
  processingTimeMs: number;
}
