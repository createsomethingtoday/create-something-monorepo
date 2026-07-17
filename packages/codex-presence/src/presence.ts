import { open, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type PresenceState =
  | 'working'
  | 'needs_input'
  | 'approval'
  | 'blocked'
  | 'failed'
  | 'complete'
  | 'available'
  | 'stale';

export type PresenceAttention = 'quiet' | 'notice' | 'decision' | 'urgent';
export type PresenceFreshness = 'fresh' | 'aging' | 'stale';

export type PresenceActionType =
  | 'inspect'
  | 'follow_up'
  | 'answer'
  | 'approve'
  | 'deny'
  | 'interrupt'
  | 'dismiss'
  | 'open_detail';

export type PresenceAction = {
  id: string;
  type: PresenceActionType;
  label: string;
  risk: 'safe' | 'review' | 'restricted';
  requiresConfirmation: boolean;
};

export type PresenceCard = {
  taskId: string;
  task: string;
  state: PresenceState;
  attention: PresenceAttention;
  operatorRequired: boolean;
  summary: string;
  reason: string;
  actions: PresenceAction[];
  observedAt: string;
  version: string;
  freshness: PresenceFreshness;
  source: {
    kind: 'codex_rollout';
    path: string;
  };
};

export type ReadPresenceCardOptions = {
  rolloutPath: string;
  title?: string;
  now?: Date;
};

export type ListPresenceCardsOptions = {
  codexHome: string;
  limit?: number;
  now?: Date;
};

type RolloutEntry = {
  timestamp?: unknown;
  type?: unknown;
  payload?: unknown;
};

export async function readPresenceCard(options: ReadPresenceCardOptions): Promise<PresenceCard> {
  const entries = parseRollout(await readRolloutWindow(options.rolloutPath));
  const now = options.now ?? new Date();
  const taskId = sessionId(entries) || rolloutIdFromPath(options.rolloutPath);
  const observedAt = latestTimestamp(entries) ?? now.toISOString();
  const freshness = freshnessFor(observedAt, now);
  const reduced = reduceState(entries);
  const state: PresenceState = reduced.state === 'working' && freshness === 'stale'
    ? 'stale'
    : reduced.state === 'complete' && freshness === 'stale'
      ? 'available'
      : reduced.state;
  const agentSummary = latestAgentMessage(entries);

  return {
    taskId,
    task: options.title?.trim() || 'Untitled Codex task',
    state,
    attention: attentionFor(state),
    operatorRequired: state === 'needs_input' || state === 'approval',
    summary: summaryFor(state, agentSummary),
    reason: reasonFor(state),
    actions: actionsFor(state, taskId, reduced.version),
    observedAt,
    version: reduced.version,
    freshness,
    source: {
      kind: 'codex_rollout',
      path: options.rolloutPath
    }
  };
}

export async function listPresenceCards(options: ListPresenceCardsOptions): Promise<PresenceCard[]> {
  const indexPath = join(options.codexHome, 'session_index.jsonl');
  const limit = options.limit ?? 10;
  const indexEntries = parseSessionIndex(await readFile(indexPath, 'utf8'))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, Math.max(100, limit * 10));
  const rolloutPaths = await findRollouts(join(options.codexHome, 'sessions'));
  const entriesBySuffix = new Map(indexEntries.map((entry) => [`-${entry.id}.jsonl`, entry]));

  const cards = (await Promise.all(rolloutPaths.map(async (rolloutPath) => {
    const match = [...entriesBySuffix].find(([suffix]) => rolloutPath.endsWith(suffix));
    if (!match) return undefined;
    return readPresenceCard({ rolloutPath, title: match[1].title, now: options.now });
  }))).filter((card): card is PresenceCard => Boolean(card));

  cards.sort((left, right) => {
    const priority = attentionPriority(right.attention) - attentionPriority(left.attention);
    return priority || Date.parse(right.observedAt) - Date.parse(left.observedAt);
  });
  return cards.slice(0, limit);
}

function parseSessionIndex(input: string): Array<{ id: string; title: string; updatedAt: string }> {
  const latest = new Map<string, { title: string; updatedAt: string }>();
  for (const line of input.split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = record(JSON.parse(line) as unknown);
      const id = stringValue(value.id).trim();
      if (id) latest.set(id, {
        title: stringValue(value.thread_name).trim() || 'Untitled Codex task',
        updatedAt: validTimestamp(value.updated_at) ?? new Date(0).toISOString()
      });
    } catch {
      // The session index is append-only and may end with a partial line.
    }
  }
  return [...latest].map(([id, value]) => ({ id, ...value }));
}

async function readRolloutWindow(path: string): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const { size } = await handle.stat();
    const headSize = Math.min(size, 64 * 1024);
    const tailSize = Math.min(Math.max(0, size - headSize), 2 * 1024 * 1024);
    const head = Buffer.alloc(headSize);
    await handle.read(head, 0, headSize, 0);
    if (tailSize === 0) return head.toString('utf8');
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, size - tailSize);
    const tailText = tail.toString('utf8');
    const firstLineBreak = tailText.indexOf('\n');
    return `${head.toString('utf8')}\n${firstLineBreak >= 0 ? tailText.slice(firstLineBreak + 1) : ''}`;
  } finally {
    await handle.close();
  }
}

async function findRollouts(root: string): Promise<string[]> {
  const found: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(path);
    }
  }
  return found;
}

function attentionPriority(attention: PresenceAttention): number {
  if (attention === 'urgent') return 3;
  if (attention === 'decision') return 2;
  if (attention === 'notice') return 1;
  return 0;
}

function parseRollout(input: string): RolloutEntry[] {
  const entries: RolloutEntry[] = [];
  for (const line of input.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        entries.push(parsed as RolloutEntry);
      }
    } catch {
      // Rollout files are append-only. A partial final line must not make all
      // previously verified state unreadable.
    }
  }
  return entries;
}

function sessionId(entries: RolloutEntry[]): string {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.type !== 'session_meta') continue;
    const payload = record(entry.payload);
    if (typeof payload.id === 'string' && payload.id.trim()) return payload.id.trim();
  }
  return '';
}

function latestTimestamp(entries: RolloutEntry[]): string | undefined {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const timestamp = entries[index]?.timestamp;
    if (typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp))) return timestamp;
  }
  return undefined;
}

function reduceState(entries: RolloutEntry[]): { state: PresenceState; version: string } {
  const resolvedCalls = new Set<string>();
  let approvalResolved = false;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const payload = record(entry?.payload);

    if (entry?.type === 'response_item') {
      const callId = stringValue(payload.call_id);
      if (payload.type === 'function_call_output' && callId) {
        resolvedCalls.add(callId);
        continue;
      }
      if (
        payload.type === 'function_call' &&
        payload.name === 'request_user_input' &&
        callId &&
        !resolvedCalls.has(callId)
      ) {
        return { state: 'needs_input', version: `question:${callId}` };
      }
      continue;
    }

    if (entry?.type !== 'event_msg') continue;
    const type = payload.type;
    const timestamp = validTimestamp(entry.timestamp) ?? 'unknown';
    if (type === 'task_complete') return { state: 'complete', version: `complete:${timestamp}` };
    if (type === 'error' || type === 'stream_error') return { state: 'failed', version: `failed:${timestamp}` };
    if (type === 'turn_aborted') return { state: 'blocked', version: `blocked:${timestamp}` };
    if (type === 'exec_approval_response' || type === 'approval_response') {
      approvalResolved = true;
      continue;
    }
    if (
      (type === 'exec_approval_request' || type === 'approval_request') &&
      !approvalResolved
    ) {
      return {
        state: 'approval',
        version: `approval:${stringValue(payload.request_id) || timestamp}`
      };
    }
    if (type === 'task_started') return { state: 'working', version: `working:${timestamp}` };
  }
  return { state: 'available', version: 'available' };
}

function latestAgentMessage(entries: RolloutEntry[]): string | undefined {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.type !== 'event_msg') continue;
    const payload = record(entry.payload);
    if (payload.type !== 'agent_message') continue;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
  }
  return undefined;
}

function freshnessFor(observedAt: string, now: Date): PresenceFreshness {
  const ageMs = Math.max(0, now.getTime() - Date.parse(observedAt));
  if (ageMs <= 30_000) return 'fresh';
  if (ageMs <= 5 * 60_000) return 'aging';
  return 'stale';
}

function actionsFor(state: PresenceState, taskId: string, version: string): PresenceAction[] {
  if (state === 'working') {
    return [
      action(taskId, version, 'inspect', 'Inspect', 'safe', false),
      action(taskId, version, 'follow_up', 'Follow up', 'safe', false),
      action(taskId, version, 'interrupt', 'Stop', 'review', true)
    ];
  }
  if (state === 'complete') {
    return [
      action(taskId, version, 'inspect', 'Inspect', 'safe', false),
      action(taskId, version, 'follow_up', 'Follow up', 'safe', false),
      action(taskId, version, 'dismiss', 'Dismiss', 'safe', false)
    ];
  }
  if (state === 'needs_input') {
    return [
      action(taskId, version, 'inspect', 'Inspect', 'safe', false),
      action(taskId, version, 'answer', 'Answer', 'review', false)
    ];
  }
  if (state === 'approval') {
    return [
      action(taskId, version, 'inspect', 'Inspect', 'safe', false),
      action(taskId, version, 'approve', 'Approve', 'restricted', true),
      action(taskId, version, 'deny', 'Deny', 'review', true)
    ];
  }
  if (state === 'failed' || state === 'blocked') {
    return [
      action(taskId, version, 'inspect', 'Inspect', 'safe', false),
      action(taskId, version, 'follow_up', 'Follow up', 'safe', false),
      action(taskId, version, 'dismiss', 'Dismiss', 'safe', false)
    ];
  }
  return [action(taskId, version, 'inspect', 'Inspect', 'safe', false)];
}

function attentionFor(state: PresenceState): PresenceAttention {
  if (state === 'failed' || state === 'blocked') return 'urgent';
  if (state === 'needs_input' || state === 'approval') return 'decision';
  if (state === 'stale' || state === 'complete') return 'notice';
  return 'quiet';
}

function summaryFor(state: PresenceState, agentSummary?: string): string {
  if (state === 'working') return 'Codex is working.';
  if (state === 'needs_input') return 'Codex needs your answer.';
  if (state === 'approval') return 'Codex is waiting for approval.';
  if (state === 'blocked') return 'The Codex turn stopped before completion.';
  if (state === 'failed') return 'The Codex turn failed.';
  if (state === 'stale') return 'Codex state is no longer fresh.';
  if (state === 'complete') return agentSummary || 'Codex completed the turn.';
  return 'Codex is available.';
}

function reasonFor(state: PresenceState): string {
  if (state === 'working') return 'A task turn is active.';
  if (state === 'needs_input') return 'A user-input request has no matching response.';
  if (state === 'approval') return 'An approval request has no matching decision.';
  if (state === 'blocked') return 'The latest turn was explicitly aborted.';
  if (state === 'failed') return 'The rollout contains an explicit error event.';
  if (state === 'stale') return 'No recent lifecycle evidence was observed.';
  if (state === 'complete') return 'The latest task turn completed.';
  return 'No task turn is active.';
}

function action(
  taskId: string,
  version: string,
  type: PresenceActionType,
  label: string,
  risk: PresenceAction['risk'],
  requiresConfirmation: boolean
): PresenceAction {
  return {
    id: `${taskId}:${type}:${version}`,
    type,
    label,
    risk,
    requiresConfirmation
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function validTimestamp(value: unknown): string | undefined {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
}

function rolloutIdFromPath(path: string): string {
  const match = path.match(/([0-9a-f]{8}-[0-9a-f-]{27,})\.jsonl$/i);
  return match?.[1] ?? 'unknown';
}
