export const CODEX_PAGER_FOLLOW_UP = 'Continue with the recommended next step.';
export const CODEX_SNAPSHOT_TTL_MS = 5 * 60_000;
export const CODEX_COMMAND_TTL_MS = 2 * 60_000;

export type CodexSnapshot = {
  runner_id: string;
  device_id: string;
  task_id: string;
  task: string;
  state: string;
  action_id: string;
  action_type: 'follow_up';
  action_risk: 'safe';
  requires_confirmation: false;
  observed_at: number;
  expires_at: number;
  version: string;
  status: 'ready';
};

export type CreateCodexCommandInput = {
  device_id: string;
  device_nonce: string;
  task_id: string;
  action_id: string;
  confirmed: boolean;
};

export type CodexCommandReceipt = {
  request_id: string;
  task_id: string;
  action_id: string;
  status: 'accepted' | 'rejected';
  upstream_status?: number;
  detail?: string;
  created_at: number;
};

export type CodexCommand = {
  request_id: string;
  runner_id: string;
  device_id: string;
  device_nonce: string;
  task_id: string;
  action_id: string;
  type: 'follow_up';
  text: typeof CODEX_PAGER_FOLLOW_UP;
  status: 'queued' | 'claimed' | 'accepted' | 'rejected' | 'expired';
  created_at: number;
  expires_at: number;
  claimed_at: number | null;
  claimed_by: string | null;
  receipt: CodexCommandReceipt | null;
};

export type CompleteCodexCommandInput = {
  request_id: string;
  task_id: string;
  action_id: string;
  status: 'accepted' | 'rejected';
  upstream_status?: number;
  detail?: string;
};

export class CodexCommandError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'CodexCommandError';
  }
}

export function normalizeCodexSnapshot(input: unknown, now = Date.now()): CodexSnapshot {
  const value = record(input);
  const runnerId = identifier(value.runner_id, 'runner_id');
  const deviceId = identifier(value.device_id, 'device_id');
  const taskId = identifier(value.task_id, 'task_id');
  const task = boundedText(value.task, 'task', 120);
  const state = boundedText(value.state, 'state', 32);
  const actionId = identifier(value.action_id, 'action_id', 240);
  const version = identifier(value.version, 'version', 160);
  const observedAt = Date.parse(text(value.observed_at));

  if (
    value.action_type !== 'follow_up' ||
    value.action_risk !== 'safe' ||
    value.requires_confirmation !== false
  ) {
    throw new CodexCommandError(
      'unsupported_action',
      400,
      'Only an unconfirmed safe follow-up Presence action may be published.'
    );
  }
  if (!Number.isFinite(observedAt)) {
    throw new CodexCommandError('invalid_snapshot', 400, 'Snapshot observed_at is invalid.');
  }
  if (observedAt > now + 30_000) {
    throw new CodexCommandError('invalid_snapshot', 400, 'Snapshot observed_at is in the future.');
  }
  const expiresAt = observedAt + CODEX_SNAPSHOT_TTL_MS;
  if (expiresAt <= now) {
    throw new CodexCommandError('stale_snapshot', 410, 'The Codex snapshot has expired.');
  }

  return {
    runner_id: runnerId,
    device_id: deviceId,
    task_id: taskId,
    task,
    state,
    action_id: actionId,
    action_type: 'follow_up',
    action_risk: 'safe',
    requires_confirmation: false,
    observed_at: observedAt,
    expires_at: expiresAt,
    version,
    status: 'ready'
  };
}

export function createCodexCommand(
  input: CreateCodexCommandInput,
  snapshot: CodexSnapshot,
  now = Date.now(),
  requestId: () => string = () => crypto.randomUUID()
): CodexCommand {
  const deviceId = identifier(input.device_id, 'device_id');
  const deviceNonce = identifier(input.device_nonce, 'device_nonce', 160);
  const taskId = identifier(input.task_id, 'task_id');
  const actionId = identifier(input.action_id, 'action_id', 240);

  if (input.confirmed !== true) {
    throw new CodexCommandError('confirmation_required', 409, 'Physical confirmation is required.');
  }
  if (snapshot.expires_at <= now) {
    throw new CodexCommandError('stale_snapshot', 410, 'The Codex snapshot has expired.');
  }
  if (deviceId !== snapshot.device_id) {
    throw new CodexCommandError('wrong_device', 403, 'The snapshot belongs to another device.');
  }
  if (taskId !== snapshot.task_id || actionId !== snapshot.action_id) {
    throw new CodexCommandError(
      'stale_action',
      409,
      'The requested task or action is no longer current.'
    );
  }

  return {
    request_id: identifier(requestId(), 'request_id'),
    runner_id: snapshot.runner_id,
    device_id: deviceId,
    device_nonce: deviceNonce,
    task_id: taskId,
    action_id: actionId,
    type: 'follow_up',
    text: CODEX_PAGER_FOLLOW_UP,
    status: 'queued',
    created_at: now,
    expires_at: now + CODEX_COMMAND_TTL_MS,
    claimed_at: null,
    claimed_by: null,
    receipt: null
  };
}

export function claimCodexCommand(
  command: CodexCommand,
  runnerIdInput: string,
  now = Date.now()
): CodexCommand {
  const runnerId = identifier(runnerIdInput, 'runner_id');
  if (runnerId !== command.runner_id) {
    throw new CodexCommandError('wrong_runner', 403, 'The command belongs to another runner.');
  }
  if (command.status === 'claimed') {
    throw new CodexCommandError(
      'already_claimed',
      409,
      'The command is already claimed and will not be automatically replayed.'
    );
  }
  if (command.status !== 'queued') {
    throw new CodexCommandError('terminal_command', 409, 'The command is already terminal.');
  }
  if (command.expires_at <= now) {
    throw new CodexCommandError('expired_command', 410, 'The command expired before claim.');
  }

  return {
    ...command,
    status: 'claimed',
    claimed_at: now,
    claimed_by: runnerId
  };
}

export function completeCodexCommand(
  command: CodexCommand,
  runnerIdInput: string,
  input: CompleteCodexCommandInput,
  now = Date.now()
): CodexCommand {
  const runnerId = identifier(runnerIdInput, 'runner_id');
  if (runnerId !== command.runner_id || runnerId !== command.claimed_by) {
    throw new CodexCommandError(
      'wrong_runner',
      403,
      'Only the claiming runner may write a receipt.'
    );
  }
  if (command.status !== 'claimed') {
    throw new CodexCommandError('terminal_command', 409, 'The command is not awaiting a receipt.');
  }
  if (
    input.request_id !== command.request_id ||
    input.task_id !== command.task_id ||
    input.action_id !== command.action_id
  ) {
    throw new CodexCommandError(
      'receipt_mismatch',
      409,
      'Receipt identifiers do not match the claim.'
    );
  }
  if (input.status !== 'accepted' && input.status !== 'rejected') {
    throw new CodexCommandError('invalid_receipt', 400, 'Receipt status is invalid.');
  }

  const receipt: CodexCommandReceipt = {
    request_id: command.request_id,
    task_id: command.task_id,
    action_id: command.action_id,
    status: input.status,
    ...(Number.isInteger(input.upstream_status) &&
    Number(input.upstream_status) >= 100 &&
    Number(input.upstream_status) <= 599
      ? { upstream_status: Number(input.upstream_status) }
      : {}),
    ...(text(input.detail) ? { detail: boundedText(input.detail, 'detail', 160) } : {}),
    created_at: now
  };

  return {
    ...command,
    status: receipt.status,
    receipt
  };
}

export function expireCodexCommand(command: CodexCommand, now = Date.now()): CodexCommand {
  if (command.status !== 'queued' || command.expires_at > now) return command;
  return { ...command, status: 'expired' };
}

export function toDeviceCodexView(
  snapshot: CodexSnapshot | null,
  command: CodexCommand | null,
  now = Date.now()
): {
  ok: true;
  status: 'offline' | 'ready' | CodexCommand['status'];
  task_id: string;
  task: string;
  action_id: string;
  request_id: string | null;
  expires_at: number | null;
  receipt: CodexCommandReceipt | null;
} {
  const usableSnapshot = snapshot && snapshot.expires_at > now ? snapshot : null;
  const currentCommand = command ? expireCodexCommand(command, now) : null;
  const commandMatchesSnapshot = Boolean(
    currentCommand &&
    usableSnapshot &&
    currentCommand.task_id === usableSnapshot.task_id &&
    currentCommand.action_id === usableSnapshot.action_id
  );
  const activeCommand =
    currentCommand &&
    (currentCommand.status === 'queued' ||
      currentCommand.status === 'claimed' ||
      !usableSnapshot ||
      commandMatchesSnapshot)
      ? currentCommand
      : null;
  return {
    ok: true,
    status: activeCommand?.status ?? (usableSnapshot ? 'ready' : 'offline'),
    task_id: usableSnapshot?.task_id ?? currentCommand?.task_id ?? '',
    task: usableSnapshot?.task ?? '',
    action_id: usableSnapshot?.action_id ?? currentCommand?.action_id ?? '',
    request_id: currentCommand?.request_id ?? null,
    expires_at:
      activeCommand?.expires_at ?? usableSnapshot?.expires_at ?? currentCommand?.expires_at ?? null,
    receipt: currentCommand?.receipt ?? null
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CodexCommandError('invalid_input', 400, 'Expected an object.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function boundedText(value: unknown, field: string, maximum: number): string {
  const normalized = text(value);
  if (!normalized || normalized.length > maximum) {
    throw new CodexCommandError('invalid_input', 400, `${field} is missing or too long.`);
  }
  return normalized;
}

function identifier(value: unknown, field: string, maximum = 128): string {
  const normalized = boundedText(value, field, maximum);
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(normalized)) {
    throw new CodexCommandError('invalid_input', 400, `${field} contains unsupported characters.`);
  }
  return normalized;
}
