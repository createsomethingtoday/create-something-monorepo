/**
 * @create-something/orchestration
 *
 * Analyzes completed convoys/sessions to extract patterns for reflection.
 *
 * Philosophy: Like RoboDev's "sleep" phase, we analyze past work to
 * identify corrections, failures, and inefficiencies. This feeds into
 * the learning extraction phase.
 */

import type { StoredCheckpoint, StoredConvoy } from '../types.js';
import type {
  ReflectionResult,
  ReflectionTarget,
  ReflectionStats,
  IssueMetrics,
  ReflectionConfig
} from './types.js';
import { DEFAULT_REFLECTION_CONFIG } from './types.js';
import { listCheckpoints } from '../checkpoint/store.js';
import { loadConvoy, listConvoys } from '../coordinator/convoy.js';
import { nanoid } from 'nanoid';
import { extractLearnings } from './extractor.js';

/**
 * Analyze a completed convoy for reflection.
 *
 * Examines all workers, checkpoints, and outcomes to identify patterns.
 */
export async function analyzeConvoy(
  convoyId: string,
  epicId: string,
  config: ReflectionConfig = DEFAULT_REFLECTION_CONFIG,
  cwd: string = process.cwd()
): Promise<ReflectionResult> {
  // Load convoy data
  const loadedConvoy = await loadConvoy(convoyId, epicId, cwd);

  if (!loadedConvoy) {
    throw new Error(`Convoy ${convoyId} not found in epic ${epicId}`);
  }

  // Extract stored convoy from wrapper
  const { stored } = loadedConvoy;

  // Load all checkpoints for the epic
  const checkpoints = await listCheckpoints(epicId, cwd);

  // Filter checkpoints related to this convoy
  const convoyCheckpoints = checkpoints.filter((cp) => cp.context.convoyId === convoyId);

  // Calculate metrics for each issue
  const issueMetrics = calculateIssueMetrics(stored, convoyCheckpoints);

  // Calculate aggregate statistics
  const stats = calculateStats(issueMetrics, stored);

  // Create reflection target
  const target: ReflectionTarget = {
    type: 'convoy',
    id: convoyId,
    name: stored.convoy.name,
    startedAt: stored.createdAt,
    completedAt: stored.convoy.completedAt,
  };

  // Extract learnings from the analysis
  const learnings = await extractLearnings(
    target,
    convoyCheckpoints,
    issueMetrics,
    stats,
    config
  );

  return {
    id: `refl-${nanoid(10)}`,
    target,
    learnings,
    stats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analyze an entire epic for reflection.
 *
 * Examines all sessions and convoys within the epic.
 */
export async function analyzeEpic(
  epicId: string,
  config: ReflectionConfig = DEFAULT_REFLECTION_CONFIG,
  cwd: string = process.cwd()
): Promise<ReflectionResult> {
  // Load all checkpoints for the epic
  const checkpoints = await listCheckpoints(epicId, cwd);

  if (checkpoints.length === 0) {
    throw new Error(`No checkpoints found for epic ${epicId}`);
  }

  // Load all convoys for the epic
  const convoys = await listConvoys(epicId, cwd);

  // Combine all issue metrics
  const allIssueMetrics: IssueMetrics[] = [];

  for (const convoy of convoys) {
    const convoyCheckpoints = checkpoints.filter((cp) => cp.context.convoyId === convoy.convoy.id);
    const metrics = calculateIssueMetrics(convoy, convoyCheckpoints);
    allIssueMetrics.push(...metrics);
  }

  // Include issues from standalone sessions (no convoy)
  const standaloneCheckpoints = checkpoints.filter((cp) => cp.context.convoyId === null);
  if (standaloneCheckpoints.length > 0) {
    const standaloneMetrics = calculateStandaloneMetrics(standaloneCheckpoints);
    allIssueMetrics.push(...standaloneMetrics);
  }

  // Calculate aggregate statistics
  const stats = calculateAggregateStats(allIssueMetrics, checkpoints);

  // Determine time range
  const timestamps = checkpoints.map((cp) => new Date(cp.timestamp).getTime());
  const startedAt = new Date(Math.min(...timestamps)).toISOString();
  const completedAt = new Date(Math.max(...timestamps)).toISOString();

  // Create reflection target
  const target: ReflectionTarget = {
    type: 'epic',
    id: epicId,
    name: epicId,
    startedAt,
    completedAt,
  };

  // Extract learnings
  const learnings = await extractLearnings(target, checkpoints, allIssueMetrics, stats, config);

  return {
    id: `refl-${nanoid(10)}`,
    target,
    learnings,
    stats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate metrics for each issue in a convoy.
 */
function calculateIssueMetrics(convoy: StoredConvoy, checkpoints: StoredCheckpoint[]): IssueMetrics[] {
  const metrics: IssueMetrics[] = [];

  for (const worker of convoy.workers) {
    // Find checkpoints for this worker
    const workerCheckpoints = checkpoints.filter((cp) => cp.context.workerId === worker.workerId);

    // Count iterations (sessions that worked on this issue)
    const iterations = new Set(workerCheckpoints.map((cp) => cp.sessionId)).size || 1;

    // Count corrections (blockers encountered)
    const corrections = workerCheckpoints.reduce((acc, cp) => acc + cp.context.blockers.length, 0);

    // Calculate cycle time
    const startTime = new Date(worker.startedAt).getTime();
    const endTime = worker.completedAt ? new Date(worker.completedAt).getTime() : Date.now();
    const cycleTimeMinutes = (endTime - startTime) / 60000;

    // Determine success
    const successful = worker.status === 'completed';

    metrics.push({
      issueId: worker.issueId,
      cycleTimeMinutes,
      iterations,
      corrections,
      reviewerFindings: 0, // TODO: Extract from peer review results
      costUsd: worker.costUsd,
      successful,
      failureReasons: worker.error ? [worker.error] : [],
    });
  }

  return metrics;
}

/**
 * Calculate metrics for standalone sessions (no convoy).
 */
function calculateStandaloneMetrics(checkpoints: StoredCheckpoint[]): IssueMetrics[] {
  const issueMap = new Map<string, IssueMetrics>();

  for (const cp of checkpoints) {
    const ctx = cp.context;

    // Track issues worked on
    for (const update of ctx.issuesUpdated) {
      const issueId = update.issueId;
      if (!issueMap.has(issueId)) {
        issueMap.set(issueId, {
          issueId,
          cycleTimeMinutes: 0,
          iterations: 0,
          corrections: 0,
          reviewerFindings: 0,
          costUsd: 0,
          successful: false,
          failureReasons: [],
        });
      }

      const metrics = issueMap.get(issueId)!;
      metrics.iterations++;
      metrics.corrections += ctx.blockers.length;
      metrics.costUsd += ctx.sessionCost;
    }
  }

  return Array.from(issueMap.values());
}

/**
 * Calculate aggregate statistics for a convoy.
 */
function calculateStats(issueMetrics: IssueMetrics[], convoy: StoredConvoy): ReflectionStats {
  const totalIssues = issueMetrics.length;
  const successful = issueMetrics.filter((m) => m.successful).length;
  const failed = issueMetrics.filter((m) => !m.successful).length;

  const avgIterations = totalIssues > 0 ? issueMetrics.reduce((acc, m) => acc + m.iterations, 0) / totalIssues : 0;

  const totalCorrections = issueMetrics.reduce((acc, m) => acc + m.corrections, 0);
  const totalCost = convoy.costTracker.convoyCost;

  const avgCycleTime =
    totalIssues > 0 ? issueMetrics.reduce((acc, m) => acc + m.cycleTimeMinutes, 0) / totalIssues : 0;

  return {
    sessionsAnalyzed: convoy.workers.length,
    issuesCompleted: successful,
    issuesFailed: failed,
    avgIterations,
    corrections: totalCorrections,
    totalCost,
    avgCycleTime,
  };
}

/**
 * Calculate aggregate statistics from checkpoints.
 */
function calculateAggregateStats(
  issueMetrics: IssueMetrics[],
  checkpoints: StoredCheckpoint[]
): ReflectionStats {
  const totalIssues = issueMetrics.length;
  const successful = issueMetrics.filter((m) => m.successful).length;
  const failed = issueMetrics.filter((m) => !m.successful).length;

  const avgIterations = totalIssues > 0 ? issueMetrics.reduce((acc, m) => acc + m.iterations, 0) / totalIssues : 0;

  const totalCorrections = issueMetrics.reduce((acc, m) => acc + m.corrections, 0);
  const totalCost = issueMetrics.reduce((acc, m) => acc + m.costUsd, 0);

  const avgCycleTime =
    totalIssues > 0 ? issueMetrics.reduce((acc, m) => acc + m.cycleTimeMinutes, 0) / totalIssues : 0;

  // Count unique sessions
  const uniqueSessions = new Set(checkpoints.map((cp) => cp.sessionId)).size;

  return {
    sessionsAnalyzed: uniqueSessions,
    issuesCompleted: successful,
    issuesFailed: failed,
    avgIterations,
    corrections: totalCorrections,
    totalCost,
    avgCycleTime,
  };
}

/**
 * Get checkpoints that contain correction indicators.
 *
 * Corrections are identified by:
 * - blockers list having entries
 * - agent notes containing "correction" keywords
 * - multiple sessions on same issue
 */
export function identifyCorrections(checkpoints: StoredCheckpoint[]): StoredCheckpoint[] {
  const correctionKeywords = [
    'wrong',
    'incorrect',
    'fix',
    'actually',
    'instead',
    'should have',
    'mistake',
    'error',
    'retry',
    'correction',
  ];

  return checkpoints.filter((cp) => {
    // Check blockers
    if (cp.context.blockers.length > 0) {
      return true;
    }

    // Check agent notes for correction keywords
    const notesText = cp.context.agentNotes.toLowerCase();
    return correctionKeywords.some((keyword) => notesText.includes(keyword));
  });
}

/**
 * Find patterns of repeated failures.
 */
export function identifyFailurePatterns(
  issueMetrics: IssueMetrics[]
): { pattern: string; count: number; issues: string[] }[] {
  const patterns = new Map<string, { count: number; issues: string[] }>();

  for (const metrics of issueMetrics) {
    if (!metrics.successful && metrics.failureReasons.length > 0) {
      for (const reason of metrics.failureReasons) {
        // Normalize error message to find patterns
        const normalized = normalizeErrorMessage(reason);

        if (!patterns.has(normalized)) {
          patterns.set(normalized, { count: 0, issues: [] });
        }

        const entry = patterns.get(normalized)!;
        entry.count++;
        entry.issues.push(metrics.issueId);
      }
    }
  }

  // Return patterns that occurred more than once
  return Array.from(patterns.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      issues: data.issues,
    }));
}

/**
 * Normalize error message for pattern matching.
 */
function normalizeErrorMessage(error: string): string {
  return (
    error
      .toLowerCase()
      // Remove file paths
      .replace(/\/[^\s]+/g, '<path>')
      // Remove line numbers
      .replace(/line \d+/g, 'line <n>')
      // Remove specific IDs
      .replace(/cs-[a-z0-9]+/g, '<issue>')
      // Remove timestamps
      .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/g, '<timestamp>')
      .trim()
  );
}
