import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type CodexAppServerChildProcess = {
  stdin: Writable;
  stdout: Readable;
  once(event: 'error', listener: (error: Error) => void): unknown;
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  kill(signal?: NodeJS.Signals | number): boolean | undefined;
};

export type CodexAppServerSpawn = (
  command: string,
  args: string[],
  options: { stdio: 'pipe'; windowsHide: boolean }
) => CodexAppServerChildProcess;

export type CreateCodexAppServerStdioRpcOptions = {
  command?: string;
  spawn?: CodexAppServerSpawn;
};

export type CodexAppServerNotification = {
  method: string;
  params: unknown;
};

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
};

function defaultSpawn(
  command: string,
  args: string[],
  options: { stdio: 'pipe'; windowsHide: boolean }
): ChildProcessWithoutNullStreams {
  return spawn(command, args, options);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * One local JSON-RPC 2.0 connection to `codex app-server --stdio`.
 * Constructing this object starts a child process, so callers must keep it
 * behind a separate explicit operator dispatch action.
 */
export class CodexAppServerStdioRpc {
  private closed = false;
  private readonly lineReader;
  private readonly notificationListeners = new Set<(notification: CodexAppServerNotification) => void>();
  private nextId = 0;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(private readonly child: CodexAppServerChildProcess) {
    this.lineReader = createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.lineReader.on('line', (line) => this.handleLine(line));
    child.once('error', () => this.failPending(new Error('Codex App Server process failed.')));
    child.once('exit', () => this.failPending(new Error('Codex App Server process exited.')));
  }

  request(method: string, params: unknown): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('Codex App Server RPC is closed.'));
    const id = String(++this.nextId);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = JSON.stringify({ jsonrpc: '2.0', id: Number(id), method, params });
      this.child.stdin.write(`${payload}\n`, (error) => {
        if (!error) return;
        this.pending.delete(id);
        reject(new Error('Codex App Server request could not be written.'));
      });
    });
  }

  subscribe(listener: (notification: CodexAppServerNotification) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.lineReader.close();
    this.failPending(new Error('Codex App Server RPC was closed.'));
    this.child.kill();
  }

  private handleLine(line: string): void {
    let message: Record<string, unknown> | null = null;
    try {
      message = asRecord(JSON.parse(line));
    } catch {
      return;
    }
    if (!message) return;
    if (typeof message.method === 'string' && !Object.hasOwn(message, 'id')) {
      for (const listener of this.notificationListeners) {
        listener({ method: message.method, params: message.params });
      }
      return;
    }
    if (typeof message.id !== 'string' && typeof message.id !== 'number') return;
    const pending = this.pending.get(String(message.id));
    if (!pending) return;
    this.pending.delete(String(message.id));
    if (Object.hasOwn(message, 'error')) {
      const error = asRecord(message.error);
      const detail = error && typeof error.message === 'string'
        ? error.message
        : 'Codex App Server returned an RPC error.';
      pending.reject(new Error(detail));
      return;
    }
    if (!Object.hasOwn(message, 'result')) {
      pending.reject(new Error('Codex App Server returned an invalid RPC response.'));
      return;
    }
    pending.resolve(message.result);
  }

  private failPending(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

export function createCodexAppServerStdioRpc(
  options: CreateCodexAppServerStdioRpcOptions = {}
): CodexAppServerStdioRpc {
  const run = options.spawn ?? defaultSpawn;
  const child = run(options.command ?? 'codex', ['app-server', '--stdio'], {
    stdio: 'pipe',
    windowsHide: true
  });
  return new CodexAppServerStdioRpc(child);
}
