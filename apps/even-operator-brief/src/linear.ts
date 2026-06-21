import { compactText } from './brief';

export type LinearIssueSummary = {
  identifier?: string;
  title?: string;
  url?: string;
  priority?: number;
  updatedAt?: string;
  state?: {
    name?: string;
    type?: string;
  };
  assignee?: string | null;
  project?: string | null;
};

export type LinearOpenQueue = {
  generated_at?: string;
  issues?: LinearIssueSummary[];
};

export type LinearClaimResult = {
  ok?: boolean;
  claimed_by?: string;
  issue?: LinearIssueSummary;
};

const LINE = 24;

export function normalizeLinearQueue(input: unknown): LinearOpenQueue {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { issues: [] };
  const record = input as Record<string, unknown>;
  const issues = Array.isArray(record.issues)
    ? record.issues
        .map((item): LinearIssueSummary | null => {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
          return normalizeIssue(item as Record<string, unknown>);
        })
        .filter((item): item is LinearIssueSummary => item !== null)
    : [];

  return {
    generated_at: stringValue(record.generated_at),
    issues
  };
}

export function normalizeClaimResult(input: unknown): LinearClaimResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const issue = typeof record.issue === 'object' && record.issue !== null && !Array.isArray(record.issue)
    ? normalizeIssue(record.issue as Record<string, unknown>)
    : undefined;

  return {
    ok: record.ok === true,
    claimed_by: stringValue(record.claimed_by),
    ...(issue ? { issue } : {})
  };
}

export function clampSelection(queue: LinearOpenQueue, selectedIndex: number): number {
  const count = queue.issues?.length ?? 0;
  if (count === 0) return 0;
  return Math.min(Math.max(selectedIndex, 0), count - 1);
}

export function moveSelection(queue: LinearOpenQueue, selectedIndex: number, delta: number): number {
  const count = queue.issues?.length ?? 0;
  if (count === 0) return 0;
  return (clampSelection(queue, selectedIndex) + delta + count) % count;
}

export function selectedIssue(queue: LinearOpenQueue, selectedIndex: number): LinearIssueSummary | null {
  return queue.issues?.[clampSelection(queue, selectedIndex)] ?? null;
}

export function formatLinearQueue(queue: LinearOpenQueue, selectedIndex = 0): string {
  const issues = queue.issues ?? [];
  if (issues.length === 0) {
    return joinLines(['LINEAR OPEN', '', 'No open CRE items.', '', footer(queue.generated_at, 'tap refresh')]);
  }

  const selected = clampSelection(queue, selectedIndex);
  return joinLines([
    `LINEAR OPEN ${selected + 1}/${issues.length}`,
    '',
    ...issues.slice(0, 5).map((issue, index) => formatIssueRow(issue, index === selected)),
    '',
    footer(queue.generated_at, 'tap detail')
  ]);
}

export function formatIssueDetail(queue: LinearOpenQueue, selectedIndex = 0): string {
  const issue = selectedIssue(queue, selectedIndex);
  if (!issue) return formatLinearQueue(queue, selectedIndex);

  return joinLines([
    compactText(issue.identifier || 'CRE-?', LINE),
    compactText(issue.title || 'Untitled Linear issue', LINE),
    '',
    `State ${compactText(issue.state?.name || 'Open', 17)}`,
    `Owner ${compactText(issue.assignee || 'Unassigned', 17)}`,
    issue.project ? `Proj  ${compactText(issue.project, 17)}` : '',
    '',
    'tap claim  swipe move'
  ]);
}

export function formatClaimPrompt(issue: LinearIssueSummary | null): string {
  if (!issue) return joinLines(['CLAIM', '', 'No selected issue.', '', 'tap refresh']);
  return joinLines([
    'CLAIM ISSUE?',
    '',
    compactText(issue.identifier || 'CRE-?', LINE),
    compactText(issue.title || 'Untitled Linear issue', LINE),
    '',
    'tap yes',
    'swipe cancels'
  ]);
}

export function formatClaimResult(result: LinearClaimResult): string {
  const issue = result.issue;
  if (!result.ok || !issue) {
    return joinLines(['CLAIM FAILED', '', 'Tap to refresh.', '', 'Double-tap exits.']);
  }

  return joinLines([
    'CLAIMED',
    '',
    compactText(issue.identifier || 'CRE-?', LINE),
    compactText(issue.title || 'Untitled Linear issue', LINE),
    '',
    compactText(result.claimed_by || issue.assignee || 'Assigned', LINE),
    'tap refresh'
  ]);
}

function formatIssueRow(issue: LinearIssueSummary, isSelected: boolean): string {
  const prefix = isSelected ? '>' : ' ';
  const id = compactText(issue.identifier || 'CRE-?', 7).padEnd(7, ' ');
  const title = compactText(issue.title || 'Untitled', 14);
  return compactText(`${prefix}${id} ${title}`, LINE);
}

function footer(generatedAt: string | undefined, hint: string): string {
  const age = ageLabel(generatedAt) || 'now';
  return compactText(`${age} | ${hint}`, LINE);
}

function ageLabel(generatedAt: string | undefined): string {
  if (!generatedAt) return '';
  const generated = Date.parse(generatedAt);
  if (!Number.isFinite(generated)) return '';
  const ageMinutes = Math.max(0, Math.round((Date.now() - generated) / 60_000));
  if (ageMinutes < 1) return 'now';
  if (ageMinutes < 90) return `${ageMinutes}m`;
  return `${Math.round(ageMinutes / 60)}h`;
}

function normalizeIssue(issue: Record<string, unknown>): LinearIssueSummary {
  const state = typeof issue.state === 'object' && issue.state !== null && !Array.isArray(issue.state)
    ? (issue.state as Record<string, unknown>)
    : {};
  return {
    identifier: stringValue(issue.identifier),
    title: stringValue(issue.title),
    url: stringValue(issue.url),
    priority: numberValue(issue.priority),
    updatedAt: stringValue(issue.updatedAt),
    state: {
      name: stringValue(state.name),
      type: stringValue(state.type)
    },
    assignee: stringValue(issue.assignee) ?? null,
    project: stringValue(issue.project) ?? null
  };
}

function joinLines(lines: string[]): string {
  return lines.filter((line, index, all) => {
    if (line !== '') return true;
    return all[index - 1] !== '' && all[index + 1] !== '';
  }).join('\n');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
