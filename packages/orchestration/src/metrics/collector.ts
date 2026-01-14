/**
 * @create-something/orchestration
 *
 * Metrics collector - gathers work metrics from various sources.
 *
 * Philosophy: Collect metrics passively from existing data sources.
 * Don't require extra instrumentation - extract from checkpoints,
 * convoys, and Beads issues.
 */

import type { StoredCheckpoint, StoredConvoy } from '../types.js';
import type {
  WorkMetrics,
  ReviewerFindings,
  EMPTY_REVIEWER_FINDINGS,
} from './types.js';
import { listCheckpoints } from '../checkpoint/store.js';
import { loadConvoy, listConvoys } from '../coordinator/convoy.js';
import { getIssue, getIssues } from '../integration/beads.js';
import type { BeadsIssue } from '../integration/beads.js';

/**
 * Collect metrics for a single issue.
 */
export async function collectIssueMetrics(
  issueId: string,
  checkpoints: StoredCheckpoint[],
  cwd: string = process.cwd()
): Promise<WorkMetrics | null> {
  // Get issue details
  const issue = await getIssue(issueId);

  if (!issue) {
    return null;
  }

  // Filter checkpoints related to this issue
  const issueCheckpoints = checkpoints.filter(
    (cp) =>
      cp.context.issuesUpdated.includes(issueId) ||
      cp.context.currentTask?.issueId === issueId
  );

  // Calculate time metrics
  const createdAt = issue.created_at || new Date().toISOString();
  const completedAt = issue.closed_at || null;

  const cycleTimeMinutes = completedAt
    ? (new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 60000
    : 0;

  // Calculate first response time
  const firstCheckpoint = issueCheckpoints[issueCheckpoints.length - 1]; // Oldest
  const firstResponseMinutes = firstCheckpoint
    ? (new Date(firstCheckpoint.timestamp).getTime() - new Date(createdAt).getTime()) / 60000
    : null;

  // Count sessions and iterations
  const sessions = new Set(issueCheckpoints.map((cp) => cp.sessionId)).size;
  const iterations = Math.max(sessions, 1);

  // Count corrections (blockers)
  const corrections = issueCheckpoints.reduce(
    (acc, cp) => acc + cp.context.blockers.length,
    0
  );

  // Count retries (failed sessions followed by more work)
  const retries = countRetries(issueCheckpoints);

  // Extract reviewer findings from checkpoints
  const reviewerFindings = extractReviewerFindings(issueCheckpoints);
  const totalFindings =
    reviewerFindings.security.total +
    reviewerFindings.architecture.total +
    reviewerFindings.quality.total;

  // Calculate cost
  const costUsd = issueCheckpoints.reduce(
    (acc, cp) => acc + (cp.context.sessionCost || 0),
    0
  );
  const costPerIteration = iterations > 0 ? costUsd / iterations : 0;

  // Determine success
  const successful = issue.status === 'closed' || issue.status === 'completed';
  const failureReasons = extractFailureReasons(issueCheckpoints);

  return {
    issueId,
    title: issue.title,
    labels: issue.labels || [],
    cycleTimeMinutes,
    timeInStatus: {}, // TODO: Track status transitions
    firstResponseMinutes,
    sessions,
    iterations,
    corrections,
    retries,
    reviewerFindings,
    totalFindings,
    findingsRequiringRework: reviewerFindings.security.blocking +
      reviewerFindings.architecture.blocking +
      reviewerFindings.quality.blocking,
    costUsd,
    costPerIteration,
    successful,
    finalStatus: issue.status,
    failureReasons,
    createdAt,
    completedAt,
  };
}

/**
 * Collect metrics for all issues in a convoy.
 */
export async function collectConvoyMetrics(
  convoyId: string,
  epicId: string,
  cwd: string = process.cwd()
): Promise<WorkMetrics[]> {
  // Load convoy
  const convoy = await loadConvoy(convoyId, epicId, cwd);

  if (!convoy) {
    return [];
  }

  // Load all checkpoints
  const checkpoints = await listCheckpoints(epicId, cwd);

  // Collect metrics for each issue
  const metrics: WorkMetrics[] = [];

  for (const worker of convoy.workers) {
    const issueMetrics = await collectIssueMetrics(worker.issueId, checkpoints, cwd);
    if (issueMetrics) {
      // Override with worker-specific data
      issueMetrics.costUsd = worker.costUsd;
      issueMetrics.successful = worker.status === 'completed';
      if (worker.error) {
        issueMetrics.failureReasons.push(worker.error);
      }
      metrics.push(issueMetrics);
    }
  }

  return metrics;
}

/**
 * Collect metrics for all issues in an epic.
 */
export async function collectEpicMetrics(
  epicId: string,
  cwd: string = process.cwd()
): Promise<WorkMetrics[]> {
  // Load all checkpoints
  const checkpoints = await listCheckpoints(epicId, cwd);

  // Get all unique issue IDs from checkpoints
  const issueIds = new Set<string>();
  for (const cp of checkpoints) {
    for (const issueId of cp.context.issuesUpdated) {
      issueIds.add(issueId);
    }
    if (cp.context.currentTask?.issueId) {
      issueIds.add(cp.context.currentTask.issueId);
    }
  }

  // Collect metrics for each issue
  const metrics: WorkMetrics[] = [];

  for (const issueId of issueIds) {
    const issueMetrics = await collectIssueMetrics(issueId, checkpoints, cwd);
    if (issueMetrics) {
      metrics.push(issueMetrics);
    }
  }

  return metrics;
}

/**
 * Count retries from checkpoints.
 */
function countRetries(checkpoints: StoredCheckpoint[]): number {
  let retries = 0;
  let lastWasFailure = false;

  // Sort by timestamp
  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const cp of sorted) {
    const hasBlockers = cp.context.blockers.length > 0;
    const hasFailureNotes = cp.context.agentNotes.some(
      (note) =>
        note.toLowerCase().includes('fail') ||
        note.toLowerCase().includes('retry') ||
        note.toLowerCase().includes('error')
    );

    if (hasBlockers || hasFailureNotes) {
      lastWasFailure = true;
    } else if (lastWasFailure) {
      retries++;
      lastWasFailure = false;
    }
  }

  return retries;
}

/**
 * Extract reviewer findings from checkpoints.
 */
function extractReviewerFindings(checkpoints: StoredCheckpoint[]): ReviewerFindings {
  const findings: ReviewerFindings = {
    security: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
    architecture: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
    quality: { total: 0, critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
  };

  for (const cp of checkpoints) {
    // Check agent notes for review findings
    for (const note of cp.context.agentNotes) {
      const lower = note.toLowerCase();

      // Detect reviewer type
      let reviewer: keyof ReviewerFindings | null = null;
      if (lower.includes('security') || lower.includes('vulnerability')) {
        reviewer = 'security';
      } else if (lower.includes('architecture') || lower.includes('dry') || lower.includes('coupling')) {
        reviewer = 'architecture';
      } else if (lower.includes('quality') || lower.includes('test') || lower.includes('coverage')) {
        reviewer = 'quality';
      }

      if (reviewer) {
        findings[reviewer].total++;

        // Detect severity
        if (lower.includes('critical')) {
          findings[reviewer].critical++;
          findings[reviewer].blocking++;
        } else if (lower.includes('high')) {
          findings[reviewer].high++;
        } else if (lower.includes('medium')) {
          findings[reviewer].medium++;
        } else {
          findings[reviewer].low++;
        }
      }
    }

    // Check blockers for review findings
    for (const blocker of cp.context.blockers) {
      const lower = blocker.description.toLowerCase();

      let reviewer: keyof ReviewerFindings | null = null;
      if (lower.includes('security')) {
        reviewer = 'security';
      } else if (lower.includes('architecture') || lower.includes('dry')) {
        reviewer = 'architecture';
      } else if (lower.includes('quality') || lower.includes('test')) {
        reviewer = 'quality';
      }

      if (reviewer) {
        findings[reviewer].total++;
        findings[reviewer].blocking++;
      }
    }
  }

  return findings;
}

/**
 * Extract failure reasons from checkpoints.
 */
function extractFailureReasons(checkpoints: StoredCheckpoint[]): string[] {
  const reasons: string[] = [];

  for (const cp of checkpoints) {
    // Check blockers
    for (const blocker of cp.context.blockers) {
      reasons.push(blocker.description);
    }

    // Check agent notes for failure indicators
    for (const note of cp.context.agentNotes) {
      const lower = note.toLowerCase();
      if (
        lower.includes('failed') ||
        lower.includes('error') ||
        lower.includes('could not')
      ) {
        reasons.push(note);
      }
    }
  }

  return [...new Set(reasons)]; // Deduplicate
}
