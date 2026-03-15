import { execCommand, findMonorepoRoot } from '../utils.js';
import type { BeadsIssue } from '../types.js';

export function getIssue(issueId: string): BeadsIssue {
  const root = findMonorepoRoot();
  // Use bd list --json with --limit 0 to get all issues
  const result = execCommand(`bd list --json --limit 0`, root);

  if (!result.success) {
    throw new Error(`Failed to list issues: ${result.output}`);
  }

  try {
    const issues = JSON.parse(result.output);
    const issue = issues.find((i: BeadsIssue) => i.id === issueId);

    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    return issue;
  } catch (error: any) {
    if (error.message?.includes('Issue not found')) {
      throw error;
    }
    throw new Error(`Failed to parse Beads issues: ${result.output}`);
  }
}

export function listIssues(filter?: {
  status?: string;
  labels?: string[];
  priority?: string;
}): BeadsIssue[] {
  const root = findMonorepoRoot();

  let command = 'bd list --json';

  if (filter?.status) {
    command += ` --status ${filter.status}`;
  }

  if (filter?.labels?.length) {
    command += ` --label ${filter.labels.join(',')}`;
  }

  if (filter?.priority) {
    command += ` --priority ${filter.priority}`;
  }

  const result = execCommand(command, root);

  if (!result.success) {
    throw new Error(`Failed to list issues: ${result.output}`);
  }

  try {
    return JSON.parse(result.output);
  } catch (error) {
    return [];
  }
}

export function updateIssue(
  issueId: string,
  updates: {
    status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
    labels?: { add?: string[]; remove?: string[] };
    notes?: string;
  }
): void {
  const root = findMonorepoRoot();

  if (updates.status) {
    const result = execCommand(`bd update ${issueId} --status ${updates.status}`, root);
    if (!result.success) {
      throw new Error(`Failed to update issue status: ${result.output}`);
    }
  }

  if (updates.labels?.add) {
    for (const label of updates.labels.add) {
      execCommand(`bd label add ${issueId} ${label}`, root);
    }
  }

  if (updates.labels?.remove) {
    for (const label of updates.labels.remove) {
      execCommand(`bd label remove ${issueId} ${label}`, root);
    }
  }

  if (updates.notes) {
    execCommand(`bd update ${issueId} --notes "${updates.notes}"`, root);
  }
}

export function closeIssue(issueId: string): void {
  const root = findMonorepoRoot();
  const result = execCommand(`bd close ${issueId}`, root);

  if (!result.success) {
    throw new Error(`Failed to close issue: ${result.output}`);
  }
}

export function getPriority(): BeadsIssue[] {
  const root = findMonorepoRoot();
  const result = execCommand('bv --robot-priority', root);

  if (!result.success) {
    throw new Error(`Failed to get priority: ${result.output}`);
  }

  try {
    return JSON.parse(result.output);
  } catch (error) {
    return [];
  }
}
