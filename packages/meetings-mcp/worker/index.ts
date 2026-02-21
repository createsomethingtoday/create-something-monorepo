/**
 * Meetings MCP Worker
 * Read-only MCP server for meeting transcript recall.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

import { validateApiKey } from './lib/auth.js';
import {
  VALID_PROPERTIES,
  VALID_STATUSES,
  clampInt,
  makeSnippet,
  normalizeEndDate,
  normalizeFtsQuery,
  normalizeStartDate,
  shapeMeetingRow,
  tokenizeQueryTerms,
  type MeetingProperty,
  type MeetingRow,
  type MeetingStatus,
} from './lib/query.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  MCP_API_KEY?: string;
}

interface SearchRow extends MeetingRow {
  rank: number;
}

const SERVER_NAME = 'meetings';
const SERVER_VERSION = '1.0.0';

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function buildFilterClauses(filters: {
  status?: MeetingStatus;
  property?: MeetingProperty;
  from?: string;
  to?: string;
}): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.property) {
    clauses.push('property = ?');
    params.push(filters.property);
  }

  const fromIso = normalizeStartDate(filters.from);
  if (fromIso) {
    clauses.push('recorded_at >= ?');
    params.push(fromIso);
  }

  const toIso = normalizeEndDate(filters.to);
  if (toIso) {
    clauses.push('recorded_at <= ?');
    params.push(toIso);
  }

  return { clauses, params };
}

function buildSearchFilterClauses(filters: {
  status?: MeetingStatus;
  property?: MeetingProperty;
  from?: string;
  to?: string;
}): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push('m.status = ?');
    params.push(filters.status);
  }

  if (filters.property) {
    clauses.push('m.property = ?');
    params.push(filters.property);
  }

  const fromIso = normalizeStartDate(filters.from);
  if (fromIso) {
    clauses.push('m.recorded_at >= ?');
    params.push(fromIso);
  }

  const toIso = normalizeEndDate(filters.to);
  if (toIso) {
    clauses.push('m.recorded_at <= ?');
    params.push(toIso);
  }

  return { clauses, params };
}

export class MeetingsMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    const db = this.env.DB;

    this.server.resource(
      'meetings-stats',
      'meetings://stats',
      {
        description: 'Aggregate counts and freshness for meeting records.',
        mimeType: 'application/json',
      },
      async () => {
        const totals = await db
          .prepare('SELECT COUNT(*) as total, MAX(recorded_at) as latest_recorded_at, MAX(updated_at) as latest_updated_at FROM meetings')
          .first<{ total: number; latest_recorded_at: string | null; latest_updated_at: string | null }>();

        const byStatus = await db
          .prepare('SELECT status, COUNT(*) as count FROM meetings GROUP BY status ORDER BY count DESC')
          .all<{ status: string; count: number }>();

        const byProperty = await db
          .prepare('SELECT property, COUNT(*) as count FROM meetings WHERE property IS NOT NULL GROUP BY property ORDER BY count DESC')
          .all<{ property: string; count: number }>();

        return {
          contents: [
            {
              uri: 'meetings://stats',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total: totals?.total ?? 0,
                  latest_recorded_at: totals?.latest_recorded_at ?? null,
                  latest_updated_at: totals?.latest_updated_at ?? null,
                  by_status: byStatus.results,
                  by_property: byProperty.results,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    this.server.resource(
      'meetings-recent',
      'meetings://recent',
      {
        description: 'Recent meeting records (metadata only, no transcripts).',
        mimeType: 'application/json',
      },
      async () => {
        const rows = await db
          .prepare('SELECT * FROM meetings ORDER BY recorded_at DESC LIMIT 10')
          .all<MeetingRow>();

        return {
          contents: [
            {
              uri: 'meetings://recent',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  meetings: rows.results.map((row) => shapeMeetingRow(row)),
                  count: rows.results.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    this.server.tool(
      'list_meetings',
      'List recent meetings with optional metadata filters. Read-only.',
      {
        limit: z.number().int().optional().describe('Default 20, max 100.'),
        offset: z.number().int().optional().describe('Default 0.'),
        status: z.enum(VALID_STATUSES).optional(),
        property: z.enum(VALID_PROPERTIES).optional(),
        from: z.string().optional().describe('ISO timestamp or YYYY-MM-DD lower bound.'),
        to: z.string().optional().describe('ISO timestamp or YYYY-MM-DD upper bound.'),
      },
      async ({ limit, offset, status, property, from, to }) => {
        try {
          const safeLimit = clampInt(limit, 20, 1, 100);
          const safeOffset = clampInt(offset, 0, 0, 50000);

          const { clauses, params } = buildFilterClauses({ status, property, from, to });

          let sql = 'SELECT * FROM meetings';
          if (clauses.length > 0) {
            sql += ` WHERE ${clauses.join(' AND ')}`;
          }

          sql += ' ORDER BY recorded_at DESC LIMIT ? OFFSET ?';

          const rows = await db
            .prepare(sql)
            .bind(...params, safeLimit, safeOffset)
            .all<MeetingRow>();

          return textResult({
            meetings: rows.results.map((row) => shapeMeetingRow(row)),
            meta: {
              limit: safeLimit,
              offset: safeOffset,
              count: rows.results.length,
            },
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );

    this.server.tool(
      'get_meeting',
      'Get one meeting by ID. Transcript is opt-in and truncated.',
      {
        meeting_id: z.string().min(1),
        include_transcript: z.boolean().optional().describe('Default false.'),
        max_transcript_chars: z.number().int().optional().describe('Default 8000, max 50000.'),
      },
      async ({ meeting_id, include_transcript = false, max_transcript_chars }) => {
        try {
          const row = await db
            .prepare('SELECT * FROM meetings WHERE id = ?')
            .bind(meeting_id)
            .first<MeetingRow>();

          if (!row) {
            return textResult({ error: `Meeting not found: ${meeting_id}` }, true);
          }

          const maxTranscriptChars = clampInt(max_transcript_chars, 8000, 1, 50000);

          return textResult({
            meeting: shapeMeetingRow(row, {
              includeTranscript: include_transcript,
              maxTranscriptChars,
            }),
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );

    this.server.tool(
      'search_transcripts',
      'Full-text search over transcripts/summaries using D1 FTS. Read-only.',
      {
        query: z.string().min(1),
        limit: z.number().int().optional().describe('Default 10, max 50.'),
        status: z.enum(VALID_STATUSES).optional(),
        property: z.enum(VALID_PROPERTIES).optional(),
        from: z.string().optional().describe('ISO timestamp or YYYY-MM-DD lower bound.'),
        to: z.string().optional().describe('ISO timestamp or YYYY-MM-DD upper bound.'),
        snippet_chars: z.number().int().optional().describe('Default 240, max 2000.'),
      },
      async ({ query, limit, status, property, from, to, snippet_chars }) => {
        try {
          const normalizedQuery = normalizeFtsQuery(query);
          const queryTokens = tokenizeQueryTerms(query);
          const safeLimit = clampInt(limit, 10, 1, 50);
          const safeSnippetChars = clampInt(snippet_chars, 240, 80, 2000);

          const { clauses, params } = buildSearchFilterClauses({ status, property, from, to });
          let searchBackend: 'fts' | 'fallback_like' = 'fts';
          let rows: D1Result<SearchRow>;

          try {
            let sql = `
              SELECT m.*, bm25(meetings_fts) AS rank
              FROM meetings_fts
              JOIN meetings m ON m.id = meetings_fts.id
              WHERE meetings_fts MATCH ?
            `;

            if (clauses.length > 0) {
              sql += ` AND ${clauses.join(' AND ')}`;
            }

            sql += ' ORDER BY rank LIMIT ?';

            rows = await db
              .prepare(sql)
              .bind(normalizedQuery, ...params, safeLimit)
              .all<SearchRow>();
          } catch (error) {
            // Some existing DB deployments may not have the FTS virtual table yet.
            if (!String(error).includes('no such table: meetings_fts')) {
              throw error;
            }

            searchBackend = 'fallback_like';

            const tokenClauses: string[] = [];
            const tokenParams: unknown[] = [];

            for (const token of queryTokens) {
              tokenClauses.push("(LOWER(COALESCE(m.transcript, '')) LIKE ? OR LOWER(COALESCE(m.summary, '')) LIKE ?)");
              const pattern = `%${token.toLowerCase()}%`;
              tokenParams.push(pattern, pattern);
            }

            let fallbackSql = `
              SELECT m.*, 0.0 AS rank
              FROM meetings m
              WHERE ${tokenClauses.join(' AND ')}
            `;

            if (clauses.length > 0) {
              fallbackSql += ` AND ${clauses.join(' AND ')}`;
            }

            fallbackSql += ' ORDER BY m.recorded_at DESC LIMIT ?';

            rows = await db
              .prepare(fallbackSql)
              .bind(...tokenParams, ...params, safeLimit)
              .all<SearchRow>();
          }

          const results = rows.results.map((row) => {
            const snippetSource = [row.transcript, row.summary].filter(Boolean).join(' ');
            return {
              ...shapeMeetingRow(row),
              rank: row.rank,
              snippet: makeSnippet(snippetSource, query, safeSnippetChars),
            };
          });

          return textResult({
            query,
            normalized_query: normalizedQuery,
            results,
            meta: {
              limit: safeLimit,
              count: results.length,
              search_backend: searchBackend,
            },
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(
        new Response(null, {
          headers: {
            'Access-Control-Max-Age': '86400',
          },
        }),
      );
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        new Response(
          JSON.stringify(
            {
              name: SERVER_NAME,
              version: SERVER_VERSION,
              status: 'healthy',
              endpoints: {
                mcp: '/mcp',
                sse: '/sse',
              },
              tools: ['list_meetings', 'get_meeting', 'search_transcripts'],
              resources: ['meetings://stats', 'meetings://recent'],
            },
            null,
            2,
          ),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return withCors(authError);

      const response = await MeetingsMCP.serve('/mcp').fetch(request, env, ctx);
      return withCors(response);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return withCors(authError);

      const response = await MeetingsMCP.serve('/sse').fetch(request, env, ctx);
      return withCors(response);
    }

    return withCors(
      new Response('Not found. MCP endpoint is /mcp', {
        status: 404,
      }),
    );
  },
};
