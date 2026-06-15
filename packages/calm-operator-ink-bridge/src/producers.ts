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
  kind?: 'linear' | 'notion' | 'codex' | 'health' | string;
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
}

type OperatorPriorityHealthItem = NonNullable<NonNullable<OperatorPrioritySynthesisInput['health']>['items']>[number];

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
    summary: input.summary ?? '',
    source_links: input.sourceLinks ?? [],
    severity: input.severity ?? 92,
    urgent: input.urgent ?? false,
    ttl_ms: input.ttlMs,
    payload: {
      kind: 'operator_priority',
      sources: input.sources ?? {}
    }
  };
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

  return links;
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

  if (input.health?.state === 'health_attention' || input.health?.urgent || healthItem) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(healthItem?.component, 'Resolve Ink health attention'),
      risk: firstNonEmpty(input.health?.summary, healthItem?.summary, healthItem?.detail, 'Health checks need attention'),
      nextAction: firstNonEmpty(input.health?.action, 'Review agent/MCP health source'),
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
      sourceLinks,
      sources: input,
      severity: 82
    });
  }

  const task = input.notion?.tasks?.[0];
  if (task) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(task.title, 'Notion task'),
      risk: firstNonEmpty(task.status, 'Notion task is still open'),
      nextAction: 'Update the Notion task or owner state',
      sourceLinks,
      sources: input,
      severity: 80
    });
  }

  if (input.codex?.dirty || input.codex?.status || input.codex?.branch) {
    return operatorPriorityBrief({
      focus: firstNonEmpty(input.codex.summary, input.codex.branch, 'Codex worktree'),
      risk: input.codex.dirty ? 'Local changes need validation or handoff' : firstNonEmpty(input.codex.status, 'Codex session needs review'),
      nextAction: 'Validate, summarize, and hand off current Codex state',
      sourceLinks,
      sources: input,
      severity: 78
    });
  }

  return operatorPriorityBrief({
    focus: 'Review operator priorities',
    risk: 'No source reported a sharper priority',
    nextAction: 'Check Linear, Notion, Codex, and health surfaces',
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
