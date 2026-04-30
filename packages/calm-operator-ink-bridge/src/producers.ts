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

export interface PostOperatorDecisionOptions {
  url: string;
  token?: string;
  decision: Record<string, unknown>;
}

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

export function operatorDecision(input: {
  source: string;
  subject: string;
  summary?: string;
  reason?: string;
  detail?: string;
  action?: string;
  urgency?: 'none' | 'note' | 'attention' | 'urgent' | 'blocked';
  decisionRequired?: boolean;
  canStepAway?: boolean;
  owner?: string;
  artifact?: string;
  confidence?: number;
  id?: string;
  ttlMs?: number;
  payload?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: input.id,
    source: input.source,
    subject: input.subject,
    summary: input.summary,
    reason: input.reason ?? input.summary,
    detail: input.detail ?? '',
    action: input.action ?? (input.decisionRequired ? 'Review agent decision' : 'No operator action'),
    urgency: input.urgency ?? (input.decisionRequired ? 'attention' : 'note'),
    decision_required: input.decisionRequired ?? false,
    can_step_away: input.canStepAway ?? !input.decisionRequired,
    owner: input.owner ?? '',
    artifact: input.artifact ?? '',
    confidence: input.confidence,
    ttl_ms: input.ttlMs,
    payload: input.payload ?? {}
  };
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

export function postOperatorDecision<T = unknown>(options: PostOperatorDecisionOptions): Promise<T> {
  return postJson<T>(options.url, options.token, options.decision);
}
