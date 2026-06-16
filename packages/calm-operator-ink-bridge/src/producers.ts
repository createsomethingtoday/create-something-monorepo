export interface PostInkAlertOptions {
  url: string;
  token?: string;
  alert: Record<string, unknown>;
}

export interface PostHealthSnapshotOptions {
  url: string;
  token?: string;
  snapshot: Record<string, unknown>;
}

export interface PostOperatorEventOptions {
  url: string;
  token?: string;
  event: Record<string, unknown>;
}

export interface OperatorPrioritySourceLink {
  label: string;
  url?: string;
  kind?: 'linear' | 'notion' | 'codex' | 'health' | 'braintrust' | string;
  id?: string;
}

export interface PostOperatorPriorityOptions {
  url: string;
  token?: string;
  priority: Record<string, unknown>;
}

export interface OperatorPrioritySynthesisInput {
  linear?: {
    issues?: Array<{
      identifier?: string;
      title?: string;
      url?: string;
      state?: string;
      priority?: number;
    }>;
  };
  notion?: {
    tasks?: Array<{
      title?: string;
      url?: string;
      status?: string;
    }>;
  };
  codex?: {
    branch?: string;
    status?: string;
    dirty?: boolean;
    url?: string;
    summary?: string;
  };
  health?: {
    state?: string;
    summary?: string;
    detail?: string;
    action?: string;
    urgent?: boolean;
    url?: string;
    items?: Array<{
      component?: string;
      status?: string;
      summary?: string;
      detail?: string;
      severity?: number;
      stale?: boolean;
      poor?: boolean;
    }>;
  };
  braintrust?: {
    status?: string;
    eval?: string;
    eval_name?: string;
    experiment?: string;
    experiment_name?: string;
    name?: string;
    summary?: string;
    regression_summary?: string;
    failure_summary?: string;
    permalink?: string;
    url?: string;
    severity?: number;
    recommended_action?: string;
    action?: string;
    failures?: number;
    regressions?: number;
    total?: number;
  };
}

type OperatorPriorityHealthItem = NonNullable<NonNullable<OperatorPrioritySynthesisInput['health']>['items']>[number];
type OperatorPriorityIssue = NonNullable<NonNullable<OperatorPrioritySynthesisInput['linear']>['issues']>[number];
type OperatorPriorityBraintrust = NonNullable<OperatorPrioritySynthesisInput['braintrust']>;

async function postJson<T>(url: string, token: string | undefined, body: unknown): Promise<T> {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token?.trim()) {
    headers.set('authorization', `Bearer ${token.trim()}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export function bridgeUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, '')}${path}`;
}

export function mcpAttentionAlert(input: {
  mcp: string;
  reason: string;
  action?: string;
  agent?: string;
  registryId?: string;
  ttlMs?: number;
}): Record<string, unknown> {
  return {
    state: 'mcp_attention',
    category: 'mcp',
    subject: input.mcp,
    reason: input.reason,
    action: input.action ?? 'Review MCP contract',
    urgent: true,
    source: input.agent ?? 'mcp-review-agent',
    external_id: input.registryId ?? '',
    ttl_ms: input.ttlMs
  };
}

export function healthAttentionSnapshot(input: {
  source: string;
  component: string;
  status: string;
  summary: string;
  detail?: string;
  severity?: number;
}): Record<string, unknown> {
  return {
    source: input.source,
    component: input.component,
    status: input.status,
    summary: input.summary,
    detail: input.detail ?? '',
    severity: input.severity ?? 70
  };
}

export function operatorPriorityBrief(input: {
  focus: string;
  risk: string;
  nextAction: string;
  signal?: string;
  summary?: string;
  sourceLinks?: OperatorPrioritySourceLink[];
  sources?: unknown;
  severity?: number;
  urgent?: boolean;
  ttlMs?: number;
}): Record<string, unknown> {
  return {
    focus: input.focus,
    risk: input.risk,
    next_action: input.nextAction,
    signal: input.signal ?? signalFromSourceLinks(input.sourceLinks),
    summary: input.summary ?? '',
    source_links: input.sourceLinks ?? [],
    severity: input.severity ?? 92,
    urgent: input.urgent ?? false,
    ttl_ms: input.ttlMs,
    payload: {
      kind: 'operator_priority',
      signal: input.signal ?? signalFromSourceLinks(input.sourceLinks),
      sources: input.sources ?? {}
    }
  };
}

function signalFromSourceLinks(links: OperatorPrioritySourceLink[] | undefined): string {
  return firstNonEmpty(links?.[0]?.kind, 'operator');
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? '';
}

function sourceLinksFrom(input: OperatorPrioritySynthesisInput): OperatorPrioritySourceLink[] {
  const links: OperatorPrioritySourceLink[] = [];
  const issue = input.linear?.issues?.[0];
  if (issue?.identifier || issue?.title || issue?.url) {
    links.push({
      kind: 'linear',
      label: firstNonEmpty(issue.identifier, issue.title, 'Linear'),
      ...(issue.url ? { url: issue.url } : {})
    });
  }

  const task = input.notion?.tasks?.[0];
  if (task?.title || task?.url) {
    links.push({
      kind: 'notion',
      label: firstNonEmpty(task.title, 'Notion'),
      ...(task.url ? { url: task.url } : {})
    });
  }

  if (input.codex?.branch || input.codex?.url || input.codex?.summary) {
    links.push({
      kind: 'codex',
      label: firstNonEmpty(input.codex.branch, input.codex.summary, 'Codex'),
      ...(input.codex.url ? { url: input.codex.url } : {})
    });
  }

  if (input.health?.url || input.health?.state || input.health?.summary) {
    links.push({
      kind: 'health',
      label: firstNonEmpty(input.health.state, 'Ink health'),
      ...(input.health.url ? { url: input.health.url } : {})
    });
  }

  const braintrust = input.braintrust;
  if (braintrust && Object.keys(braintrust).length > 0) {
    links.push({
      kind: 'braintrust',
      label: braintrustLabel(braintrust),
      ...(firstNonEmpty(braintrust.permalink, braintrust.url) ? { url: firstNonEmpty(braintrust.permalink, braintrust.url) } : {})
    });
  }

  return links;
}

function bounded(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizedStatus(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function braintrustLabel(braintrust: OperatorPriorityBraintrust): string {
  return firstNonEmpty(
    braintrust.eval_name,
    braintrust.eval,
    braintrust.experiment_name,
    braintrust.experiment,
    braintrust.name,
    'Braintrust'
  );
}

function braintrustSummary(braintrust: OperatorPriorityBraintrust): string {
  return firstNonEmpty(
    braintrust.regression_summary,
    braintrust.failure_summary,
    braintrust.summary,
    braintrust.status,
    'Quality signal needs review'
  );
}

function braintrustSeverity(braintrust: OperatorPriorityBraintrust | undefined): number {
  if (!braintrust) return 0;
  if (typeof braintrust.severity === 'number' && Number.isFinite(braintrust.severity)) return bounded(braintrust.severity);

  const status = normalizedStatus(braintrust.status);
  const failures = countValue(braintrust.failures);
  const regressions = countValue(braintrust.regressions);
  if (status.includes('critical') || status.includes('block')) return 96;
  if (regressions > 0 || status.includes('regression')) return 90;
  if (failures > 0 || status.includes('fail') || status.includes('error')) return 86;
  if (status.includes('warn') || status.includes('drift')) return 74;
  return 40;
}

function hasBraintrustAttention(braintrust: OperatorPriorityBraintrust | undefined): braintrust is OperatorPriorityBraintrust {
  if (!braintrust) return false;
  const status = normalizedStatus(braintrust.status);
  return (
    braintrustSeverity(braintrust) >= 70 ||
    countValue(braintrust.failures) > 0 ||
    countValue(braintrust.regressions) > 0 ||
    ['critical', 'blocked', 'regression', 'failed', 'failure', 'error', 'warning', 'degraded', 'drift'].some((part) =>
      status.includes(part)
    )
  );
}

function isCriticalBraintrust(braintrust: OperatorPriorityBraintrust | undefined): boolean {
  if (!braintrust) return false;
  const status = normalizedStatus(braintrust.status);
  return braintrustSeverity(braintrust) >= 95 || status.includes('critical') || status.includes('block');
}

function urgentLinearIssue(input: OperatorPrioritySynthesisInput): OperatorPriorityIssue | undefined {
  return input.linear?.issues?.find((issue) => {
    const state = normalizedStatus(issue.state);
    return state.includes('blocked') || state.includes('urgent') || issue.priority === 1;
  });
}

function topHealthItem(input: OperatorPrioritySynthesisInput): OperatorPriorityHealthItem | undefined {
  return input.health?.items
    ?.filter((item) => item.poor || item.stale || (typeof item.severity === 'number' && item.severity >= 70))
    .sort((left, right) => {
      const leftSeverity = typeof left.severity === 'number' ? left.severity : 0;
      const rightSeverity = typeof right.severity === 'number' ? right.severity : 0;
      return rightSeverity - leftSeverity;
    })[0];
}

export function synthesizeOperatorPriority(input: OperatorPrioritySynthesisInput): Record<string, unknown> {
  const sourceLinks = sourceLinksFrom(input);
  const healthItem = topHealthItem(input);
  const blockedIssue = urgentLinearIssue(input);
  const braintrust = input.braintrust;
  const braintrustQualityIssue = hasBraintrustAttention(braintrust) ? braintrust : undefined;

  if (blockedIssue) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(blockedIssue.title, blockedIssue.identifier, 'Blocked Linear work'),
      risk: firstNonEmpty(blockedIssue.state, 'Blocked or urgent work needs operator attention'),
      nextAction: 'Unblock or reassign the Linear issue',
      signal: 'linear',
      sourceLinks,
      sources: input,
      severity: 94,
      urgent: true
    });
  }

  if (braintrustQualityIssue && isCriticalBraintrust(braintrustQualityIssue)) {
    return operatorPriorityBrief({
      focus: braintrustLabel(braintrustQualityIssue),
      risk: braintrustSummary(braintrustQualityIssue),
      nextAction: firstNonEmpty(braintrustQualityIssue.recommended_action, braintrustQualityIssue.action, 'Inspect the Braintrust regression'),
      signal: 'braintrust',
      summary: braintrustSummary(braintrustQualityIssue),
      sourceLinks,
      sources: input,
      severity: braintrustSeverity(braintrustQualityIssue),
      urgent: true
    });
  }

  if (input.health?.state === 'health_attention' || input.health?.urgent || healthItem) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(healthItem?.component, 'Resolve Ink health attention'),
      risk: firstNonEmpty(input.health?.summary, healthItem?.summary, healthItem?.detail, 'Health checks need attention'),
      nextAction: firstNonEmpty(input.health?.action, 'Review agent/MCP health source'),
      signal: 'health',
      summary: firstNonEmpty(input.health?.detail, healthItem?.detail),
      sourceLinks,
      sources: input,
      severity: input.health?.urgent ? 92 : 88,
      urgent: Boolean(input.health?.urgent)
    });
  }

  const issue = input.linear?.issues?.[0];
  if (issue) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(issue.title, issue.identifier, 'Linear priority'),
      risk: firstNonEmpty(issue.state, 'Open Linear work needs owner attention'),
      nextAction: 'Advance or close the Linear issue',
      signal: 'linear',
      sourceLinks,
      sources: input,
      severity: Math.max(82, braintrustQualityIssue ? Math.min(braintrustSeverity(braintrustQualityIssue), 88) : 0)
    });
  }

  const task = input.notion?.tasks?.[0];
  if (task) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(task.title, 'Notion task'),
      risk: firstNonEmpty(task.status, 'Notion task is still open'),
      nextAction: 'Update the Notion task or owner state',
      signal: 'notion',
      sourceLinks,
      sources: input,
      severity: Math.max(80, braintrustQualityIssue ? Math.min(braintrustSeverity(braintrustQualityIssue), 86) : 0)
    });
  }

  if (input.codex?.dirty || input.codex?.status || input.codex?.branch) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(input.codex.summary, input.codex.branch, 'Codex worktree'),
      risk: input.codex.dirty ? 'Local changes need validation or handoff' : firstNonEmpty(input.codex.status, 'Codex session needs review'),
      nextAction: 'Validate, summarize, and hand off current Codex state',
      signal: 'codex',
      sourceLinks,
      sources: input,
      severity: Math.max(78, braintrustQualityIssue ? Math.min(braintrustSeverity(braintrustQualityIssue), 84) : 0)
    });
  }

  if (braintrustQualityIssue) {
    return operatorPriorityBrief({
      focus: braintrustLabel(braintrustQualityIssue),
      risk: braintrustSummary(braintrustQualityIssue),
      nextAction: firstNonEmpty(braintrustQualityIssue.recommended_action, braintrustQualityIssue.action, 'Review Braintrust eval output'),
      signal: 'braintrust',
      summary: braintrustSummary(braintrustQualityIssue),
      sourceLinks,
      sources: input,
      severity: braintrustSeverity(braintrustQualityIssue),
      urgent: braintrustSeverity(braintrustQualityIssue) >= 90
    });
  }

  return operatorPriorityBrief({
    focus: 'Review operator priorities',
    risk: 'No source reported a sharper priority',
    nextAction: 'Check Linear, Notion, Codex, and health surfaces',
    signal: signalFromSourceLinks(sourceLinks),
    sourceLinks,
    sources: input,
    severity: 50
  });
}

export function postInkAlert<T = unknown>(options: PostInkAlertOptions): Promise<T> {
  return postJson<T>(options.url, options.token, options.alert);
}

export function postHealthSnapshot<T = unknown>(options: PostHealthSnapshotOptions): Promise<T> {
  return postJson<T>(options.url, options.token, options.snapshot);
}

export function postOperatorEvent<T = unknown>(options: PostOperatorEventOptions): Promise<T> {
  return postJson<T>(options.url, options.token, options.event);
}

export function postOperatorPriority<T = unknown>(options: PostOperatorPriorityOptions): Promise<T> {
  return postJson<T>(options.url, options.token, options.priority);
}
