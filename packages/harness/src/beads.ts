/**
 * @create-something/harness
 *
 * Beads Integration: Interface with the Beads issue tracking system.
 * Uses the `bd` CLI for operations.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  BeadsIssue,
  Feature,
  HarnessState,
  Checkpoint,
  DEFAULT_CHECKPOINT_POLICY,
  DiscoverySource,
} from './types.js';
import { getDiscoveryLabel } from './types.js';

const execAsync = promisify(exec);

// Path to the Beads issues file (relative to repo root)
const ISSUES_FILE = '.beads/issues.jsonl';

/**
 * Execute a bd command and return the result.
 */
async function bd(args: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`bd ${args}`, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
    });
    return stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    throw new Error(`bd command failed: ${err.stderr || err.message}`);
  }
}

/**
 * Execute a bv command and return the result.
 * bv is the Beads TUI viewer with robot mode for AI agents.
 */
async function bv(args: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`bv ${args}`, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
    });
    return stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    throw new Error(`bv command failed: ${err.stderr || err.message}`);
  }
}

/**
 * Read all issues from Beads.
 * Uses `bd list --json` for reliability (reads from SQLite database).
 */
export async function readAllIssues(repoRoot?: string): Promise<BeadsIssue[]> {
  try {
    // Try using bd CLI first (more reliable)
    const output = await bd('list --json --all', repoRoot);
    return JSON.parse(output) as BeadsIssue[];
  } catch {
    // Fallback to JSONL file
    try {
      const filePath = join(repoRoot || process.cwd(), ISSUES_FILE);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.map((line) => JSON.parse(line) as BeadsIssue);
    } catch {
      return [];
    }
  }
}

/**
 * Get open issues, optionally filtered by labels or type.
 */
export async function getOpenIssues(
  options?: { labels?: string[]; type?: string },
  repoRoot?: string
): Promise<BeadsIssue[]> {
  const issues = await readAllIssues(repoRoot);
  return issues.filter((issue) => {
    if (issue.status === 'closed') return false;
    if (options?.labels) {
      const hasAllLabels = options.labels.every((label) =>
        issue.labels?.includes(label)
      );
      if (!hasAllLabels) return false;
    }
    if (options?.type && issue.issue_type !== options.type) return false;
    return true;
  });
}

/**
 * Get a specific issue by ID.
 */
export async function getIssue(issueId: string, repoRoot?: string): Promise<BeadsIssue | null> {
  const issues = await readAllIssues(repoRoot);
  return issues.find((issue) => issue.id === issueId) || null;
}

/**
 * Create a new issue in Beads.
 */
export async function createIssue(
  title: string,
  options?: {
    type?: string;
    priority?: number;
    labels?: string[];
    description?: string;
    metadata?: Record<string, unknown>;
  },
  cwd?: string
): Promise<string> {
  // Escape shell special characters: double quotes, backticks, dollar signs
  const escapedTitle = title
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  const args: string[] = ['create', `"${escapedTitle}"`];

  // Use valid Beads types: bug|feature|task|epic|chore
  const validTypes = ['bug', 'feature', 'task', 'epic', 'chore'];
  const issueType = options?.type && validTypes.includes(options.type) ? options.type : 'task';
  args.push(`--type=${issueType}`);

  if (options?.priority !== undefined) {
    args.push(`--priority=P${options.priority}`);
  }
  if (options?.labels?.length) {
    args.push(`--labels=${options.labels.join(',')}`);
  }
  if (options?.description) {
    // Escape description for shell: quotes, backticks, dollar signs, newlines
    const desc = options.description
      .slice(0, 500)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
      .replace(/\n/g, ' ');
    args.push(`-d "${desc}"`);
  } else {
    // Add default description to avoid Beads warning
    args.push(`-d "Created by harness"`);
  }

  const output = await bd(args.join(' '), cwd);

  // Parse the issue ID from output (e.g., "Created issue: create-something-monorepo-abc")
  const match = output.match(/Created issue:\s+(\S+)/i) || output.match(/([a-z0-9]+-[a-z0-9]+)/i);
  if (!match) {
    throw new Error(`Could not parse issue ID from bd output: ${output}`);
  }

  return match[1];
}

/**
 * Update an issue's status.
 */
export async function updateIssueStatus(
  issueId: string,
  status: 'open' | 'in_progress' | 'closed',
  cwd?: string
): Promise<void> {
  if (status === 'closed') {
    await bd(`close ${issueId}`, cwd);
  } else {
    await bd(`update ${issueId} --status=${status}`, cwd);
  }
}

/**
 * Update an issue's priority.
 */
export async function updateIssuePriority(
  issueId: string,
  priority: number,
  cwd?: string
): Promise<void> {
  await bd(`update ${issueId} --priority=P${priority}`, cwd);
}

/**
 * Add a dependency between issues.
 * Usage: bd dep add [issue-id] [depends-on-id] --type=blocks
 */
export async function addDependency(
  issueId: string,
  dependsOnId: string,
  type: 'blocks' | 'parent-child' | 'related' | 'discovered-from' = 'blocks',
  cwd?: string
): Promise<void> {
  await bd(`dep add ${issueId} ${dependsOnId} --type=${type}`, cwd);
}

/**
 * Robot-priority recommendation from bv.
 */
interface RobotPriorityRecommendation {
  issue_id: string;
  title: string;
  current_priority: number;
  suggested_priority: number;
  impact_score: number;
  confidence: number;
  reasoning: string[];
  direction: 'increase' | 'decrease' | 'maintain';
}

interface RobotPriorityOutput {
  generated_at: string;
  recommendations: RobotPriorityRecommendation[];
}

/**
 * Get priority-sorted issues ready for work.
 * Uses bv -robot-priority for PageRank + Critical Path ranking.
 * Falls back to bd ready --json if bv unavailable.
 */
export async function getReadyIssues(cwd?: string): Promise<BeadsIssue[]> {
  // First get the list of ready issues
  let readyIssues: BeadsIssue[];
  try {
    const output = await bd('ready --json', cwd);
    readyIssues = JSON.parse(output) as BeadsIssue[];
  } catch {
    // Fallback: manual filtering
    const issues = await readAllIssues(cwd);
    readyIssues = issues
      .filter((issue) => issue.status === 'open')
      .sort((a, b) => (a.priority || 2) - (b.priority || 2));
    return readyIssues;
  }

  // Try to enhance with robot-priority impact scores
  try {
    const priorityOutput = await bv('-robot-priority', cwd);
    const robotData = JSON.parse(priorityOutput) as RobotPriorityOutput;

    // Create a map of issue_id -> impact_score
    const impactScores = new Map<string, number>();
    for (const rec of robotData.recommendations) {
      impactScores.set(rec.issue_id, rec.impact_score);
    }

    // Sort ready issues by: impact_score (desc), then priority (asc)
    readyIssues.sort((a, b) => {
      const aImpact = impactScores.get(a.id) ?? 0;
      const bImpact = impactScores.get(b.id) ?? 0;

      // Higher impact first
      if (bImpact !== aImpact) {
        return bImpact - aImpact;
      }

      // Then by priority (lower = more urgent)
      return (a.priority || 2) - (b.priority || 2);
    });

    return readyIssues;
  } catch {
    // bv not available or failed - return issues sorted by priority only
    return readyIssues;
  }
}

/**
 * Create a harness state issue.
 */
export async function createHarnessIssue(
  title: string,
  specFile: string,
  featuresTotal: number,
  checkpointPolicy: typeof DEFAULT_CHECKPOINT_POLICY,
  cwd?: string
): Promise<string> {
  const metadata = {
    spec_file: specFile,
    started_at: new Date().toISOString(),
    current_session: 0,
    sessions_completed: 0,
    features_total: featuresTotal,
    features_completed: 0,
    features_failed: 0,
    last_checkpoint: null,
    checkpoint_policy: checkpointPolicy,
    paused: false,
    pause_reason: null,
  };

  const description = `Harness run for: ${specFile}\nFeatures: ${featuresTotal}\nStarted: ${new Date().toISOString()}`;

  const issueId = await createIssue(
    `Harness: ${title}`,
    {
      type: 'epic', // Use epic for harness parent issues
      priority: 0, // Harness issues are high priority
      labels: ['harness'],
      description,
    },
    cwd
  );

  // Note: Beads may not support metadata directly via CLI
  // For now, we track metadata separately or enhance later

  return issueId;
}

/**
 * Create a checkpoint issue.
 */
export async function createCheckpointIssue(
  checkpoint: Omit<Checkpoint, 'id'>,
  cwd?: string
): Promise<string> {
  const description = formatCheckpointDescription(checkpoint);

  const issueId = await createIssue(
    `Checkpoint #${checkpoint.sessionNumber}: ${checkpoint.summary.slice(0, 50)}`,
    {
      type: 'task', // Use task for checkpoint issues
      priority: 2,
      labels: ['checkpoint', `harness:${checkpoint.harnessId}`],
      description,
    },
    cwd
  );

  return issueId;
}

/**
 * Format checkpoint data as a markdown description.
 */
function formatCheckpointDescription(checkpoint: Omit<Checkpoint, 'id'>): string {
  const lines: string[] = [];

  lines.push(`## Summary`);
  lines.push(checkpoint.summary);
  lines.push('');

  if (checkpoint.issuesCompleted.length > 0) {
    lines.push(`## Completed`);
    for (const id of checkpoint.issuesCompleted) {
      lines.push(`- ${id}`);
    }
    lines.push('');
  }

  if (checkpoint.issuesInProgress.length > 0) {
    lines.push(`## In Progress`);
    for (const id of checkpoint.issuesInProgress) {
      lines.push(`- ${id}`);
    }
    lines.push('');
  }

  if (checkpoint.issuesFailed.length > 0) {
    lines.push(`## Failed`);
    for (const id of checkpoint.issuesFailed) {
      lines.push(`- ${id}`);
    }
    lines.push('');
  }

  lines.push(`## Confidence: ${checkpoint.confidence.toFixed(2)}`);
  lines.push('');

  if (checkpoint.redirectNotes) {
    lines.push(`## Redirect Notes`);
    lines.push(checkpoint.redirectNotes);
    lines.push('');
  }

  lines.push(`## Metadata`);
  lines.push(`- Session: ${checkpoint.sessionNumber}`);
  lines.push(`- Git Commit: ${checkpoint.gitCommit}`);
  lines.push(`- Timestamp: ${checkpoint.timestamp}`);
  if (checkpoint.totalCost !== undefined && checkpoint.totalCost > 0) {
    lines.push(`- Total Cost: $${checkpoint.totalCost.toFixed(4)}`);
  }
  if (checkpoint.avgCostPerSession !== undefined && checkpoint.avgCostPerSession > 0) {
    lines.push(`- Avg Cost/Session: $${checkpoint.avgCostPerSession.toFixed(4)}`);
  }

  return lines.join('\n');
}

/**
 * Parse checkpoint metadata from a checkpoint issue description.
 */
export function parseCheckpointMetadata(description: string): {
  totalCost?: number;
  avgCostPerSession?: number;
} {
  const metadata: { totalCost?: number; avgCostPerSession?: number } = {};

  // Parse Total Cost
  const totalCostMatch = description.match(/- Total Cost: \$([0-9.]+)/);
  if (totalCostMatch) {
    metadata.totalCost = parseFloat(totalCostMatch[1]);
  }

  // Parse Avg Cost/Session
  const avgCostMatch = description.match(/- Avg Cost\/Session: \$([0-9.]+)/);
  if (avgCostMatch) {
    metadata.avgCostPerSession = parseFloat(avgCostMatch[1]);
  }

  return metadata;
}

/**
 * Create issues from parsed features.
 */
export async function createIssuesFromFeatures(
  features: Feature[],
  harnessId: string,
  cwd?: string
): Promise<Map<string, string>> {
  // Map from feature ID to Beads issue ID
  const featureToIssue = new Map<string, string>();

  // Create issues in order (respecting dependencies)
  for (const feature of features) {
    // Build labels including complexity if specified
    const labels = [...feature.labels, `harness:${harnessId}`];
    if (feature.complexity) {
      labels.push(`complexity:${feature.complexity}`);
    }

    const issueId = await createIssue(
      feature.title,
      {
        type: 'feature',
        priority: feature.priority,
        labels,
        description: formatFeatureDescription(feature),
      },
      cwd
    );

    featureToIssue.set(feature.id, issueId);
  }

  // Add dependencies
  for (const feature of features) {
    const issueId = featureToIssue.get(feature.id);
    if (!issueId) continue;

    for (const depFeatureId of feature.dependsOn) {
      const depIssueId = featureToIssue.get(depFeatureId);
      if (depIssueId) {
        // issueId depends on depIssueId (depIssueId blocks issueId)
        // bd dep add syntax: bd dep add [issue] [depends-on] --type=blocks
        await addDependency(issueId, depIssueId, 'blocks', cwd);
      }
    }
  }

  return featureToIssue;
}

/**
 * Format a feature as a markdown description.
 */
function formatFeatureDescription(feature: Feature): string {
  const lines: string[] = [];

  if (feature.description) {
    lines.push(feature.description);
    lines.push('');
  }

  if (feature.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    for (const criterion of feature.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get issues that have changed since a given timestamp.
 * Used for redirect detection.
 */
export async function getIssuesChangedSince(
  since: string,
  repoRoot?: string
): Promise<BeadsIssue[]> {
  const issues = await readAllIssues(repoRoot);
  const sinceDate = new Date(since);

  return issues.filter((issue) => {
    const updatedAt = new Date(issue.updated_at);
    return updatedAt > sinceDate;
  });
}

/**
 * Check if the harness should pause (human requested pause).
 */
export async function checkForPauseRequest(
  harnessId: string,
  repoRoot?: string
): Promise<{ paused: boolean; reason: string | null }> {
  // Look for issues with pause-related labels or a specific pause file
  // For now, we check if there's a P0 issue with label "pause"
  const issues = await getOpenIssues({ labels: ['pause'] }, repoRoot);
  const pauseIssue = issues.find((issue) =>
    issue.labels?.includes(`harness:${harnessId}`)
  );

  if (pauseIssue) {
    return { paused: true, reason: pauseIssue.title };
  }

  return { paused: false, reason: null };
}

/**
 * Get harness issue by ID or find the most recent running harness.
 */
export async function getHarnessIssue(
  harnessId?: string,
  repoRoot?: string
): Promise<BeadsIssue | null> {
  const issues = await readAllIssues(repoRoot);

  if (harnessId) {
    return issues.find((issue) => issue.id === harnessId) || null;
  }

  // Find the most recent harness issue that's not closed
  const harnessIssues = issues
    .filter(
      (issue) =>
        issue.labels?.includes('harness') &&
        issue.issue_type === 'epic' &&
        issue.status !== 'closed'
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return harnessIssues[0] || null;
}

/**
 * Get checkpoint issues for a harness, sorted by session number (descending).
 */
export async function getHarnessCheckpoints(
  harnessId: string,
  repoRoot?: string
): Promise<BeadsIssue[]> {
  const issues = await readAllIssues(repoRoot);

  return issues
    .filter(
      (issue) =>
        issue.labels?.includes('checkpoint') &&
        issue.labels?.includes(`harness:${harnessId}`)
    )
    .sort((a, b) => {
      // Extract session number from title "Checkpoint #N: ..."
      const aMatch = a.title.match(/Checkpoint #(\d+)/);
      const bMatch = b.title.match(/Checkpoint #(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
      return bNum - aNum; // Descending
    });
}

/**
 * Get completed feature issues for a harness.
 */
export async function getCompletedFeatures(
  harnessId: string,
  repoRoot?: string
): Promise<BeadsIssue[]> {
  const issues = await readAllIssues(repoRoot);

  return issues.filter(
    (issue) =>
      issue.labels?.includes(`harness:${harnessId}`) &&
      !issue.labels?.includes('checkpoint') &&
      issue.issue_type !== 'epic' &&
      issue.status === 'closed'
  );
}

/**
 * Get in-progress and open feature issues for a harness.
 * Excludes checkpoint and review issues which are created by the harness itself.
 */
export async function getPendingFeatures(
  harnessId: string,
  repoRoot?: string
): Promise<BeadsIssue[]> {
  const issues = await readAllIssues(repoRoot);

  return issues.filter(
    (issue) =>
      issue.labels?.includes(`harness:${harnessId}`) &&
      !issue.labels?.includes('checkpoint') &&
      !issue.labels?.includes('review') &&
      issue.issue_type !== 'epic' &&
      issue.status !== 'closed'
  );
}

/**
 * Parse harness state from a harness issue's description.
 * Extracts metadata like spec file, feature counts, etc.
 */
export function parseHarnessDescription(description: string): {
  specFile: string | null;
  featuresTotal: number;
  startedAt: string | null;
} {
  const specMatch = description.match(/Harness run for:\s*(.+)/);
  const featuresMatch = description.match(/Features:\s*(\d+)/);
  const startedMatch = description.match(/Started:\s*(.+)/);

  return {
    specFile: specMatch ? specMatch[1].trim() : null,
    featuresTotal: featuresMatch ? parseInt(featuresMatch[1], 10) : 0,
    startedAt: startedMatch ? startedMatch[1].trim() : null,
  };
}

/**
 * Update harness issue status.
 */
export async function updateHarnessStatus(
  harnessId: string,
  status: 'running' | 'paused' | 'completed',
  cwd?: string
): Promise<void> {
  if (status === 'completed') {
    await bd(`close ${harnessId}`, cwd);
  } else {
    await bd(`update ${harnessId} --status=${status === 'running' ? 'in_progress' : 'open'}`, cwd);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Failure Annotation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a failure annotation to an issue.
 * Records the failure reason and attempt history for future reference.
 */
export async function annotateIssueFailure(
  issueId: string,
  annotation: string,
  cwd?: string
): Promise<void> {
  try {
    // Add a label to indicate the issue has failures
    await bd(`label add ${issueId} failed-attempt`, cwd);

    // Update the issue description with failure details
    // Note: bd may not support description updates, so we'll use a comment-like approach
    // by creating a linked issue with the failure details

    // For now, just log the annotation - full implementation would require
    // Beads CLI support for description updates or comments
    console.log(`  [Failure Annotation] ${issueId}:`);
    console.log(`    ${annotation.split('\n')[0]}`);
  } catch (error) {
    // Don't fail the harness if annotation fails
    console.log(`  [Warning] Could not annotate failure for ${issueId}`);
  }
}

/**
 * Add an escalation learning annotation to an issue.
 * Records when a task required model escalation for future pattern refinement.
 *
 * Philosophy: Self-healing creates learning. When cheaper models fail and
 * opus succeeds, we record the patterns so selectModelForTask can improve.
 */
export async function annotateIssueEscalation(
  issueId: string,
  annotation: string,
  cwd?: string
): Promise<void> {
  try {
    // Add a label to indicate model escalation occurred
    await bd(`label add ${issueId} model-escalated`, cwd);

    // Log the learning annotation
    console.log(`  [Escalation Learning] ${issueId}:`);
    const firstLine = annotation.split('\n').find(l => l.trim()) || '';
    console.log(`    ${firstLine}`);
  } catch (error) {
    // Don't fail the harness if annotation fails
    console.log(`  [Warning] Could not annotate escalation for ${issueId}`);
  }
}

/**
 * Mark an issue as skipped due to repeated failures.
 */
export async function markIssueSkipped(
  issueId: string,
  reason: string,
  cwd?: string
): Promise<void> {
  try {
    // Add skipped label
    await bd(`label add ${issueId} skipped`, cwd);

    // Keep the issue open but note it was skipped
    // The status remains as is (likely in_progress)
    console.log(`  [Skipped] ${issueId}: ${reason}`);
  } catch (error) {
    console.log(`  [Warning] Could not mark ${issueId} as skipped`);
  }
}

/**
 * Reset an issue's failure state for retry.
 * Removes failure labels and prepares for a fresh attempt.
 */
export async function resetIssueForRetry(
  issueId: string,
  cwd?: string
): Promise<void> {
  try {
    // Remove failure labels if present
    await bd(`label remove ${issueId} failed-attempt`, cwd).catch(() => {});
    await bd(`label remove ${issueId} skipped`, cwd).catch(() => {});

    // Ensure status is in_progress
    await updateIssueStatus(issueId, 'in_progress', cwd);
  } catch (error) {
    // Don't fail if label removal fails
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Work Extraction (Upstream from VC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Beads issue from a review finding.
 *
 * Philosophy: Work extraction closes the hermeneutic loop.
 * Review findings → discovered issues → future work.
 * Pattern from Steve Yegge's VC project.
 *
 * The discovery source taxonomy (upstream from VC) categorizes *how* work was found:
 * - blocker: Blocks current work, must address immediately
 * - related: Related work discovered, can be scheduled separately
 * - supervisor: AI supervisor (checkpoint review) identified concern
 * - self-heal: Self-healing baseline discovered issue
 * - manual: Manually created during session
 *
 * @param finding - The review finding to convert to an issue
 * @param checkpointId - The originating checkpoint for 'discovered-from' dependency
 * @param options - Additional options including discovery source
 * @param cwd - Working directory for Beads commands
 * @returns The created issue ID
 */
export async function createIssueFromFinding(
  finding: {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    title: string;
    description: string;
    file?: string;
    line?: number;
    suggestion?: string;
  },
  checkpointId: string,
  options: {
    /** How this work was discovered (default: 'supervisor' for review findings) */
    discoverySource?: DiscoverySource;
    /** Additional labels to apply */
    extraLabels?: string[];
  } = {},
  cwd?: string
): Promise<string> {
  const { discoverySource = 'supervisor', extraLabels = [] } = options;

  // Map severity to priority
  const priorityMap: Record<string, number> = {
    critical: 0, // P0
    high: 1,     // P1
    medium: 2,   // P2
    low: 3,      // P3
    info: 4,     // P4
  };
  const priority = priorityMap[finding.severity] ?? 2;

  // Blocker findings get priority boost
  const adjustedPriority = discoverySource === 'blocker'
    ? Math.max(0, priority - 1)  // Boost priority for blockers
    : priority;

  // Build description with finding details
  const descriptionParts: string[] = [finding.description];
  if (finding.file) {
    descriptionParts.push(`\nFile: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
  }
  if (finding.suggestion) {
    descriptionParts.push(`\nSuggestion: ${finding.suggestion}`);
  }
  descriptionParts.push(`\nDiscovered from checkpoint: ${checkpointId}`);
  descriptionParts.push(`\nDiscovery source: ${discoverySource}`);

  // Build labels: discovery source label + category + any extra labels
  const discoveryLabel = getDiscoveryLabel(discoverySource);
  const labels = [discoveryLabel, finding.category, ...extraLabels];

  const issueId = await createIssue(
    finding.title,
    {
      type: 'task',
      priority: adjustedPriority,
      labels,
      description: descriptionParts.join(''),
    },
    cwd
  );

  // Link to originating checkpoint with discovered-from dependency
  await addDependency(issueId, checkpointId, 'discovered-from', cwd);

  console.log(`  [Work Extraction] Created ${issueId} (${discoveryLabel}) from finding: ${finding.title}`);

  return issueId;
}

/**
 * Extract actionable issues from review findings.
 * Filters for findings that warrant follow-up work and categorizes them
 * using the discovery source taxonomy.
 *
 * Discovery source assignment logic:
 * - 'blocker': Critical findings that block advancement
 * - 'supervisor': Standard review findings (security, architecture, quality)
 * - 'related': Lower severity findings that can be addressed later
 *
 * @param findings - Array of review findings
 * @param checkpointId - The originating checkpoint
 * @param options - Extraction options including default discovery source
 * @param cwd - Working directory
 * @returns Array of created issue IDs
 */
export async function extractWorkFromFindings(
  findings: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    title: string;
    description: string;
    file?: string;
    line?: number;
    suggestion?: string;
    issueId?: string; // Skip if already linked to an issue
  }>,
  checkpointId: string,
  options: {
    minSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    categories?: string[]; // Only extract from these categories
    maxIssues?: number; // Cap on created issues per checkpoint
    /** Default discovery source (default: 'supervisor') */
    defaultDiscoverySource?: DiscoverySource;
    /** Treat critical findings as blockers (default: true) */
    criticalAsBlocker?: boolean;
    /** Treat low/info as related work (default: true) */
    lowAsRelated?: boolean;
  } = {},
  cwd?: string
): Promise<string[]> {
  const {
    minSeverity = 'high',
    categories,
    maxIssues = 5,
    defaultDiscoverySource = 'supervisor',
    criticalAsBlocker = true,
    lowAsRelated = true,
  } = options;

  // Severity ranking for filtering
  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  const minRank = severityRank[minSeverity];

  // Filter findings
  const actionableFindings = findings.filter((finding) => {
    // Skip if already has an issue
    if (finding.issueId) return false;

    // Check severity threshold
    if (severityRank[finding.severity] > minRank) return false;

    // Check category filter
    if (categories && !categories.includes(finding.category)) return false;

    return true;
  });

  // Sort by severity (most severe first) and limit
  actionableFindings.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );
  const toCreate = actionableFindings.slice(0, maxIssues);

  if (toCreate.length === 0) {
    return [];
  }

  console.log(`  [Work Extraction] Creating ${toCreate.length} issues from checkpoint ${checkpointId}`);

  // Create issues with appropriate discovery source
  const createdIds: string[] = [];
  for (const finding of toCreate) {
    try {
      // Determine discovery source based on severity
      let discoverySource: DiscoverySource = defaultDiscoverySource;

      if (criticalAsBlocker && finding.severity === 'critical') {
        discoverySource = 'blocker';
      } else if (lowAsRelated && (finding.severity === 'low' || finding.severity === 'info')) {
        discoverySource = 'related';
      }

      const issueId = await createIssueFromFinding(
        finding,
        checkpointId,
        { discoverySource },
        cwd
      );
      createdIds.push(issueId);
    } catch (error) {
      console.log(`  [Work Extraction] Failed to create issue for: ${finding.title}`);
    }
  }

  return createdIds;
}

/**
 * Create a blocker issue that must be resolved before continuing work.
 * Convenience function for the 'blocker' discovery source.
 */
export async function createBlockerIssue(
  title: string,
  description: string,
  options: {
    severity?: 'critical' | 'high' | 'medium';
    category?: string;
    file?: string;
    line?: number;
    checkpointId: string;
    extraLabels?: string[];
  },
  cwd?: string
): Promise<string> {
  const finding = {
    id: `blocker-${Date.now()}`,
    severity: options.severity || 'high' as const,
    category: options.category || 'blocker',
    title,
    description,
    file: options.file,
    line: options.line,
  };

  return createIssueFromFinding(
    finding,
    options.checkpointId,
    {
      discoverySource: 'blocker',
      extraLabels: options.extraLabels,
    },
    cwd
  );
}

/**
 * Create a self-heal issue for baseline fix.
 * Used when preflight checks detect broken baseline.
 */
export async function createSelfHealIssue(
  title: string,
  description: string,
  options: {
    severity?: 'critical' | 'high' | 'medium';
    category?: string;
    checkpointId: string;
    extraLabels?: string[];
  },
  cwd?: string
): Promise<string> {
  const finding = {
    id: `self-heal-${Date.now()}`,
    severity: options.severity || 'high' as const,
    category: options.category || 'self-heal',
    title,
    description,
  };

  return createIssueFromFinding(
    finding,
    options.checkpointId,
    {
      discoverySource: 'self-heal',
      extraLabels: options.extraLabels,
    },
    cwd
  );
}
