import type { CodexCommandStorage } from './codex-command-coordinator.js';
import type { CodexCommand, CodexSnapshot } from './codex-commands.js';

export class SqlCodexCommandStorage implements CodexCommandStorage {
  constructor(private readonly sql: SqlStorage) {}

  async getSnapshot(deviceId: string): Promise<CodexSnapshot | null> {
    const row = this.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT payload_json FROM codex_snapshots WHERE device_id = ? LIMIT 1`,
        deviceId
      )
      .toArray()[0];
    return row ? parseSnapshot(row.payload_json) : null;
  }

  async putSnapshot(snapshot: CodexSnapshot): Promise<void> {
    this.sql.exec(
      `INSERT OR REPLACE INTO codex_snapshots
        (device_id, runner_id, expires_at, payload_json)
       VALUES (?, ?, ?, ?)`,
      snapshot.device_id,
      snapshot.runner_id,
      snapshot.expires_at,
      JSON.stringify(snapshot)
    );
  }

  async getCommand(requestId: string): Promise<CodexCommand | null> {
    return this.oneCommand(`request_id = ?`, requestId);
  }

  async findCommandByNonce(deviceId: string, deviceNonce: string): Promise<CodexCommand | null> {
    return this.oneCommand(`device_id = ? AND device_nonce = ?`, deviceId, deviceNonce);
  }

  async latestCommand(deviceId: string): Promise<CodexCommand | null> {
    const row = this.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT payload_json FROM codex_commands
         WHERE device_id = ? ORDER BY created_at DESC LIMIT 1`,
        deviceId
      )
      .toArray()[0];
    return row ? parseCommand(row.payload_json) : null;
  }

  async nextQueuedCommand(runnerId: string, now: number): Promise<CodexCommand | null> {
    const row = this.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT payload_json FROM codex_commands
         WHERE runner_id = ? AND status = 'queued' AND expires_at > ?
         ORDER BY created_at ASC LIMIT 1`,
        runnerId,
        now
      )
      .toArray()[0];
    return row ? parseCommand(row.payload_json) : null;
  }

  async putCommand(command: CodexCommand): Promise<void> {
    this.sql.exec(
      `INSERT OR REPLACE INTO codex_commands
        (request_id, runner_id, device_id, device_nonce, status, created_at, expires_at, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      command.request_id,
      command.runner_id,
      command.device_id,
      command.device_nonce,
      command.status,
      command.created_at,
      command.expires_at,
      JSON.stringify(command)
    );
  }

  private oneCommand(where: string, ...values: SqlStorageValue[]): CodexCommand | null {
    const row = this.sql
      .exec<Record<string, SqlStorageValue>>(
        `SELECT payload_json FROM codex_commands WHERE ${where} LIMIT 1`,
        ...values
      )
      .toArray()[0];
    return row ? parseCommand(row.payload_json) : null;
  }
}

export function parseSnapshot(value: SqlStorageValue | unknown): CodexSnapshot {
  return JSON.parse(String(value ?? '{}')) as CodexSnapshot;
}

export function parseCommand(value: SqlStorageValue | unknown): CodexCommand {
  return JSON.parse(String(value ?? '{}')) as CodexCommand;
}
