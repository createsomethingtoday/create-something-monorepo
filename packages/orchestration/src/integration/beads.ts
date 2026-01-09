/**
 * @create-something/orchestration
 *
 * Beads integration for convoy coordination.
 * Labels issues, queries convoy membership, updates status.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { BeadsIssue, SessionOutcome } from '@create-something/harness';

const execAsync = promisify(exec);

/**
 * Label issues with convoy membership.
 *
 * Philosophy: Issues track their convoy via `convoy:{id}` label.
 * This enables querying convoy issues and cross-referencing.
 */
export async function labelConvoyIssues(convoyId: string, issueIds: string[]): Promise<void> {
  const label = `convoy:${convoyId}`;

  for (const issueId of issueIds) {
    try {
      await execAsync(`bd label add ${issueId} ${label}`);
    } catch (error) {
      console.warn(`Failed to label issue ${issueId} with ${label}:`, error);
    }
  }
}

/**
 * Get all issues in a convoy.
 */
export async function getConvoyIssues(convoyId: string): Promise<BeadsIssue[]> {
  const label = `convoy:${convoyId}`;

  try {
    const { stdout } = await execAsync(`bd list --label ${label} --json`);

    if (!stdout.trim()) {
      return [];
    }

    const issues = JSON.parse(stdout) as BeadsIssue[];
    return issues;
  } catch (error) {
    console.warn(`Failed to query convoy issues for ${convoyId}:`, error);
    return [];
  }
}

/**
 * Update issue status on worker completion.
 *
 * Philosophy: Workers update Beads directly, convoy tracks overall progress.
 */
export async function updateIssueOnCompletion(
  issueId: string,
  outcome: SessionOutcome,
  workerId: string,
  error?: string
): Promise<void> {
  try {
    if (outcome === 'success') {
      // Mark issue as completed
      await execAsync(`bd update ${issueId} --status completed`);
    } else {
      // Add note about failure, keep status as in_progress
      const note = `Worker ${workerId} failed: ${outcome}${error ? `\nError: ${error}` : ''}`;
      await execAsync(`bd note add ${issueId} "${note}"`);
    }
  } catch (error) {
    console.warn(`Failed to update issue ${issueId}:`, error);
  }
}

/**
 * Create blocker issue for worker failure.
 *
 * Philosophy: When workers fail, create tracked blockers for human intervention.
 */
export async function createBlockerIssue(
  workerId: string,
  issueId: string,
  error: string,
  convoyId: string
): Promise<string | null> {
  const title = `[Blocker] Worker ${workerId} failed on ${issueId}`;
  const description = `Worker ${workerId} encountered a fatal error while working on ${issueId}.

Convoy: ${convoyId}

Error:
${error}

This issue blocks completion of the convoy.`;

  try {
    const { stdout } = await execAsync(
      `bd create "${title}" --description "${description}" --priority P0 --label convoy:${convoyId} --label harness:blocker`
    );

    // Extract issue ID from output (format: "Created issue: cs-xxx")
    const match = stdout.match(/cs-[a-z0-9]+/);
    return match ? match[0] : null;
  } catch (error) {
    console.warn(`Failed to create blocker issue:`, error);
    return null;
  }
}

/**
 * Get issue by ID.
 */
export async function getIssue(issueId: string): Promise<BeadsIssue | null> {
  try {
    const { stdout } = await execAsync(`bd show ${issueId} --json`);

    if (!stdout.trim()) {
      return null;
    }

    return JSON.parse(stdout) as BeadsIssue;
  } catch (error) {
    console.warn(`Failed to get issue ${issueId}:`, error);
    return null;
  }
}

/**
 * Get multiple issues by IDs.
 */
export async function getIssues(issueIds: string[]): Promise<BeadsIssue[]> {
  const issues = await Promise.all(issueIds.map((id) => getIssue(id)));
  return issues.filter((issue): issue is BeadsIssue => issue !== null);
}

/**
 * Check if issue is blocked.
 */
export async function isIssueBlocked(issueId: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`bd deps list ${issueId} --json`);

    if (!stdout.trim()) {
      return false;
    }

    const deps = JSON.parse(stdout) as Array<{ type: string; depends_on_id: string; status: string }>;

    // Check if any blocking dependencies are not completed
    return deps.some((dep) => dep.type === 'blocks' && dep.status !== 'closed');
  } catch (error) {
    console.warn(`Failed to check if issue ${issueId} is blocked:`, error);
    return false;
  }
}

/**
 * Get ready issues (not blocked, status open).
 */
export async function getReadyIssues(issueIds: string[]): Promise<BeadsIssue[]> {
  const issues = await getIssues(issueIds);

  const readyIssues: BeadsIssue[] = [];

  for (const issue of issues) {
    if (issue.status !== 'open') continue;

    const isBlocked = await isIssueBlocked(issue.id);
    if (!isBlocked) {
      readyIssues.push(issue);
    }
  }

  return readyIssues;
}
