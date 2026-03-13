import { z } from 'zod';

import type { CheckpointRow, LoomIssueType, LoomPriority, LoomSessionStatus, LoomStatus, TaskRow } from './types.js';

export const STATUS_VALUES: LoomStatus[] = ['ready', 'claimed', 'blocked', 'done', 'cancelled'];
export const PRIORITY_VALUES: LoomPriority[] = ['critical', 'high', 'normal', 'low'];
export const ISSUE_TYPE_VALUES: LoomIssueType[] = ['bug', 'feature', 'task', 'epic', 'chore'];
export const SESSION_STATUS_VALUES: LoomSessionStatus[] = ['active', 'completed', 'failed', 'interrupted', 'cancelled'];

const textEncoder = new TextEncoder();

export function nowIso(): string {
  return new Date().toISOString();
}

export function generateTaskId(): string {
  return `lm-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function generateSessionId(): string {
  return `ses-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function generateCheckpointId(sessionId: string, sequence: number): string {
  const suffix = sessionId.startsWith('ses-') ? sessionId.slice(4) : sessionId;
  return `chk-${suffix}-${sequence}`;
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function parseJsonObject<T = Record<string, unknown>>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function parseJsonValue<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toTaskView(task: TaskRow): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    issue_type: task.issue_type,
    agent: task.agent,
    labels: parseJsonArray(task.labels_json),
    parent: task.parent,
    repo: task.repo,
    evidence: task.evidence,
    close_reason: task.close_reason,
    actual_cost_usd: task.actual_cost_usd,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

export function toCheckpointView(checkpoint: CheckpointRow): Record<string, unknown> {
  return {
    checkpoint_id: checkpoint.id,
    session_id: checkpoint.session_id,
    sequence: checkpoint.sequence,
    summary: checkpoint.summary,
    created_at: checkpoint.created_at,
  };
}

export function normalizePriority(value: string | null | undefined): LoomPriority {
  if (!value) return 'normal';
  const lower = value.toLowerCase();
  return PRIORITY_VALUES.includes(lower as LoomPriority) ? (lower as LoomPriority) : 'normal';
}

export function normalizeIssueType(value: string | null | undefined): LoomIssueType {
  if (!value) return 'task';
  const lower = value.toLowerCase();
  return ISSUE_TYPE_VALUES.includes(lower as LoomIssueType) ? (lower as LoomIssueType) : 'task';
}

export function normalizeStatus(value: string | null | undefined): LoomStatus {
  if (!value) return 'ready';
  const lower = value.toLowerCase();
  return STATUS_VALUES.includes(lower as LoomStatus) ? (lower as LoomStatus) : 'ready';
}

export function normalizeSessionStatus(value: string | null | undefined): LoomSessionStatus {
  if (!value) return 'active';
  const lower = value.toLowerCase();
  return SESSION_STATUS_VALUES.includes(lower as LoomSessionStatus) ? (lower as LoomSessionStatus) : 'active';
}

export function priorityWeight(priority: LoomPriority): number {
  if (priority === 'critical') return 1;
  if (priority === 'high') return 0.75;
  if (priority === 'low') return 0.25;
  return 0.5;
}

export function issueTypeWeight(issueType: LoomIssueType): number {
  if (issueType === 'bug') return 0.8;
  if (issueType === 'chore') return 0.4;
  if (issueType === 'epic') return 0.3;
  return 0.5;
}

export function ageWeight(createdAt: string): number {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return 0;
  const days = Math.max(0, (Date.now() - created) / (1000 * 60 * 60 * 24));
  return Math.min(1, days / 7);
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function textToolResult(structuredContent: Record<string, unknown>, isError = false): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
    ...(isError ? { isError: true } : {}),
  };
}

export function errorToolResult(message: string, extra: Record<string, unknown> = {}): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
} {
  return textToolResult({ error: message, ...extra }, true);
}

export async function verifyHmacSignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(rawBody));
  const expectedHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');

  const a = textEncoder.encode(expectedHex);
  const b = textEncoder.encode(signatureHex.trim().toLowerCase());
  const max = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return mismatch === 0;
}

export const OptionalStringArraySchema = z.array(z.string()).optional();
