import type { InkAlertInput } from './types.js';

export const DEFAULT_REMINDER_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_GMAIL_TOOL = 'GMAIL_SEND_EMAIL';
export const DEFAULT_GMAIL_ENTITY_ID = 'default';

export type ReminderChannel = 'gmail' | 'ink';

export interface OperatorReminder {
  id: string;
  due_at: string;
  subject: string;
  reason: string;
  action: string;
  detail: string;
  client?: string;
  channels: ReminderChannel[];
  email_to?: string;
  email_subject?: string;
  notion_url?: string;
  linear_issue?: string;
  ttl_ms?: number;
}

export interface OperatorReminderEnv {
  OPERATOR_REMINDERS_JSON?: string;
  OPERATOR_REMINDER_EMAIL_TO?: string;
}

export interface DueOperatorReminder {
  reminder: OperatorReminder;
  due_at_ms: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalStringValue(value: unknown): string | undefined {
  const normalized = stringValue(value);
  return normalized || undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return undefined;
}

function normalizeChannels(value: unknown): ReminderChannel[] {
  const raw = Array.isArray(value) ? value : ['gmail', 'ink'];
  const channels = raw
    .map((channel) => stringValue(channel).toLowerCase())
    .filter((channel): channel is ReminderChannel => channel === 'gmail' || channel === 'ink');
  return [...new Set(channels)];
}

export function parseOperatorReminders(env: OperatorReminderEnv): OperatorReminder[] {
  const source = env.OPERATOR_REMINDERS_JSON?.trim();
  if (!source) return [];

  const parsed = JSON.parse(source) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const reminders: OperatorReminder[] = [];

  for (const item of items) {
    const record = asRecord(item);
    if (!record) continue;

    const id = stringValue(record.id);
    const dueAt = stringValue(record.due_at);
    const subject = stringValue(record.subject);
    if (!id || !dueAt || !subject) continue;

    const channels = normalizeChannels(record.channels);
    if (!channels.length) continue;

    reminders.push({
      id,
      due_at: dueAt,
      subject,
      reason: stringValue(record.reason),
      action: stringValue(record.action) || 'Review and follow up.',
      detail: stringValue(record.detail),
      client: optionalStringValue(record.client),
      channels,
      email_to: optionalStringValue(record.email_to) ?? optionalStringValue(env.OPERATOR_REMINDER_EMAIL_TO),
      email_subject: optionalStringValue(record.email_subject),
      notion_url: optionalStringValue(record.notion_url),
      linear_issue: optionalStringValue(record.linear_issue),
      ttl_ms: numberValue(record.ttl_ms)
    });
  }

  return reminders;
}

export function dueOperatorReminders(env: OperatorReminderEnv, nowMs = Date.now()): DueOperatorReminder[] {
  return parseOperatorReminders(env)
    .map((reminder) => ({
      reminder,
      due_at_ms: Date.parse(reminder.due_at)
    }))
    .filter((entry) => Number.isFinite(entry.due_at_ms) && entry.due_at_ms <= nowMs)
    .sort((a, b) => a.due_at_ms - b.due_at_ms || a.reminder.id.localeCompare(b.reminder.id));
}

export function buildReminderAlert(reminder: OperatorReminder): InkAlertInput {
  return {
    id: `operator-reminder:${reminder.id}`,
    state: 'operator_attention',
    category: 'follow_up',
    severity: 85,
    subject: reminder.subject,
    reason: reminder.reason,
    detail: reminder.detail,
    action: reminder.action,
    source: 'operator-reminder',
    external_id: reminder.id,
    urgent: true,
    ttl_ms: reminder.ttl_ms ?? DEFAULT_REMINDER_TTL_MS,
    payload: {
      client: reminder.client ?? '',
      due_at: reminder.due_at,
      notion_url: reminder.notion_url ?? '',
      linear_issue: reminder.linear_issue ?? ''
    }
  };
}

export function buildReminderEmail(reminder: OperatorReminder): {
  recipientEmail: string;
  subject: string;
  body: string;
} {
  const recipientEmail = reminder.email_to?.trim() ?? '';
  const subject = reminder.email_subject?.trim() || `Follow up: ${reminder.subject}`;
  const lines = [
    reminder.subject,
    '',
    reminder.reason ? `Context: ${reminder.reason}` : '',
    reminder.detail ? `Detail: ${reminder.detail}` : '',
    `Next action: ${reminder.action}`,
    '',
    reminder.client ? `Client: ${reminder.client}` : '',
    `Due: ${reminder.due_at}`,
    reminder.notion_url ? `Notion: ${reminder.notion_url}` : '',
    reminder.linear_issue ? `Linear: ${reminder.linear_issue}` : ''
  ].filter(Boolean);

  return {
    recipientEmail,
    subject,
    body: lines.join('\n')
  };
}
