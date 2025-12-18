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
} from './types.js';

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
  },
  cwd?: string
): Promise<string> {
  const args: string[] = ['create', `"${title.replace(/"/g, '\\"')}"`];

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
    // Escape description for shell and truncate if needed
    const desc = options.description.slice(0, 500).replace(/"/g, '\\"').replace(/\n/g, ' ');
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
 * Get priority-sorted issues ready for work.
 * Uses bv --robot-priority for optimized output.
 */
export async function getReadyIssues(cwd?: string): Promise<BeadsIssue[]> {
  try {
    const output = await bd('ready --json', cwd);
    return JSON.parse(output) as BeadsIssue[];
  } catch {
    // Fallback: manual filtering
    const issues = await readAllIssues(cwd);
    return issues
      .filter((issue) => issue.status === 'open')
      .sort((a, b) => (a.priority || 2) - (b.priority || 2));
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

  return lines.join('\n');
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
    const issueId = await createIssue(
      feature.title,
      {
        type: 'feature',
        priority: feature.priority,
        labels: [...feature.labels, `harness:${harnessId}`],
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
