/**
 * @create-something/harness
 *
 * Redirect Detector: Watches Beads for human-initiated changes.
 */

import type { BeadsIssue, Redirect } from './types.js';
import { readAllIssues, getOpenIssues, checkForPauseRequest } from './beads.js';

/**
 * Snapshot of Beads state for change detection.
 */
export interface BeadsSnapshot {
  timestamp: string;
  issues: Map<string, IssueSnapshot>;
}

interface IssueSnapshot {
  id: string;
  status: string;
  priority: number;
  updatedAt: string;
}

/**
 * Take a snapshot of current Beads state.
 */
export async function takeSnapshot(repoRoot?: string): Promise<BeadsSnapshot> {
  const issues = await readAllIssues(repoRoot);
  const issueMap = new Map<string, IssueSnapshot>();

  for (const issue of issues) {
    issueMap.set(issue.id, {
      id: issue.id,
      status: issue.status,
      priority: issue.priority,
      updatedAt: issue.updated_at,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    issues: issueMap,
  };
}

/**
 * Detect changes between two snapshots.
 */
export function detectChanges(
  before: BeadsSnapshot,
  after: BeadsSnapshot,
  harnessId: string
): Redirect[] {
  const redirects: Redirect[] = [];

  // Check for priority changes (P0 = urgent redirect)
  for (const [id, afterIssue] of after.issues) {
    const beforeIssue = before.issues.get(id);

    if (!beforeIssue) {
      // New issue created
      if (afterIssue.priority === 0) {
        redirects.push({
          type: 'new_urgent',
          issueId: id,
          description: `New P0 issue created: ${id}`,
          detectedAt: new Date().toISOString(),
        });
      }
      continue;
    }

    // Priority changed to P0
    if (beforeIssue.priority !== afterIssue.priority && afterIssue.priority === 0) {
      redirects.push({
        type: 'priority_change',
        issueId: id,
        description: `Priority changed from P${beforeIssue.priority} to P0: ${id}`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Issue closed (may indicate stop work)
    if (beforeIssue.status !== 'closed' && afterIssue.status === 'closed') {
      redirects.push({
        type: 'issue_closed',
        issueId: id,
        description: `Issue closed: ${id}`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return redirects;
}

/**
 * Check for any redirects since last snapshot.
 */
export async function checkForRedirects(
  lastSnapshot: BeadsSnapshot,
  harnessId: string,
  repoRoot?: string
): Promise<{
  redirects: Redirect[];
  newSnapshot: BeadsSnapshot;
  shouldPause: boolean;
  pauseReason: string | null;
}> {
  // Take new snapshot
  const newSnapshot = await takeSnapshot(repoRoot);

  // Detect changes
  const redirects = detectChanges(lastSnapshot, newSnapshot, harnessId);

  // Check for explicit pause request
  const pauseCheck = await checkForPauseRequest(harnessId, repoRoot);

  return {
    redirects,
    newSnapshot,
    shouldPause: pauseCheck.paused,
    pauseReason: pauseCheck.reason,
  };
}

/**
 * Format redirects as notes for inclusion in checkpoint.
 */
export function formatRedirectNotes(redirects: Redirect[]): string | null {
  if (redirects.length === 0) return null;

  const lines = redirects.map((r) => `- ${r.description}`);
  return lines.join('\n');
}

/**
 * Get the highest-priority redirect (for immediate action).
 */
export function getUrgentRedirect(redirects: Redirect[]): Redirect | null {
  // Priority: pause_requested > new_urgent > priority_change > issue_closed
  const priority: Redirect['type'][] = [
    'pause_requested',
    'new_urgent',
    'priority_change',
    'issue_closed',
  ];

  for (const type of priority) {
    const redirect = redirects.find((r) => r.type === type);
    if (redirect) return redirect;
  }

  return null;
}

/**
 * Determine if redirects require immediate attention.
 */
export function requiresImmediateAction(redirects: Redirect[]): boolean {
  return redirects.some(
    (r) => r.type === 'pause_requested' || r.type === 'new_urgent'
  );
}

/**
 * Create redirect log entry for debugging.
 */
export function logRedirect(redirect: Redirect): string {
  const time = new Date(redirect.detectedAt).toLocaleTimeString();
  const icon =
    redirect.type === 'pause_requested'
      ? '⏸'
      : redirect.type === 'new_urgent'
        ? '🚨'
        : redirect.type === 'priority_change'
          ? '⬆'
          : '✗';

  return `[${time}] ${icon} ${redirect.description}`;
}
