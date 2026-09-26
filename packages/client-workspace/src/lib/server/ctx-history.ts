import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CtxHistoryResult = {
  sessionId: string;
  provider: string;
  snippet: string;
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
    const { stdout } = await execFileAsync(options.command ?? 'ctx', [
      'search', query, '--workspace', options.workspaceRoot, '--limit', '5', '--format', 'json'
    ], { timeout: 10_000, maxBuffer: 128 * 1024 });
    const data: unknown = JSON.parse(stdout);
    if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) {
      return { status: 'unavailable', results: [] };
    }
    const results = data.results.slice(0, 5).flatMap((item: unknown): CtxHistoryResult[] => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      if (typeof record.ctx_session_id !== 'string' ||
          typeof record.provider !== 'string' ||
          typeof record.snippet !== 'string') return [];
      return [{
        sessionId: record.ctx_session_id,
        provider: record.provider,
        snippet: record.snippet.slice(0, 500)
      }];
    });
    return { status: results.length > 0 ? 'available' : 'empty', results };
  } catch {
    return { status: 'unavailable', results: [] };
  }
}
