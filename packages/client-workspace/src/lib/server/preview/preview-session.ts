import { spawn, type ChildProcess } from 'node:child_process';

import type { ResolvedWorkspaceDefinition } from '../workspaces/registry.js';

export type PreviewState = 'idle' | 'starting' | 'ready' | 'blocked' | 'crashed' | 'stopped';

export type PublicPreviewStatus = {
  state: PreviewState;
  previewPath: string;
  startedAt?: string;
};

export type PreviewSessionErrorCode =
  | 'preview_crashed'
  | 'preview_method_not_allowed'
  | 'preview_not_ready'
  | 'preview_path_escape'
  | 'preview_timeout';

export class PreviewSessionError extends Error {
  readonly code: PreviewSessionErrorCode;

  constructor(code: PreviewSessionErrorCode, message: string) {
    super(message);
    this.name = 'PreviewSessionError';
    this.code = code;
  }
}

export type PreviewSessionOptions = {
  workspace: Readonly<ResolvedWorkspaceDefinition>;
  readinessTimeoutMs?: number;
  now?: () => Date;
};

const SAFE_PROXY_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-encoding',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified'
] as const;

const SAFE_PROXY_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'range'
] as const;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function previewEnvironment(previewPath: string): NodeJS.ProcessEnv {
  const allowed: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: process.env.LANG,
    TERM: process.env.TERM,
    NODE_ENV: 'development',
    CLIENT_WORKSPACE_PREVIEW_BASE: previewPath.replace(/\/$/, '')
  };
  return Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
}

export class PreviewSession {
  readonly #workspace: Readonly<ResolvedWorkspaceDefinition>;
  readonly #readinessTimeoutMs: number;
  readonly #now: () => Date;
  readonly #previewPath: string;
  #state: PreviewState = 'idle';
  #startedAt: string | undefined;
  #child: ChildProcess | undefined;
  #exited = false;

  constructor(options: PreviewSessionOptions) {
    this.#workspace = options.workspace;
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? 30_000;
    this.#now = options.now ?? (() => new Date());
    this.#previewPath = `/api/workspaces/${encodeURIComponent(options.workspace.id)}/preview`;
  }

  status(): PublicPreviewStatus {
    return {
      state: this.#state,
      previewPath: this.#previewPath,
      ...(this.#startedAt ? { startedAt: this.#startedAt } : {})
    };
  }

  async start(): Promise<PublicPreviewStatus> {
    if (this.#state === 'ready') return this.status();
    this.#state = 'starting';
    this.#startedAt = this.#now().toISOString();
    this.#exited = false;

    const preview = this.#workspace.preview;
    const child = spawn(preview.command, preview.args, {
      cwd: this.#workspace.sourceRoot,
      env: previewEnvironment(this.#previewPath),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    this.#child = child;
    child.stdout?.resume();
    child.stderr?.resume();
    child.once('exit', () => {
      this.#exited = true;
      if (this.#state !== 'stopped' && this.#state !== 'blocked') this.#state = 'crashed';
    });
    child.once('error', () => {
      this.#exited = true;
      if (this.#state !== 'stopped' && this.#state !== 'blocked') this.#state = 'crashed';
    });

    const deadline = Date.now() + this.#readinessTimeoutMs;
    const healthPath = preview.healthPath ?? this.#previewPath;
    while (Date.now() < deadline) {
      if (this.#exited) {
        throw new PreviewSessionError('preview_crashed', 'The declared preview process exited.');
      }
      try {
        const response = await fetch(`http://127.0.0.1:${preview.port}${healthPath}`, {
          signal: AbortSignal.timeout(250)
        });
        if (response.ok) {
          await response.body?.cancel();
          this.#state = 'ready';
          return this.status();
        }
      } catch {
        // The process may still be booting; retry only until the declared deadline.
      }
      await delay(25);
    }

    this.#state = 'blocked';
    child.kill('SIGTERM');
    throw new PreviewSessionError('preview_timeout', 'The declared preview did not become ready.');
  }

  async proxy(request: Request): Promise<Response> {
    if (this.#state !== 'ready') {
      throw new PreviewSessionError('preview_not_ready', 'Preview is not ready.');
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      throw new PreviewSessionError(
        'preview_method_not_allowed',
        'Preview proxy accepts only GET and HEAD.'
      );
    }
    const incoming = new URL(request.url);
    if (
      incoming.pathname !== this.#previewPath &&
      !incoming.pathname.startsWith(`${this.#previewPath}/`)
    ) {
      throw new PreviewSessionError('preview_path_escape', 'Preview path is outside this workspace.');
    }

    const target = new URL(
      `${incoming.pathname}${incoming.search}`,
      `http://127.0.0.1:${this.#workspace.preview.port}`
    );
    const headers = new Headers();
    for (const name of SAFE_PROXY_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(target, { method: request.method, headers });
    const responseHeaders = new Headers();
    for (const name of SAFE_PROXY_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  }

  close(): void {
    if (this.#state === 'stopped') return;
    this.#state = 'stopped';
    this.#child?.kill('SIGTERM');
    this.#child = undefined;
  }
}
