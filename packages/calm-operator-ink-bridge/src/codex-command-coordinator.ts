import {
  CodexCommandError,
  claimCodexCommand,
  completeCodexCommand,
  createCodexCommand,
  expireCodexCommand,
  normalizeCodexSnapshot,
  toDeviceCodexView,
  type CodexCommand,
  type CodexSnapshot,
  type CompleteCodexCommandInput,
  type CreateCodexCommandInput
} from './codex-commands.js';

export interface CodexCommandStorage {
  getSnapshot(deviceId: string): Promise<CodexSnapshot | null>;
  putSnapshot(snapshot: CodexSnapshot): Promise<void>;
  getCommand(requestId: string): Promise<CodexCommand | null>;
  findCommandByNonce(deviceId: string, deviceNonce: string): Promise<CodexCommand | null>;
  latestCommand(deviceId: string): Promise<CodexCommand | null>;
  nextQueuedCommand(runnerId: string, now: number): Promise<CodexCommand | null>;
  putCommand(command: CodexCommand): Promise<void>;
}

export type CodexCommandCoordinatorOptions = {
  now?: () => number;
  requestId?: () => string;
};

export class CodexCommandCoordinator {
  private readonly now: () => number;
  private readonly requestId: () => string;

  constructor(
    private readonly storage: CodexCommandStorage,
    options: CodexCommandCoordinatorOptions = {}
  ) {
    this.now = options.now ?? (() => Date.now());
    this.requestId = options.requestId ?? (() => crypto.randomUUID());
  }

  async publishSnapshot(input: unknown): Promise<CodexSnapshot> {
    const snapshot = normalizeCodexSnapshot(input, this.now());
    await this.storage.putSnapshot(snapshot);
    return snapshot;
  }

  async deviceView(deviceIdInput: string) {
    const deviceId = simpleId(deviceIdInput, 'device_id');
    const [snapshot, latest] = await Promise.all([
      this.storage.getSnapshot(deviceId),
      this.storage.latestCommand(deviceId)
    ]);
    const command = latest ? expireCodexCommand(latest, this.now()) : null;
    if (latest && command && latest.status !== command.status) await this.storage.putCommand(command);
    return toDeviceCodexView(snapshot, command, this.now());
  }

  async createCommand(input: CreateCodexCommandInput): Promise<CodexCommand> {
    const deviceId = simpleId(input.device_id, 'device_id');
    const deviceNonce = simpleId(input.device_nonce, 'device_nonce', 160);
    const replay = await this.storage.findCommandByNonce(deviceId, deviceNonce);
    if (replay) return replay;

    const snapshot = await this.storage.getSnapshot(deviceId);
    if (!snapshot) {
      throw new CodexCommandError('offline', 409, 'No Codex runner snapshot is available.');
    }
    const command = createCodexCommand(input, snapshot, this.now(), this.requestId);
    await this.storage.putCommand(command);
    return command;
  }

  async nextCommand(runnerIdInput: string): Promise<CodexCommand | null> {
    const runnerId = simpleId(runnerIdInput, 'runner_id');
    return this.storage.nextQueuedCommand(runnerId, this.now());
  }

  async claimCommand(requestIdInput: string, runnerIdInput: string): Promise<CodexCommand> {
    const requestId = simpleId(requestIdInput, 'request_id');
    const runnerId = simpleId(runnerIdInput, 'runner_id');
    const command = await this.requireCommand(requestId);
    const claimed = claimCodexCommand(command, runnerId, this.now());
    await this.storage.putCommand(claimed);
    return claimed;
  }

  async completeCommand(
    requestIdInput: string,
    runnerIdInput: string,
    input: CompleteCodexCommandInput
  ): Promise<CodexCommand> {
    const requestId = simpleId(requestIdInput, 'request_id');
    const runnerId = simpleId(runnerIdInput, 'runner_id');
    const command = await this.requireCommand(requestId);
    const completed = completeCodexCommand(command, runnerId, input, this.now());
    await this.storage.putCommand(completed);
    return completed;
  }

  async deviceCommand(requestIdInput: string, deviceIdInput: string): Promise<CodexCommand> {
    const requestId = simpleId(requestIdInput, 'request_id');
    const deviceId = simpleId(deviceIdInput, 'device_id');
    const command = expireCodexCommand(await this.requireCommand(requestId), this.now());
    if (command.device_id !== deviceId) {
      throw new CodexCommandError('wrong_device', 403, 'The command belongs to another device.');
    }
    return command;
  }

  private async requireCommand(requestId: string): Promise<CodexCommand> {
    const command = await this.storage.getCommand(requestId);
    if (!command) throw new CodexCommandError('not_found', 404, 'Command not found.');
    return command;
  }
}

export class MemoryCodexCommandStorage implements CodexCommandStorage {
  private readonly snapshots = new Map<string, CodexSnapshot>();
  private readonly commands = new Map<string, CodexCommand>();

  async getSnapshot(deviceId: string): Promise<CodexSnapshot | null> {
    return this.snapshots.get(deviceId) ?? null;
  }

  async putSnapshot(snapshot: CodexSnapshot): Promise<void> {
    this.snapshots.set(snapshot.device_id, structuredClone(snapshot));
  }

  async getCommand(requestId: string): Promise<CodexCommand | null> {
    return clone(this.commands.get(requestId));
  }

  async findCommandByNonce(deviceId: string, deviceNonce: string): Promise<CodexCommand | null> {
    return clone(
      [...this.commands.values()].find(
        (command) => command.device_id === deviceId && command.device_nonce === deviceNonce
      )
    );
  }

  async latestCommand(deviceId: string): Promise<CodexCommand | null> {
    return clone(
      [...this.commands.values()]
        .filter((command) => command.device_id === deviceId)
        .sort((left, right) => right.created_at - left.created_at)[0]
    );
  }

  async nextQueuedCommand(runnerId: string, now: number): Promise<CodexCommand | null> {
    const candidates = [...this.commands.values()]
      .filter(
        (command) =>
          command.runner_id === runnerId &&
          command.status === 'queued' &&
          command.expires_at > now
      )
      .sort((left, right) => left.created_at - right.created_at);
    return clone(candidates[0]);
  }

  async putCommand(command: CodexCommand): Promise<void> {
    this.commands.set(command.request_id, structuredClone(command));
  }
}

function clone<T>(value: T | undefined): T | null {
  return value === undefined ? null : structuredClone(value);
}

function simpleId(value: unknown, field: string, maximum = 128): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (
    !normalized ||
    normalized.length > maximum ||
    !/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(normalized)
  ) {
    throw new CodexCommandError('invalid_input', 400, `${field} is invalid.`);
  }
  return normalized;
}
