import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

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

const PRIVATE_MODULE_PREFIX = '/__preview_module__/';

function isTextResponse(contentType: string | null): boolean {
  if (!contentType) return false;
  return (
    contentType.startsWith('text/') ||
    contentType.includes('javascript') ||
    contentType.includes('json') ||
    contentType.includes('xml')
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === '' ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot))
  );
}

function contentType(path: string): string {
  const extension = path.toLowerCase().split('.').pop();
  return (
    (
      {
        html: 'text/html; charset=utf-8',
        css: 'text/css; charset=utf-8',
        js: 'text/javascript; charset=utf-8',
        json: 'application/json; charset=utf-8',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        ico: 'image/x-icon',
        woff: 'font/woff',
        woff2: 'font/woff2'
      } as Record<string, string>
    )[extension ?? ''] ?? 'application/octet-stream'
  );
}

function rewriteStaticHtml(rawHtml: string, previewPath: string): string {
  const prefix = `${previewPath.replace(/\/$/, '')}/`;
  return rawHtml
    .replace(/(\s(?:href|src|poster)=["'])\/(?!\/)/gi, `$1${prefix}`)
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, `url($1${prefix}`);
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
  readonly #privateModuleTokens = new Map<string, string>();
  readonly #privateModulePaths = new Map<string, string>();

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
    if (preview.kind === 'static') {
      this.#state = 'ready';
      return this.status();
    }
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
      throw new PreviewSessionError(
        'preview_path_escape',
        'Preview path is outside this workspace.'
      );
    }

    if (this.#workspace.preview.kind === 'static') {
      return await this.#staticResponse(incoming, request.method);
    }

    const targetPath = this.#resolveProxyPath(incoming.pathname);
    const target = new URL(
      `${targetPath}${incoming.search}`,
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
    let body: BodyInit | null = request.method === 'HEAD' ? null : upstream.body;
    if (request.method === 'GET' && isTextResponse(upstream.headers.get('content-type'))) {
      body = this.#sanitizePreviewBody(await upstream.text(), targetPath);
      responseHeaders.delete('content-length');
      responseHeaders.delete('content-encoding');
    }
    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  }

  async #staticResponse(incoming: URL, method: string): Promise<Response> {
    const preview = this.#workspace.preview;
    if (preview.kind !== 'static') {
      throw new PreviewSessionError('preview_not_ready', 'Static preview is unavailable.');
    }
    const root = resolve(this.#workspace.sourceRoot, preview.root);
    let suffix = incoming.pathname.slice(this.#previewPath.length).replace(/^\/+/, '');
    try {
      suffix = decodeURIComponent(suffix);
    } catch {
      throw new PreviewSessionError('preview_path_escape', 'Preview path is invalid.');
    }
    const relativePath = suffix === '' ? preview.entry : suffix;
    const target = resolve(root, relativePath);
    if (!isWithin(root, target)) {
      throw new PreviewSessionError(
        'preview_path_escape',
        'Preview path is outside this workspace.'
      );
    }
    try {
      const realRoot = await realpath(root);
      const realTarget = await realpath(target);
      if (!isWithin(realRoot, realTarget)) {
        throw new PreviewSessionError(
          'preview_path_escape',
          'Preview file resolves outside this workspace.'
        );
      }
      if (!(await stat(realTarget)).isFile()) return new Response('Not found', { status: 404 });
      let body: BodyInit | null = method === 'HEAD' ? null : await readFile(realTarget);
      const type = contentType(target);
      if (method === 'GET' && type.startsWith('text/html')) {
        const html = rewriteStaticHtml((body as Buffer).toString('utf8'), this.#previewPath);
        const base = `<base href="${this.#previewPath}/">`;
        body = html.includes('<head>') ? html.replace('<head>', `<head>${base}`) : `${base}${html}`;
      }
      return new Response(body, {
        headers: {
          'cache-control': 'no-store',
          'content-type': type,
          'content-security-policy':
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'",
          'x-content-type-options': 'nosniff'
        }
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return new Response('Not found', { status: 404 });
      throw error;
    }
  }

  #resolveProxyPath(pathname: string): string {
    const tokenPrefix = `${this.#previewPath}${PRIVATE_MODULE_PREFIX}`;
    if (pathname.startsWith(tokenPrefix)) {
      const token = pathname.slice(tokenPrefix.length);
      if (!/^[a-f0-9-]{36}$/.test(token)) {
        throw new PreviewSessionError('preview_path_escape', 'Preview module token is invalid.');
      }
      const privatePath = this.#privateModulePaths.get(token);
      if (!privatePath) {
        throw new PreviewSessionError('preview_path_escape', 'Preview module token is unknown.');
      }
      return `${this.#previewPath}${privatePath}`;
    }
    if (pathname.startsWith(`${this.#previewPath}/@fs/`)) {
      throw new PreviewSessionError(
        'preview_path_escape',
        'Direct preview module paths are unavailable.'
      );
    }
    return pathname;
  }

  #sanitizePreviewBody(rawBody: string, targetPath: string): string {
    let tokenized = rawBody.replace(/\/@fs\/[^"'`\s<>()\\]+/g, (rawPath) => {
      const suffixIndex = rawPath.search(/[?#]/);
      const privatePath = suffixIndex === -1 ? rawPath : rawPath.slice(0, suffixIndex);
      const suffix = suffixIndex === -1 ? '' : rawPath.slice(suffixIndex);
      let token = this.#privateModuleTokens.get(privatePath);
      if (!token) {
        token = crypto.randomUUID();
        this.#privateModuleTokens.set(privatePath, token);
        this.#privateModulePaths.set(token, privatePath);
      }
      return `${PRIVATE_MODULE_PREFIX}${token}${suffix}`;
    });
    if (targetPath.endsWith('/@vite/client')) {
      tokenized = tokenized
        .replaceAll('console.debug("[vite] connecting...");', '')
        .replaceAll(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* Live HMR is disabled at the authenticated preview boundary. */'
        );
    }
    return tokenized
      .replaceAll(this.#workspace.sourceRoot, '[workspace]')
      .replaceAll(`/app/seed/${this.#workspace.id}`, '[workspace-dependency]')
      .replaceAll(
        `127.0.0.1:${this.#workspace.preview.kind === 'static' ? 0 : this.#workspace.preview.port}`,
        'preview.internal'
      )
      .replaceAll(
        `localhost:${this.#workspace.preview.kind === 'static' ? 0 : this.#workspace.preview.port}`,
        'preview.internal'
      );
  }

  close(): void {
    if (this.#state === 'stopped') return;
    this.#state = 'stopped';
    this.#child?.kill('SIGTERM');
    this.#child = undefined;
    this.#privateModuleTokens.clear();
    this.#privateModulePaths.clear();
  }
}
