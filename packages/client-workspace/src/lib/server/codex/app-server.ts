import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import readline from 'node:readline';

import type {
  CodexConnection,
  CodexServerMessage,
  StartThreadOptions,
  StartTurnOptions
} from '../sessions/workspace-session.js';

type JsonRpcResponse = {
  id?: number | string;
  result?: unknown;
  error?: unknown;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export type ConnectCodexAppServerOptions = {
  command?: string;
  args?: string[];
  requestTimeoutMs?: number;
  environment?: NodeJS.ProcessEnv;
  ephemeralAuthFile?: string;
};

export class CodexAppServerError extends Error {
  readonly code: 'connection_closed' | 'invalid_response' | 'request_failed' | 'request_timeout';

  constructor(
    code: 'connection_closed' | 'invalid_response' | 'request_failed' | 'request_timeout',
    message: string
  ) {
    super(message);
    this.name = 'CodexAppServerError';
    this.code = code;
  }
}

class CodexAppServerConnection implements CodexConnection {
  readonly #process: ChildProcessWithoutNullStreams;
  readonly #stdout: readline.Interface;
  readonly #stderr: readline.Interface;
  readonly #pending = new Map<number, PendingRequest>();
  readonly #requestTimeoutMs: number;
  #nextRequestId = 1;
  #closed = false;
  #listener: ((message: CodexServerMessage) => void) | undefined;

  constructor(process: ChildProcessWithoutNullStreams, requestTimeoutMs: number) {
    this.#process = process;
    this.#requestTimeoutMs = requestTimeoutMs;
    this.#stdout = readline.createInterface({ input: process.stdout });
    this.#stderr = readline.createInterface({ input: process.stderr });
    this.#stderr.on('line', () => {
      // Drain stderr without forwarding provider, credential, or local-path details to callers.
    });
    this.#stdout.on('line', (line) => this.#handleLine(line));
    this.#process.once('exit', () => this.#handleExit());
    this.#process.once('error', () => this.#handleExit());
  }

  onMessage(listener: (message: CodexServerMessage) => void): void {
    this.#listener = listener;
  }

  async initialize(): Promise<void> {
    await this.#request('initialize', {
      clientInfo: {
        name: 'create_something_client_workspace',
        title: 'CREATE SOMETHING Client Workspace',
        version: '0.1.0'
      },
      capabilities: { experimentalApi: true }
    });
    this.#notify('initialized');
  }

  async startThread(options: StartThreadOptions): Promise<{ threadId: string }> {
    const result = asRecord(
      await this.#request('thread/start', {
        cwd: options.cwd,
        model: options.model,
        approvalPolicy: options.approvalPolicy,
        developerInstructions: options.developerInstructions
      })
    );
    const thread = asRecord(result.thread);
    if (typeof thread.id !== 'string' || thread.id === '') {
      throw new CodexAppServerError('invalid_response', 'Codex did not return a thread id.');
    }
    return { threadId: thread.id };
  }

  async startTurn(options: StartTurnOptions): Promise<{ turnId: string }> {
    const result = asRecord(
      await this.#request('turn/start', {
        threadId: options.threadId,
        input: options.input,
        approvalPolicy: options.approvalPolicy,
        sandboxPolicy: options.sandboxPolicy
      })
    );
    const turn = asRecord(result.turn);
    if (typeof turn.id !== 'string' || turn.id === '') {
      throw new CodexAppServerError('invalid_response', 'Codex did not return a turn id.');
    }
    return { turnId: turn.id };
  }

  respond(id: number | string, result: unknown): void {
    this.#write({ id, result });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#stdout.close();
    this.#stderr.close();
    this.#process.kill('SIGTERM');
    this.#rejectPending(
      new CodexAppServerError('connection_closed', 'Codex workspace connection closed.')
    );
  }

  async #request(method: string, params?: unknown): Promise<unknown> {
    if (this.#closed) {
      throw new CodexAppServerError('connection_closed', 'Codex workspace connection is closed.');
    }
    const id = this.#nextRequestId++;
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(new CodexAppServerError('request_timeout', `Codex request timed out: ${method}`));
      }, this.#requestTimeoutMs);
      this.#pending.set(id, { resolve, reject, timeout });
      this.#write({ id, method, params });
    });
  }

  #notify(method: string, params?: unknown): void {
    this.#write(params === undefined ? { method } : { method, params });
  }

  #write(message: unknown): void {
    if (this.#closed) return;
    this.#process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #handleLine(line: string): void {
    let message: JsonRpcResponse & CodexServerMessage;
    try {
      message = JSON.parse(line) as JsonRpcResponse & CodexServerMessage;
    } catch {
      return;
    }

    if (typeof message.id === 'number' && message.method === undefined) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.#pending.delete(message.id);
      if (message.error !== undefined) {
        pending.reject(new CodexAppServerError('request_failed', 'Codex request failed.'));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    this.#listener?.(message);
  }

  #handleExit(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#rejectPending(
      new CodexAppServerError('connection_closed', 'Codex workspace connection ended.')
    );
  }

  #rejectPending(error: Error): void {
    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timeout);
      this.#pending.delete(id);
      pending.reject(error);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function connectCodexAppServer(
  options: ConnectCodexAppServerOptions = {}
): Promise<CodexConnection> {
  const command = options.command ?? 'codex';
  const args = options.args ?? ['app-server', '--stdio'];
  const sourceEnvironment = options.environment ?? process.env;
  const ephemeralAuthFile =
    options.ephemeralAuthFile ?? ephemeralAuthFileFromEnvironment(sourceEnvironment);
  const childProcess = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: processEnvWithoutBrowserLeak(sourceEnvironment, Boolean(ephemeralAuthFile))
  });
  const connection = new CodexAppServerConnection(
    childProcess,
    options.requestTimeoutMs ?? 30_000
  );
  try {
    await connection.initialize();
    await removeEphemeralAuthFile(ephemeralAuthFile);
    return connection;
  } catch (error) {
    connection.close();
    await removeEphemeralAuthFile(ephemeralAuthFile);
    throw error;
  }
}

function ephemeralAuthFileFromEnvironment(environment: NodeJS.ProcessEnv): string | undefined {
  if (environment.CLIENT_WORKSPACE_EPHEMERAL_CODEX_AUTH !== '1') return undefined;
  const codexHome = environment.CODEX_HOME;
  if (!codexHome) {
    throw new CodexAppServerError(
      'request_failed',
      'Codex ephemeral authentication is misconfigured.'
    );
  }
  const resolvedHome = resolve(codexHome);
  if (resolvedHome === '/dev/shm' || !resolvedHome.startsWith('/dev/shm/')) {
    throw new CodexAppServerError(
      'request_failed',
      'Codex ephemeral authentication must use memory-backed storage.'
    );
  }
  return join(resolvedHome, 'auth.json');
}

async function removeEphemeralAuthFile(authFile: string | undefined): Promise<void> {
  if (!authFile) return;
  try {
    await rm(authFile, { force: true });
  } catch {
    throw new CodexAppServerError(
      'request_failed',
      'Codex ephemeral authentication cleanup failed.'
    );
  }
}

function processEnvWithoutBrowserLeak(
  sourceEnvironment: NodeJS.ProcessEnv,
  removeProviderKey: boolean
): NodeJS.ProcessEnv {
  const environment = { ...sourceEnvironment };
  if (removeProviderKey) delete environment.OPENAI_API_KEY;
  return environment;
}
