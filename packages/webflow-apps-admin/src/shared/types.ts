/**
 * Shared types for Webflow Admin Tools
 */

export interface WebflowApp {
  name: string;
  slug: string;
  clientId: string | null;
  workspaceId: string | null;
  detailUrl: string;
  editUrl: string;
  error: string | null;
}

export interface DuplicateGroup {
  id: string;
  apps: WebflowApp[];
}

export interface AuditResults {
  all: WebflowApp[];
  accessible: WebflowApp[];
  noAccess: WebflowApp[];
  errors: WebflowApp[];
  byClientId: Record<string, WebflowApp[]>;
  byWorkspaceId: Record<string, WebflowApp[]>;
  duplicates: {
    clientId: DuplicateGroup[];
    workspaceId: DuplicateGroup[];
  };
}

export interface AuditReport {
  generated: string;
  tool: string;
  version: string;
  summary: {
    total: number;
    accessible: number;
    noAccess: number;
    errors: number;
    uniqueClientIds: number;
    duplicateClientIdGroups: number;
  };
  duplicateClientIds: Array<{
    clientId: string;
    appCount: number;
    workspaceCount: number;
    apps: Array<{
      name: string;
      slug: string;
      workspaceId: string | null;
    }>;
  }>;
  allApps: WebflowApp[];
}
