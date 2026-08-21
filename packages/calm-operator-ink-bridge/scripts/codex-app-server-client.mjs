import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const CHATGPT_CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex';
const PACKAGE_CODEX = fileURLToPath(new URL('../node_modules/.bin/codex', import.meta.url));
const SAFE_CHILD_ENVIRONMENT = new Set([
  'HOME',
  'PATH',
  'USER',
  'LOGNAME',
  'SHELL',
  'TMPDIR',
  'LANG',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'CODEX_HOME',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'XDG_DATA_HOME',
  'NVM_BIN',
  'NVM_DIR',
  'PNPM_HOME',
  'CALM_OPERATOR_WHISPER_MODEL',
  'CALM_OPERATOR_FFMPEG_EXECUTABLE',
  'CALM_OPERATOR_WHISPER_EXECUTABLE'
]);

export function codexAppServerEnvironment(environment = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(environment)) {
    if (
      typeof value === 'string' &&
      value &&
      (SAFE_CHILD_ENVIRONMENT.has(key) || key.startsWith('LC_'))
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

function serverRequestResponse(method) {
  if (
    method === 'item/commandExecution/requestApproval' ||
    method === 'item/fileChange/requestApproval' ||
    method === 'execCommandApproval' ||
    method === 'applyPatchApproval'
  ) {
    return { result: { decision: 'decline' } };
  }
  if (method === 'item/permissions/requestApproval') {
    return { result: { permissions: {}, scope: 'turn' } };
  }
  if (method === 'item/tool/requestUserInput') {
    return { result: { answers: {} } };
  }
  if (method === 'mcpServer/elicitation/request') {
    return { result: { action: 'decline', content: null, _meta: null } };
  }
  return {
    error: {
      code: -32601,
      message: `Calm Operator does not expose the ${method} server request.`
    }
  };
}

export class CodexJsonlRpcClient {
  #output;
  #closeTransport;
  #requestTimeoutMs;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Set();
  #lines;
  #closed = false;

  constructor({ input, output, close, requestTimeoutMs = 30_000 }) {
    this.#output = output;
    this.#closeTransport = close;
    this.#requestTimeoutMs = Math.max(1_000, Number(requestTimeoutMs) || 30_000);
    this.#lines = readline.createInterface({ input });
    this.#lines.on('line', (line) => this.#receive(line));
    this.#lines.on('close', () => this.#failPending(new Error('Codex app-server closed.')));
  }

  async initialize() {
    await this.request('initialize', {
      clientInfo: {
        name: 'calm_operator_stopwatch',
        title: 'Calm Operator Stopwatch',
        version: '0.1.0'
      },
      capabilities: null
    });
    this.notify('initialized', {});
  }

  request(method, params = {}) {
    if (this.#closed) return Promise.reject(new Error('Codex app-server client is closed.'));
    const id = this.#nextId++;
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(
          new Error(`Codex app-server request ${method} exceeded ${this.#requestTimeoutMs}ms.`)
        );
      }, this.#requestTimeoutMs);
      timeout.unref?.();
      this.#pending.set(id, { resolve, reject, timeout });
    });
    this.#send({ method, id, params });
    return promise;
  }

  notify(method, params = {}) {
    if (this.#closed) return;
    this.#send({ method, params });
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#lines.close();
    this.#failPending(new Error('Codex app-server client closed.'));
    this.#closeTransport?.();
  }

  #send(message) {
    this.#output.write(`${JSON.stringify(message)}\n`);
  }

  #receive(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    if (message && message.id !== undefined && typeof message.method === 'string') {
      const response = serverRequestResponse(message.method);
      this.#send({ id: message.id, ...response });
      return;
    }

    if (message && message.id !== undefined && ('result' in message || 'error' in message)) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) {
        const error = new Error(message.error.message || 'Codex app-server request failed.');
        error.code = message.error.code;
        pending.reject(error);
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (message && typeof message.method === 'string') {
      for (const listener of this.#listeners) listener(message);
    }
  }

  #failPending(error) {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.#pending.clear();
  }
}

export function resolveCodexExecutable(explicitPath = '') {
  if (explicitPath.trim()) return explicitPath.trim();
  if (existsSync(CHATGPT_CODEX)) return CHATGPT_CODEX;
  if (existsSync(PACKAGE_CODEX)) return PACKAGE_CODEX;
  return 'codex';
}

export async function startCodexAppServer({
  executable,
  cwd,
  env = process.env,
  requestTimeoutMs = 30_000
} = {}) {
  const child = spawn(resolveCodexExecutable(executable), ['app-server', '--stdio'], {
    cwd: cwd || process.cwd(),
    env: codexAppServerEnvironment(env),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const client = new CodexJsonlRpcClient({
    input: child.stdout,
    output: child.stdin,
    requestTimeoutMs,
    close: () => child.kill('SIGTERM')
  });
  child.once('error', () => client.close());
  try {
    await client.initialize();
  } catch (error) {
    client.close();
    throw error;
  }
  return client;
}
