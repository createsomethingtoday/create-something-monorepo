import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function resolveCtxCommand({
  home = homedir(),
  configured = process.env.CTX_BIN,
  exists = existsSync
}: {
  home?: string;
  configured?: string;
  exists?: (path: string) => boolean;
} = {}): string {
  if (configured) return configured;
  const userLocal = join(home, '.local', 'bin', 'ctx');
  return exists(userLocal) ? userLocal : 'ctx';
}

export type CtxHistoryResult = {
  sessionId: string;
  provider: string;
};

export type CtxHistoryResponse = {
  status: 'available' | 'empty' | 'unavailable';
  results: CtxHistoryResult[];
};

export async function searchCtxHistory(options: {
  workspaceRoot: string;
  query: string;
  command?: string;
}): Promise<CtxHistoryResponse> {
  const query = options.query.trim();
  if (!query || query.length > 200) return { status: 'empty', results: [] };
  try {
    const { stdout } = await execFileAsync(options.command ?? resolveCtxCommand(), [
      'search', query, '--workspace', options.workspaceRoot, '--limit', '5', '--refresh', 'off', '--format', 'json'
    ], { timeout: 10_000, maxBuffer: 128 * 1024 });
    const data: unknown = JSON.parse(stdout);
    if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) {
      return { status: 'unavailable', results: [] };
    }
    const results = data.results.slice(0, 5).flatMap((item: unknown): CtxHistoryResult[] => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (typeof record.ctx_session_id !== 'string' ||
          typeof record.provider !== 'string') return [];
      const sessionId = record.ctx_session_id;
      const provider = record.provider;
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(sessionId) ||
          !/^(?:codex|claude|pi|cursor|goose|warp|copilot-cli|opencode)$/.test(provider)) return [];
      return [{ sessionId, provider }];
    });
    return { status: results.length > 0 ? 'available' : 'empty', results };
  } catch {
    return { status: 'unavailable', results: [] };
  }
}
