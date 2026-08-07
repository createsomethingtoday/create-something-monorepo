import type { ActionReceipt, PresenceAction, PresenceCard } from '@create-something/codex-presence';

export const CODEX_PAGER_FOLLOW_UP = 'Continue with the recommended next step.';

export type RunnerReceipt = {
  request_id: string;
  task_id: string;
  action_id: string;
  status: 'accepted' | 'rejected';
  upstream_status?: number;
  detail?: string;
};

export type RunnerJournalEntry = {
  request_id: string;
  state: 'claimed' | 'executed' | 'terminal';
  task_id: string;
  action_id: string;
  updated_at: string;
  receipt?: RunnerReceipt;
};

export interface RunnerJournal {
  get(requestId: string): Promise<RunnerJournalEntry | null>;
  pending(): Promise<RunnerJournalEntry[]>;
  put(entry: RunnerJournalEntry): Promise<void>;
}

export type CodexPagerRunnerOptions = {
  bridgeOrigin: string;
  bridgeToken: string;
  presenceOrigin: string;
  presenceToken: string;
  runnerId: string;
  deviceId: string;
  taskId: string;
  journal: RunnerJournal;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

type BridgeCommand = {
  request_id: string;
  runner_id: string;
  device_id: string;
  task_id: string;
  action_id: string;
  type: 'follow_up';
  text: string;
  status: 'queued' | 'claimed' | 'accepted' | 'rejected' | 'expired';
  expires_at: number;
};

export class RunnerSafetyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'RunnerSafetyError';
  }
}

export class CodexPagerRunner {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly bridgeOrigin: string;
  private readonly presenceOrigin: string;

  constructor(private readonly options: CodexPagerRunnerOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => Date.now());
    this.bridgeOrigin = cleanOrigin(options.bridgeOrigin, 'bridgeOrigin');
    this.presenceOrigin = cleanLoopbackOrigin(options.presenceOrigin);
    required(options.bridgeToken, 'bridgeToken');
    required(options.presenceToken, 'presenceToken');
    simpleId(options.runnerId, 'runnerId');
    simpleId(options.deviceId, 'deviceId');
    simpleId(options.taskId, 'taskId');
  }

  async runOnce(): Promise<{
    status: 'idle' | 'accepted' | 'rejected' | 'recovered';
    request_id?: string;
  }> {
    const recovered = await this.recoverJournal();
    if (recovered) return { status: 'recovered', request_id: recovered };

    const { card, action } = await this.publishSnapshot();
    const command = await this.nextCommand();
    if (!command) return { status: 'idle' };
    this.validateCommand(command, card, action);

    const claimed = await this.bridgeJson<BridgeCommand>(
      `/ink/codex/commands/${encodeURIComponent(command.request_id)}/claim`,
      {
        method: 'POST',
        body: { runner_id: this.options.runnerId }
      }
    );
    if (claimed.status !== 'claimed') {
      throw new RunnerSafetyError('claim_rejected', 'Bridge did not return a claimed command.');
    }
    await this.options.journal.put({
      request_id: command.request_id,
      state: 'claimed',
      task_id: command.task_id,
      action_id: command.action_id,
      updated_at: new Date(this.now()).toISOString()
    });

    const receipt = await this.executePresence(command);
    await this.options.journal.put({
      request_id: command.request_id,
      state: 'executed',
      task_id: command.task_id,
      action_id: command.action_id,
      updated_at: new Date(this.now()).toISOString(),
      receipt
    });

    await this.postReceipt(receipt);
    await this.options.journal.put({
      request_id: command.request_id,
      state: 'terminal',
      task_id: command.task_id,
      action_id: command.action_id,
      updated_at: new Date(this.now()).toISOString(),
      receipt
    });
    return { status: receipt.status, request_id: command.request_id };
  }

  async publishSnapshot(): Promise<{ card: PresenceCard; action: PresenceAction }> {
    const payload = await this.presenceJson<{ cards?: PresenceCard[] }>('/v1/cards');
    const card = payload.cards?.find((candidate) => candidate.taskId === this.options.taskId);
    if (!card) throw new RunnerSafetyError('task_not_found', 'Selected Codex task is not present.');
    if (!/\bdisposable\b/i.test(card.task)) {
      throw new RunnerSafetyError(
        'non_disposable_task',
        'Selected task title must explicitly identify a disposable verifier.'
      );
    }
    if (card.freshness !== 'fresh') {
      throw new RunnerSafetyError('stale_task', 'Selected Codex task is not fresh.');
    }
    const action = card.actions.find(
      (candidate) =>
        candidate.type === 'follow_up' &&
        candidate.risk === 'safe' &&
        candidate.requiresConfirmation === false
    );
    if (!action) {
      throw new RunnerSafetyError('action_unavailable', 'Selected task has no safe follow-up action.');
    }

    await this.bridgeJson('/ink/codex/snapshot', {
      method: 'POST',
      body: {
        runner_id: this.options.runnerId,
        device_id: this.options.deviceId,
        task_id: card.taskId,
        task: card.task,
        state: card.state,
        action_id: action.id,
        action_type: action.type,
        action_risk: action.risk,
        requires_confirmation: action.requiresConfirmation,
        observed_at: card.observedAt,
        version: card.version
      }
    });
    return { card, action };
  }

  private async recoverJournal(): Promise<string | null> {
    const pending = await this.options.journal.pending();
    const ambiguous = pending.find((entry) => entry.state === 'claimed');
    if (ambiguous) {
      throw new RunnerSafetyError(
        'ambiguous_claim',
        `Command ${ambiguous.request_id} was claimed before restart; automatic execution is disabled.`
      );
    }
    const executed = pending.find((entry) => entry.state === 'executed');
    if (!executed) return null;
    if (!executed.receipt) {
      throw new RunnerSafetyError('invalid_journal', 'Executed journal entry is missing its receipt.');
    }
    await this.postReceipt(executed.receipt);
    await this.options.journal.put({ ...executed, state: 'terminal', updated_at: new Date(this.now()).toISOString() });
    return executed.request_id;
  }

  private async nextCommand(): Promise<BridgeCommand | null> {
    const payload = await this.bridgeJson<BridgeCommand & { value?: unknown }>(
      `/ink/codex/commands/next?runner_id=${encodeURIComponent(this.options.runnerId)}`
    );
    if (payload.value === null) return null;
    if (!payload.request_id) return null;
    return payload;
  }

  private validateCommand(command: BridgeCommand, card: PresenceCard, action: PresenceAction): void {
    if (
      command.runner_id !== this.options.runnerId ||
      command.device_id !== this.options.deviceId ||
      command.task_id !== this.options.taskId ||
      command.task_id !== card.taskId ||
      command.action_id !== action.id ||
      command.type !== 'follow_up' ||
      command.text !== CODEX_PAGER_FOLLOW_UP
    ) {
      throw new RunnerSafetyError('command_mismatch', 'Queued command does not match the selected local action.');
    }
    if (command.status !== 'queued' || command.expires_at <= this.now()) {
      throw new RunnerSafetyError('command_expired', 'Queued command is not executable.');
    }
  }

  private async executePresence(command: BridgeCommand): Promise<RunnerReceipt> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.presenceOrigin}/v1/actions`, {
        method: 'POST',
        headers: this.presenceHeaders(),
        body: JSON.stringify({
          requestId: command.request_id,
          taskId: command.task_id,
          actionId: command.action_id,
          type: 'follow_up',
          text: CODEX_PAGER_FOLLOW_UP,
          confirmed: true
        })
      });
    } catch (error) {
      throw new RunnerSafetyError(
        'ambiguous_execution',
        `Presence transport failed after claim: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const value = await parseJson(response);
    const receipt = value as Partial<ActionReceipt>;
    if (
      receipt.requestId !== command.request_id ||
      receipt.taskId !== command.task_id ||
      receipt.actionId !== command.action_id ||
      (receipt.status !== 'accepted' && receipt.status !== 'rejected')
    ) {
      throw new RunnerSafetyError('ambiguous_execution', 'Presence returned no exact terminal receipt.');
    }
    return {
      request_id: command.request_id,
      task_id: command.task_id,
      action_id: command.action_id,
      status: receipt.status,
      ...(typeof receipt.upstreamStatus === 'number' ? { upstream_status: receipt.upstreamStatus } : {}),
      ...(typeof receipt.detail === 'string' && receipt.detail.trim()
        ? { detail: receipt.detail.replace(/\s+/g, ' ').trim().slice(0, 160) }
        : {})
    };
  }

  private async postReceipt(receipt: RunnerReceipt): Promise<void> {
    await this.bridgeJson(`/ink/codex/commands/${encodeURIComponent(receipt.request_id)}/receipt`, {
      method: 'POST',
      body: { runner_id: this.options.runnerId, ...receipt }
    });
  }

  private bridgeHeaders(): Headers {
    return new Headers({
      'x-ink-token': this.options.bridgeToken,
      'content-type': 'application/json'
    });
  }

  private presenceHeaders(): Headers {
    return new Headers({
      authorization: `Bearer ${this.options.presenceToken}`,
      'content-type': 'application/json'
    });
  }

  private async bridgeJson<T extends object = Record<string, unknown>>(
    path: string,
    options: { method?: 'GET' | 'POST'; body?: unknown } = {}
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.bridgeOrigin}${path}`, {
      method: options.method ?? 'GET',
      headers: this.bridgeHeaders(),
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    });
    const value = await parseJson(response);
    if (!response.ok || value.ok === false) {
      throw new RunnerSafetyError('bridge_rejected', stringError(value, response.status));
    }
    return value as T;
  }

  private async presenceJson<T extends object>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.presenceOrigin}${path}`, {
      headers: this.presenceHeaders()
    });
    const value = await parseJson(response);
    if (!response.ok) throw new RunnerSafetyError('presence_rejected', stringError(value, response.status));
    return value as T;
  }
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    throw new RunnerSafetyError('invalid_response', `Endpoint returned non-JSON status ${response.status}.`);
  }
}

function stringError(value: Record<string, unknown>, status: number): string {
  return typeof value.error === 'string' ? value.error : `Request returned ${status}.`;
}

function cleanOrigin(value: string, field: string): string {
  const normalized = required(value, field).replace(/\/+$/, '');
  const url = new URL(normalized);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new RunnerSafetyError('invalid_origin', `${field} must use HTTPS or loopback.`);
  }
  return url.origin;
}

function cleanLoopbackOrigin(value: string): string {
  const origin = cleanOrigin(value, 'presenceOrigin');
  const url = new URL(origin);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new RunnerSafetyError('public_presence', 'Codex Presence must remain on loopback.');
  }
  return origin;
}

function required(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new RunnerSafetyError('invalid_config', `${field} is required.`);
  return normalized;
}

function simpleId(value: string, field: string): string {
  const normalized = required(value, field);
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(normalized)) {
    throw new RunnerSafetyError('invalid_config', `${field} is invalid.`);
  }
  return normalized;
}
