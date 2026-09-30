import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { promisify } from 'node:util';

import { Data, Effect, Either } from 'effect';

const execFileAsync = promisify(execFile);
const SCOPED_CONFIG = '[indexing]\nmode = "manual"\n[sources]\nautomatic = false\n[upgrade]\nauto = "off"\n';

export class CtxError extends Data.TaggedError('CtxError')<{
  readonly operation: 'search' | 'import';
  readonly reason: 'invalid_configuration' | 'missing_dependency' | 'unavailable' | 'invalid_readback' | 'cancelled';
  readonly cause?: unknown;
}> {}

export interface CtxOptions {
  /** Dedicated GiGi store. Never point this at the operator's default CTX index. */
  dataRoot: string;
  /** Only files staged under this directory may be imported. */
  importRoot?: string;
  binary?: string;
  sourceId?: string;
}

export interface CtxHit {
  sessionId: string;
  provider: string;
  snippet: string;
}

export interface CtxClient {
  search(query: string, options?: { limit?: number; signal?: AbortSignal }): Promise<CtxHit[]>;
  importHistory(path: string, signal?: AbortSignal): Promise<void>;
}

export function createCtxClient(options: CtxOptions): CtxClient {
  const { dataRoot, importRoot, sourceId } = options;
  if (!dataRoot || !dataRoot.startsWith('/') || (importRoot && !importRoot.startsWith('/')) ||
    (sourceId && !/^[A-Za-z0-9._:-]{1,100}$/u.test(sourceId))) {
    throw new CtxError({ operation: 'search', reason: 'invalid_configuration' });
  }
  const binary = options.binary || 'ctx';

  async function run(operation: 'search' | 'import', args: string[], signal?: AbortSignal): Promise<string> {
    const effect = Effect.tryPromise({
      try: async () => {
        await configureScopedRoot(dataRoot);
        const runtimeHome = join(dataRoot, 'runtime-home');
        await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
        await chmod(runtimeHome, 0o700);
        const result = await execFileAsync(binary, [operation, '--data-root', dataRoot, ...args], {
          timeout: operation === 'search' ? 10_000 : 30_000,
          maxBuffer: 256 * 1024,
          signal,
          env: {
            PATH: process.env.PATH,
            HOME: runtimeHome,
            XDG_CONFIG_HOME: join(runtimeHome, '.config'),
            XDG_DATA_HOME: join(runtimeHome, '.local', 'share'),
            XDG_STATE_HOME: join(runtimeHome, '.local', 'state'),
            XDG_CACHE_HOME: join(runtimeHome, '.cache'),
            CODEX_HOME: join(runtimeHome, '.codex'),
            CLAUDE_CONFIG_DIR: join(runtimeHome, '.claude'),
            CURSOR_CONFIG_DIR: join(runtimeHome, '.cursor'),
            GEMINI_CLI_HOME: join(runtimeHome, '.gemini'),
            LANG: process.env.LANG ?? 'en_US.UTF-8',
            CTX_DATA_ROOT: dataRoot,
            CTX_DAEMON_ENABLED: 'false',
            CTX_UPGRADE_AUTO: 'off',
            CTX_ANALYTICS_ENABLED: 'false',
            CTX_LOCAL_USAGE_ENABLED: 'false',
            CTX_SEARCH_SEMANTIC: 'false',
          },
          cwd: runtimeHome,
        });
        return result.stdout;
      },
      catch: (cause) => {
        if (cause instanceof CtxError) return cause;
        const error = cause as NodeJS.ErrnoException;
        const reason = signal?.aborted ? 'cancelled' : error?.code === 'ENOENT' ? 'missing_dependency' : 'unavailable';
        return new CtxError({ operation, reason, cause });
      },
    });
    const outcome = await Effect.runPromise(Effect.either(effect));
    if (Either.isLeft(outcome)) throw outcome.left;
    return outcome.right;
  }

  return {
    async search(query, searchOptions = {}) {
      const normalized = query.trim();
      if (!normalized || normalized.length > 200) throw new CtxError({ operation: 'search', reason: 'invalid_configuration' });
      const limit = searchOptions.limit ?? 5;
      if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new CtxError({ operation: 'search', reason: 'invalid_configuration' });
      const args = [normalized, '--limit', String(limit), '--refresh', 'off', '--backend', 'lexical', '--format', 'json'];
      args.push('--provider-key', 'gigi-local');
      if (sourceId) args.push('--source-id', sourceId);
      const stdout = await run('search', args, searchOptions.signal);
      let parsed: unknown;
      try { parsed = JSON.parse(stdout); } catch { throw new CtxError({ operation: 'search', reason: 'invalid_readback' }); }
      if (!parsed || typeof parsed !== 'object' || !('results' in parsed) || !Array.isArray(parsed.results)) {
        throw new CtxError({ operation: 'search', reason: 'invalid_readback' });
      }
      return parsed.results.slice(0, limit).flatMap((item: unknown): CtxHit[] => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        if (typeof row.ctx_session_id !== 'string' || typeof row.provider !== 'string' || typeof row.snippet !== 'string') return [];
        if (!/^[A-Za-z0-9_-]{1,100}$/u.test(row.ctx_session_id)) return [];
        return [{ sessionId: row.ctx_session_id, provider: row.provider.slice(0, 40), snippet: row.snippet.slice(0, 500) }];
      });
    },
    async importHistory(path, signal) {
      if (!importRoot) throw new CtxError({ operation: 'import', reason: 'invalid_configuration' });
      let root: string;
      let source: string;
      try { [root, source] = await Promise.all([realpath(importRoot), realpath(path)]); }
      catch { throw new CtxError({ operation: 'import', reason: 'invalid_configuration' }); }
      if (!source.startsWith(root + sep) || !source.endsWith('.jsonl')) {
        throw new CtxError({ operation: 'import', reason: 'invalid_configuration' });
      }
      const stdout = await run('import', ['--path', source, '--input-format', 'ctx-history-jsonl-v2', '--format', 'json'], signal);
      let receipt: unknown;
      try { receipt = JSON.parse(stdout); } catch { throw new CtxError({ operation: 'import', reason: 'invalid_readback' }); }
      if (!receipt || typeof receipt !== 'object') throw new CtxError({ operation: 'import', reason: 'invalid_readback' });
      const data = receipt as Record<string, unknown>;
      const totals = data.totals as Record<string, unknown> | undefined;
      if (data.schema_version !== 2 || data.outcome !== 'success' || data.failure_scope !== 'none' ||
          !Array.isArray(data.sources) || data.sources.length !== 1 || !['published', 'success'].includes(data.sources[0]?.status) ||
          !totals || typeof totals.current_indexed_documents !== 'number' || totals.current_indexed_documents < 1 ||
          totals.current_rejected_records !== 0 || totals.failed_sources !== 0) {
        throw new CtxError({ operation: 'import', reason: 'invalid_readback' });
      }
    },
  };
}

async function configureScopedRoot(dataRoot: string): Promise<void> {
  await mkdir(dataRoot, { recursive: true, mode: 0o700 });
  await chmod(dataRoot, 0o700);
  const path = join(dataRoot, 'config.toml');
  let content: string;
  try { content = await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const entries = await readdir(dataRoot);
    if (entries.length > 0) throw new CtxError({ operation: 'import', reason: 'invalid_configuration' });
    await writeFile(path, SCOPED_CONFIG, { mode: 0o600, flag: 'wx' });
    content = SCOPED_CONFIG;
  }
  if (content !== SCOPED_CONFIG) throw new CtxError({ operation: 'import', reason: 'invalid_configuration' });
}
