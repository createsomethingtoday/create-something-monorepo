/**
 * Pattern Analyzer for Issue Detection
 * 
 * Detects issues in Webflow apps through pattern matching:
 * - Archived apps
 * - Test/development apps
 * - Duplicate client IDs
 * - Naming anomalies
 * 
 * Canon: The infrastructure recedes; issues surface.
 */

import type { WebflowApp, DuplicateGroup, Issue } from './types';

// Patterns indicating archived apps
const ARCHIVED_PATTERNS = [
  /\[ARCHIVED\]/i,
  /\[OLD\]/i,
  /\(ARCHIVED\)/i,
  /ARCHIVED$/i,
  /\[Legacy/i,
  /\[Deprecated\]/i
];

// Patterns indicating test/development apps
const TEST_PATTERNS = [
  /\btest\b/i,
  /\[TEST\]/i,
  /\[FAKE\]/i,
  /\bfake\b/i,
  /-test$/i,
  /^test-/i,
  /\bdev\b/i,
  /\[DEV\]/i,
  /playground/i,
  /^shea-/i,  // Internal test pattern from audit
  /^my-amazing/i  // Default/template names
];

// Patterns indicating naming issues
const NAMING_ANOMALY_PATTERNS = [
  /^old\s/i,  // Starts with "old"
  /^old\s+old/i,  // Double "old" prefix
  /\[Drafted\]/i,
  /\s{2,}/,  // Multiple consecutive spaces
  /^-/,  // Starts with hyphen
  /-$/   // Ends with hyphen
];

/**
 * Check if app name matches any pattern in the list
 */
function matchesPatterns(name: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(name));
}

/**
 * Detect archived apps
 */
export function detectArchivedApps(apps: WebflowApp[]): Issue[] {
  return apps
    .filter(app => matchesPatterns(app.name, ARCHIVED_PATTERNS))
    .map(app => ({
      appSlug: app.slug,
      appName: app.name,
      type: 'archived' as const,
      severity: 'medium' as const,
      description: `App "${app.name}" appears to be archived based on naming convention`
    }));
}

/**
 * Detect test/development apps
 */
export function detectTestApps(apps: WebflowApp[]): Issue[] {
  return apps
    .filter(app => matchesPatterns(app.name, TEST_PATTERNS))
    .map(app => ({
      appSlug: app.slug,
      appName: app.name,
      type: 'test' as const,
      severity: 'low' as const,
      description: `App "${app.name}" appears to be a test or development app`
    }));
}

/**
 * Flag duplicate client ID issues
 */
export function detectDuplicateClientIds(
  duplicateGroups: DuplicateGroup[]
): Issue[] {
  const issues: Issue[] = [];
  
  for (const group of duplicateGroups) {
    // Skip groups that are likely intentional (same workspace)
    const uniqueWorkspaces = new Set(group.apps.map(a => a.workspaceId));
    
    if (uniqueWorkspaces.size > 1) {
      // Different workspaces sharing client ID = high severity
      for (const app of group.apps) {
        issues.push({
          appSlug: app.slug,
          appName: app.name,
          type: 'duplicate-client-id',
          severity: 'high',
          description: `Client ID shared across ${uniqueWorkspaces.size} different workspaces (${group.apps.length} total apps)`
        });
      }
    } else if (group.apps.length > 2) {
      // Same workspace but many apps = medium severity
      for (const app of group.apps) {
        issues.push({
          appSlug: app.slug,
          appName: app.name,
          type: 'duplicate-client-id',
          severity: 'medium',
          description: `Client ID shared among ${group.apps.length} apps in same workspace`
        });
      }
    } else {
      // Same workspace, 2 apps = likely archive pattern, low severity
      for (const app of group.apps) {
        issues.push({
          appSlug: app.slug,
          appName: app.name,
          type: 'duplicate-client-id',
          severity: 'low',
          description: `Client ID shared with 1 other app (likely archived version)`
        });
      }
    }
  }
  
  return issues;
}

/**
 * Detect naming anomalies
 */
export function detectNamingAnomalies(apps: WebflowApp[]): Issue[] {
  return apps
    .filter(app => matchesPatterns(app.name, NAMING_ANOMALY_PATTERNS))
    .map(app => ({
      appSlug: app.slug,
      appName: app.name,
      type: 'naming-anomaly' as const,
      severity: 'low' as const,
      description: `App "${app.name}" has unusual naming (may need cleanup)`
    }));
}

/**
 * Run all analyzers and return combined issues
 */
export function analyzeApps(
  apps: WebflowApp[],
  duplicateGroups: DuplicateGroup[]
): Issue[] {
  const allIssues: Issue[] = [];
  
  // Run all detectors
  allIssues.push(...detectArchivedApps(apps));
  allIssues.push(...detectTestApps(apps));
  allIssues.push(...detectDuplicateClientIds(duplicateGroups));
  allIssues.push(...detectNamingAnomalies(apps));
  
  // Deduplicate issues for the same app (keep highest severity)
  const issueMap = new Map<string, Issue>();
  const severityOrder = { high: 3, medium: 2, low: 1 };
  
  for (const issue of allIssues) {
    const key = `${issue.appSlug}:${issue.type}`;
    const existing = issueMap.get(key);
    
    if (!existing || severityOrder[issue.severity] > severityOrder[existing.severity]) {
      issueMap.set(key, issue);
    }
  }
  
  return Array.from(issueMap.values());
}

/**
 * Count issues by type
 */
export function countIssuesByType(
  issues: Issue[]
): Record<Issue['type'], number> {
  const counts: Record<Issue['type'], number> = {
    'archived': 0,
    'test': 0,
    'duplicate-client-id': 0,
    'naming-anomaly': 0
  };
  
  for (const issue of issues) {
    counts[issue.type]++;
  }
  
  return counts;
}

/**
 * Sort issues by severity (high first)
 */
export function sortIssuesBySeverity(issues: Issue[]): Issue[] {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
