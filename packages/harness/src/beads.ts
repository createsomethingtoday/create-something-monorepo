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
 * Read all issues from the Beads JSONL file.
 */
export async function readAllIssues(repoRoot?: string): Promise<BeadsIssue[]> {
  const filePath = join(repoRoot || process.cwd(), ISSUES_FILE);
  const content = await readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line) as BeadsIssue);
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

  if (options?.type) {
    args.push(`--type=${options.type}`);
  }
  if (options?.priority !== undefined) {
    args.push(`--priority=P${options.priority}`);
  }
  if (options?.labels?.length) {
    args.push(`--labels=${options.labels.join(',')}`);
  }

  const output = await bd(args.join(' '), cwd);

  // Parse the issue ID from output (e.g., "Created cs-abc123")
  const match = output.match(/Created\s+(\S+)/i) || output.match(/(cs-[a-z0-9]+)/i);
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
 */
export async function addDependency(
  fromId: string,
  toId: string,
  type: 'blocks' | 'parent' | 'related' = 'blocks',
  cwd?: string
): Promise<void> {
  await bd(`dep add ${fromId} ${type} ${toId}`, cwd);
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

  const issueId = await createIssue(
    `Harness: ${title}`,
    {
      type: 'harness',
      priority: 0, // Harness issues are high priority
      labels: ['harness'],
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
      type: 'checkpoint',
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
        // depIssueId blocks issueId
        await addDependency(depIssueId, issueId, 'blocks', cwd);
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
