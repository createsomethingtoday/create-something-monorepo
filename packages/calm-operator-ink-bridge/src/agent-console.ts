export type AgentProvider = 'codex' | 'claude' | string;
export type AgentRunStatus = 'working' | 'waiting' | 'blocked' | 'completed' | 'failed' | 'stopped';
export type AgentDecisionKind =
  | 'status'
  | 'continue'
  | 'pause'
  | 'stop'
  | 'approve'
  | 'reject'
  | 'retry'
  | 'redirect';
export type AgentDecisionState =
  | 'queued'
  | 'leased'
  | 'acknowledged'
  | 'completed'
  | 'failed'
  | 'expired';

export interface AgentDecisionOptionInput {
  id?: string;
  kind?: AgentDecisionKind | string;
  label?: string;
  description?: string;
  requires_confirmation?: boolean;
  requires_text?: boolean;
  remote_safe?: boolean;
  expires_at?: number | string | null;
}

export interface AgentDecisionOption {
  id: string;
  kind: AgentDecisionKind;
  label: string;
  description: string;
  requires_confirmation: boolean;
  requires_text: boolean;
  remote_safe: boolean;
  expires_at: number | null;
}

export interface AgentProgressInput {
  agent_id?: string;
  provider?: AgentProvider;
  label?: string;
  status?: AgentRunStatus | string;
  phase?: string;
  summary?: string;
  detail?: string;
  progress_version?: number;
  needs_input?: boolean;
  decisions?: AgentDecisionOptionInput[];
  expires_at?: number | string;
  payload?: Record<string, unknown>;
}

export interface StoredAgentProgress {
  agent_id: string;
  provider: AgentProvider;
  label: string;
  status: AgentRunStatus;
  phase: string;
  summary: string;
  detail: string;
  progress_version: number;
  needs_input: boolean;
  decisions: AgentDecisionOption[];
  updated_at: number;
  expires_at: number;
  payload: Record<string, unknown>;
}

export interface AgentConsole {
  ok: true;
  generated_at: string;
  count: number;
  needs_input_count: number;
  agents: Array<
    Omit<StoredAgentProgress, 'payload' | 'decisions'> & {
      decisions: AgentDecisionOption[];
      operator_context: {
        workspace_label: string;
        control_reason: string;
        authority: string;
      };
    }
  >;
  recent_decisions: AgentDecisionReceipt[];
}

export interface AgentDecisionReceipt {
  id: string;
  agent_id: string;
  provider: AgentProvider;
  progress_version: number;
  decision_id: string;
  kind: AgentDecisionKind;
  label: string;
  state: AgentDecisionState;
  updated_at: number;
  result_summary: string;
  error: string;
}

export interface AgentDecisionInput {
  agent_id?: string;
  progress_version?: number;
  decision_id?: string;
  message?: string;
  confirmed?: boolean;
  idempotency_key?: string;
  device_id?: string;
  payload?: Record<string, unknown>;
}

export interface StoredAgentDecision {
  id: string;
  idempotency_key: string;
  agent_id: string;
  provider: AgentProvider;
  progress_version: number;
  decision_id: string;
  kind: AgentDecisionKind;
  label: string;
  message: string;
  device_id: string;
  state: AgentDecisionState;
  created_at: number;
  updated_at: number;
  lease_owner: string;
  lease_expires_at: number | null;
  attempts: number;
  result_summary: string;
  error: string;
  payload: Record<string, unknown>;
}

export interface AgentDecisionLeaseInput {
  relay_id?: string;
  providers?: string[];
  limit?: number;
  lease_ms?: number;
}

export interface AgentDecisionReceiptInput {
  relay_id?: string;
  state?: 'acknowledged' | 'completed' | 'failed';
  summary?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

export type AgentConsoleError = { ok: false; status: number; error: string };

const ALLOWED_STATUSES = new Set<AgentRunStatus>([
  'working',
  'waiting',
  'blocked',
  'completed',
  'failed',
  'stopped'
]);
const ALLOWED_DECISIONS = new Set<AgentDecisionKind>([
  'status',
  'continue',
  'pause',
  'stop',
  'approve',
  'reject',
  'retry',
  'redirect'
]);
const DEFAULT_PROGRESS_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 280;

function boundedText(value: unknown, maximum = MAX_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function epoch(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeDecisionOption(input: AgentDecisionOptionInput): AgentDecisionOption | null {
  const id = boundedText(input.id, 96);
  const kind = boundedText(input.kind, 32) as AgentDecisionKind;
  const label = boundedText(input.label, 64);
  if (!id || !label || !ALLOWED_DECISIONS.has(kind)) return null;

  return {
    id,
    kind,
    label,
    description: boundedText(input.description, 180),
    requires_confirmation: input.requires_confirmation !== false,
    requires_text: Boolean(input.requires_text),
    remote_safe: Boolean(input.remote_safe),
    expires_at: epoch(input.expires_at)
  };
}

export function normalizeAgentProgress(
  input: AgentProgressInput,
  now = Date.now()
): { ok: true; progress: StoredAgentProgress } | AgentConsoleError {
  const agentId = boundedText(input.agent_id, 160);
  const provider = boundedText(input.provider, 32);
  const version = positiveInteger(input.progress_version);
  if (!agentId || !provider || version === null) {
    return {
      ok: false,
      status: 400,
      error: 'agent_id, provider, and progress_version are required.'
    };
  }

  const statusValue = boundedText(input.status, 32) as AgentRunStatus;
  const status = ALLOWED_STATUSES.has(statusValue) ? statusValue : 'working';
  const seen = new Set<string>();
  const decisions: AgentDecisionOption[] = [];
  for (const candidate of input.decisions ?? []) {
    const decision = normalizeDecisionOption(candidate);
    if (!decision || seen.has(decision.id)) continue;
    seen.add(decision.id);
    decisions.push(decision);
    if (decisions.length >= 8) break;
  }

  const requestedExpiry = epoch(input.expires_at);
  return {
    ok: true,
    progress: {
      agent_id: agentId,
      provider,
      label: boundedText(input.label, 72) || `${provider} agent`,
      status,
      phase: boundedText(input.phase, 96),
      summary: boundedText(input.summary, 220),
      detail: boundedText(input.detail, 500),
      progress_version: version,
      needs_input: Boolean(input.needs_input),
      decisions,
      updated_at: now,
      expires_at:
        requestedExpiry && requestedExpiry > now ? requestedExpiry : now + DEFAULT_PROGRESS_TTL_MS,
      payload: input.payload ?? {}
    }
  };
}

export function buildAgentConsole(
  progress: StoredAgentProgress[],
  now = Date.now(),
  recentDecisions: StoredAgentDecision[] = []
): AgentConsole {
  const agents = progress
    .filter((agent) => agent.expires_at > now)
    .sort((left, right) => {
      if (left.needs_input !== right.needs_input) return left.needs_input ? -1 : 1;
      return right.updated_at - left.updated_at;
    })
    .slice(0, 8)
    .map(({ payload, decisions, ...agent }) => ({
      ...agent,
      decisions: decisions.filter(
        (decision) =>
          decision.remote_safe && (decision.expires_at === null || decision.expires_at > now)
      ),
      operator_context: {
        workspace_label: boundedText(payload.workspace_label, 72),
        control_reason: boundedText(payload.control_reason, 96),
        authority: boundedText(payload.authority, 72)
      }
    }));

  return {
    ok: true,
    generated_at: new Date(now).toISOString(),
    count: agents.length,
    needs_input_count: agents.filter((agent) => agent.needs_input).length,
    agents,
    recent_decisions: recentDecisions
      .sort((left, right) => right.updated_at - left.updated_at)
      .slice(0, 8)
      .map((decision) => ({
        id: decision.id,
        agent_id: decision.agent_id,
        provider: decision.provider,
        progress_version: decision.progress_version,
        decision_id: decision.decision_id,
        kind: decision.kind,
        label: decision.label,
        state: decision.state,
        updated_at: decision.updated_at,
        result_summary: decision.result_summary,
        error: decision.error
      }))
  };
}

export function prepareAgentDecision(input: {
  input: AgentDecisionInput;
  progress: StoredAgentProgress | null;
  existing?: StoredAgentDecision | null;
  now?: number;
  id: string;
}): { ok: true; decision: StoredAgentDecision; idempotent: boolean } | AgentConsoleError {
  const now = input.now ?? Date.now();
  const request = input.input;
  const idempotencyKey = boundedText(request.idempotency_key, 160);
  if (!idempotencyKey) return { ok: false, status: 400, error: 'idempotency_key is required.' };
  if (input.existing) return { ok: true, decision: input.existing, idempotent: true };
  if (!input.progress || input.progress.expires_at <= now) {
    return { ok: false, status: 404, error: 'Agent is not active. Refresh before steering.' };
  }

  const version = positiveInteger(request.progress_version);
  if (version !== input.progress.progress_version) {
    return { ok: false, status: 409, error: 'Agent progress changed. Refresh before steering.' };
  }

  const decisionId = boundedText(request.decision_id, 96);
  const option = input.progress.decisions.find((decision) => decision.id === decisionId);
  if (!option) return { ok: false, status: 400, error: 'Decision is not offered by this agent.' };
  if (option.expires_at !== null && option.expires_at <= now) {
    return { ok: false, status: 409, error: 'Decision expired. Refresh before steering.' };
  }
  if (!option.remote_safe) {
    return { ok: false, status: 403, error: 'Decision requires the desktop operator surface.' };
  }
  if (option.requires_confirmation && !request.confirmed) {
    return { ok: false, status: 400, error: 'Decision requires explicit confirmation.' };
  }

  const message = boundedText(request.message);
  if (option.requires_text && !message) {
    return { ok: false, status: 400, error: 'Decision requires a steering message.' };
  }

  return {
    ok: true,
    idempotent: false,
    decision: {
      id: input.id,
      idempotency_key: idempotencyKey,
      agent_id: input.progress.agent_id,
      provider: input.progress.provider,
      progress_version: input.progress.progress_version,
      decision_id: option.id,
      kind: option.kind,
      label: option.label,
      message,
      device_id: boundedText(request.device_id, 96) || 'stopwatch',
      state: 'queued',
      created_at: now,
      updated_at: now,
      lease_owner: '',
      lease_expires_at: null,
      attempts: 0,
      result_summary: '',
      error: '',
      payload: request.payload ?? {}
    }
  };
}

export function leaseAgentDecisions(input: {
  decisions: StoredAgentDecision[];
  input: AgentDecisionLeaseInput;
  now?: number;
}): { ok: true; decisions: StoredAgentDecision[] } | AgentConsoleError {
  const now = input.now ?? Date.now();
  const relayId = boundedText(input.input.relay_id, 96);
  if (!relayId) return { ok: false, status: 400, error: 'relay_id is required.' };

  const providers = new Set(
    (input.input.providers ?? []).map((provider) => boundedText(provider, 32)).filter(Boolean)
  );
  if (providers.size === 0)
    return { ok: false, status: 400, error: 'At least one provider is required.' };
  const limit = Math.min(20, Math.max(1, Math.round(input.input.limit ?? 5)));
  const leaseMs = Math.min(
    15 * 60_000,
    Math.max(10_000, Math.round(input.input.lease_ms ?? 30_000))
  );

  const decisions = input.decisions
    .filter(
      (decision) =>
        providers.has(decision.provider) &&
        (decision.state === 'queued' ||
          ((decision.state === 'leased' || decision.state === 'acknowledged') &&
            decision.lease_expires_at !== null &&
            decision.lease_expires_at <= now))
    )
    .sort((left, right) => left.created_at - right.created_at)
    .slice(0, limit)
    .map((decision) => ({
      ...decision,
      state: 'leased' as const,
      updated_at: now,
      lease_owner: relayId,
      lease_expires_at: now + leaseMs,
      attempts: decision.attempts + 1
    }));

  return { ok: true, decisions };
}

export function transitionAgentDecision(input: {
  decision: StoredAgentDecision | null;
  input: AgentDecisionReceiptInput;
  now?: number;
}): { ok: true; decision: StoredAgentDecision } | AgentConsoleError {
  const now = input.now ?? Date.now();
  const relayId = boundedText(input.input.relay_id, 96);
  if (!input.decision) return { ok: false, status: 404, error: 'Decision not found.' };
  if (!relayId) return { ok: false, status: 400, error: 'relay_id is required.' };
  if (input.decision.lease_owner && input.decision.lease_owner !== relayId) {
    return { ok: false, status: 409, error: 'Decision is leased by another relay.' };
  }
  if (input.decision.state !== 'leased' && input.decision.state !== 'acknowledged') {
    return { ok: false, status: 409, error: 'Decision is not awaiting a relay receipt.' };
  }

  const nextState = input.input.state;
  if (nextState !== 'acknowledged' && nextState !== 'completed' && nextState !== 'failed') {
    return {
      ok: false,
      status: 400,
      error: 'Receipt state must be acknowledged, completed, or failed.'
    };
  }

  return {
    ok: true,
    decision: {
      ...input.decision,
      state: nextState,
      updated_at: now,
      result_summary: boundedText(input.input.summary, 220),
      error: boundedText(input.input.error, 220),
      payload: { ...input.decision.payload, ...(input.input.payload ?? {}) }
    }
  };
}
