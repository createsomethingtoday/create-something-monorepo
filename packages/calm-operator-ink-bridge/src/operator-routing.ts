import type { LinearIssueSummary, LinearOpenQueue } from './linear-open.js';
import type { OperatorBrief } from './types.js';

export type OperatorRoutingAction = 'claim' | 'prep' | 'open';

export interface OperatorRoutingIssue extends LinearIssueSummary {
  route_score: number;
  reason_code: string;
  reason: string;
  primary_action: OperatorRoutingAction;
  action_label: string;
  available_actions: OperatorRoutingAction[];
}

export interface OperatorRoutingResponse {
  ok: true;
  team: string;
  generated_at: string;
  headline: string;
  primary_action: OperatorRoutingAction | 'none';
  risk: string;
  issue: OperatorRoutingIssue | null;
  confidence: number;
  reason_code: string;
  available_actions: OperatorRoutingAction[];
  issues: OperatorRoutingIssue[];
  source_brief?: {
    state: string;
    headline: string;
    line1: string;
    urgent: boolean;
  };
}

interface RankedIssue {
  issue: LinearIssueSummary;
  route_score: number;
  reason_code: string;
  reason: string;
}

export function buildOperatorRoutingResponse(input: {
  queue: LinearOpenQueue;
  brief?: OperatorBrief;
  now?: number;
}): OperatorRoutingResponse {
  const now = input.now ?? Date.now();
  const issues = (input.queue.issues ?? [])
    .map((issue) => rankedIssue(issue, now))
    .sort((left, right) => {
      const score = right.route_score - left.route_score;
      if (score !== 0) return score;
      return Date.parse(right.issue.updatedAt || '') - Date.parse(left.issue.updatedAt || '');
    })
    .map((ranked) => routedIssue(ranked));

  const selected = issues[0] ?? null;
  const brief = activeBrief(input.brief);
  const headline = brief
    ? compact(`${brief.headline}: ${brief.line1}`, 56)
    : selected
      ? compact(`NEXT: ${selected.identifier}`, 56)
      : 'NO OPEN ROUTES';
  const risk = brief
    ? compact(brief.line2 || brief.action || 'Operator attention is active.', 90)
    : selected
      ? selected.reason
      : 'No open Linear route was available for the G2 agent.';

  return {
    ok: true,
    team: input.queue.team,
    generated_at: input.queue.generated_at,
    headline,
    primary_action: selected?.primary_action ?? 'none',
    risk,
    issue: selected,
    confidence: selected ? confidenceFor(selected, Boolean(brief?.urgent)) : 0,
    reason_code: brief?.urgent ? 'active_operator_brief' : selected?.reason_code ?? 'empty_queue',
    available_actions: selected?.available_actions ?? [],
    issues,
    ...(brief
      ? {
          source_brief: {
            state: brief.state,
            headline: brief.headline,
            line1: brief.line1,
            urgent: brief.urgent
          }
        }
      : {})
  };
}

function activeBrief(brief: OperatorBrief | undefined): OperatorBrief | undefined {
  if (!brief || brief.state === 'clear') return undefined;
  return brief;
}

function routedIssue(ranked: RankedIssue): OperatorRoutingIssue {
  const primaryAction = primaryActionFor(ranked.issue, ranked.reason_code);
  return {
    ...ranked.issue,
    route_score: ranked.route_score,
    reason_code: ranked.reason_code,
    reason: ranked.reason,
    primary_action: primaryAction,
    action_label: actionLabel(primaryAction),
    available_actions: availableActionsFor(ranked.issue)
  };
}

function rankedIssue(issue: LinearIssueSummary, now: number): RankedIssue {
  const state = `${issue.state?.name ?? ''} ${issue.state?.type ?? ''}`.toLowerCase();
  const ageMs = issueAgeMs(issue, now);
  const parts = scoreParts(issue, state, ageMs);
  const top = parts.sort((left, right) => right.score - left.score)[0] ?? {
    code: 'open_linear_work',
    reason: 'Open Linear work is available.',
    score: 0
  };

  return {
    issue,
    route_score: Math.min(200, parts.reduce((sum, part) => sum + part.score, 20)),
    reason_code: top.code,
    reason: top.reason
  };
}

function scoreParts(
  issue: LinearIssueSummary,
  state: string,
  ageMs: number
): Array<{ code: string; reason: string; score: number }> {
  const parts: Array<{ code: string; reason: string; score: number }> = [];

  if (state.includes('blocked')) {
    parts.push({ code: 'blocked_linear_issue', reason: 'Blocked Linear work needs operator judgment.', score: 100 });
  } else if (issue.priority === 1) {
    parts.push({ code: 'urgent_linear_priority', reason: 'Priority 1 Linear work is open.', score: 80 });
  } else if (issue.priority === 2) {
    parts.push({ code: 'high_linear_priority', reason: 'High-priority Linear work is open.', score: 55 });
  } else if (issue.priority === 3) {
    parts.push({ code: 'normal_linear_priority', reason: 'Normal-priority Linear work is open.', score: 35 });
  }

  if (!issue.assignee) {
    parts.push({ code: 'unassigned_claimable', reason: 'The issue is unassigned and can be claimed from G2.', score: 30 });
  }

  if (state.includes('started')) {
    parts.push({ code: 'started_work_in_motion', reason: 'Started work likely needs continuation or handoff.', score: 25 });
  } else if (state.includes('unstarted')) {
    parts.push({ code: 'unstarted_ready_work', reason: 'Ready work has not been started yet.', score: 15 });
  }

  if (ageMs >= 7 * 24 * 60 * 60 * 1000) {
    parts.push({ code: 'stale_linear_issue', reason: 'The issue has not moved in at least a week.', score: 30 });
  } else if (ageMs >= 2 * 24 * 60 * 60 * 1000) {
    parts.push({ code: 'aging_linear_issue', reason: 'The issue has not moved recently.', score: 15 });
  }

  if (issue.project) {
    parts.push({ code: 'project_work', reason: `Project work: ${issue.project}.`, score: 5 });
  }

  if (parts.length === 0) {
    parts.push({ code: 'open_linear_work', reason: 'Open Linear work is available.', score: 5 });
  }

  return parts;
}

function issueAgeMs(issue: LinearIssueSummary, now: number): number {
  const updated = Date.parse(issue.updatedAt || '');
  if (!Number.isFinite(updated)) return 0;
  return Math.max(0, now - updated);
}

function primaryActionFor(issue: LinearIssueSummary, reasonCode: string): OperatorRoutingAction {
  if (!issue.assignee && reasonCode !== 'blocked_linear_issue') return 'claim';
  return 'prep';
}

function availableActionsFor(issue: LinearIssueSummary): OperatorRoutingAction[] {
  return issue.assignee ? ['prep', 'open'] : ['claim', 'prep', 'open'];
}

function actionLabel(action: OperatorRoutingAction): string {
  switch (action) {
    case 'claim':
      return 'Claim on Linear';
    case 'prep':
      return 'Prepare handoff';
    case 'open':
      return 'Open source';
  }
}

function confidenceFor(issue: OperatorRoutingIssue, urgentBrief: boolean): number {
  const base = Math.min(96, 52 + Math.round(issue.route_score / 4));
  return urgentBrief ? Math.min(96, base + 5) : base;
}

function compact(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
