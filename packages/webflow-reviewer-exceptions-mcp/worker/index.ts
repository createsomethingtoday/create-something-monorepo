import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import {
  DEFAULT_DIFY_KNOWLEDGE_ID,
  DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID,
  DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID,
} from '../src/schema.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY?: string;
  AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID?: string;
  AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID?: string;
  DIFY_EXTERNAL_KNOWLEDGE_API_KEY?: string;
  DIFY_REVIEWER_EXCEPTIONS_KNOWLEDGE_ID?: string;
}

export function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  return validateBearerToken(request, env.MCP_API_KEY);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function validateExternalKnowledgeApiKey(request: Request, env: Env): Response | null {
  if (!env.DIFY_EXTERNAL_KNOWLEDGE_API_KEY) {
    return jsonResponse(
      {
        error_code: 1002,
        error_msg: 'DIFY_EXTERNAL_KNOWLEDGE_API_KEY is not configured for this deployment.',
      },
      500,
    );
  }
  return validateBearerToken(request, env.DIFY_EXTERNAL_KNOWLEDGE_API_KEY);
}

function getClient(env: Env): AirtableClient {
  if (!env.AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY) {
    throw new Error('Missing AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY environment variable.');
  }
  return new AirtableClient({
    apiKey: env.AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY,
    baseId: env.AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID,
    tableId: env.AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID,
  });
}

async function handleRetrieval(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error_code: 4001, error_msg: 'Use POST for Dify external knowledge retrieval.' }, 405);
  }

  const authError = validateExternalKnowledgeApiKey(request, env);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as {
    knowledge_id?: unknown;
    query?: unknown;
    retrieval_setting?: {
      top_k?: unknown;
      score_threshold?: unknown;
    };
  } | null;

  if (!body || typeof body.query !== 'string' || typeof body.knowledge_id !== 'string') {
    return jsonResponse({ error_code: 4002, error_msg: 'Request must include string knowledge_id and query.' }, 400);
  }

  const expectedKnowledgeId = env.DIFY_REVIEWER_EXCEPTIONS_KNOWLEDGE_ID?.trim() || DEFAULT_DIFY_KNOWLEDGE_ID;
  if (body.knowledge_id !== expectedKnowledgeId) {
    return jsonResponse(
      {
        error_code: 2001,
        error_msg: `Knowledge base not found: ${body.knowledge_id}`,
      },
      404,
    );
  }

  const topK =
    typeof body.retrieval_setting?.top_k === 'number' && Number.isFinite(body.retrieval_setting.top_k)
      ? body.retrieval_setting.top_k
      : 3;
  const scoreThreshold =
    typeof body.retrieval_setting?.score_threshold === 'number' && Number.isFinite(body.retrieval_setting.score_threshold)
      ? body.retrieval_setting.score_threshold
      : 0;

  try {
    const records = await getClient(env).retrieveReviewerExceptionKnowledge({
      query: body.query,
      topK,
      scoreThreshold,
    });
    return jsonResponse({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error_code: 5001, error_msg: message }, 500);
  }
}

export class WebflowReviewerExceptionsMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'webflow-reviewer-exceptions-mcp',
    version: '1.0.0',
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-reviewer-exceptions-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
      );
    }

    const clientFactory = () => getClient(this.env);
    registerResources(this.server, clientFactory);
    registerTools(this.server, clientFactory);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/retrieval') {
      return handleRetrieval(request, env);
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return WebflowReviewerExceptionsMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return WebflowReviewerExceptionsMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: 'webflow-reviewer-exceptions-mcp',
        version: '1.0.0',
        description: 'Standalone read/write reviewer exceptions MCP for template-review agents and Dify external knowledge.',
        auth: {
          mode: 'Bearer required',
          configured: Boolean(env.MCP_API_KEY),
          header: 'Authorization: Bearer <MCP_API_KEY>',
        },
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          difyExternalKnowledge: '/retrieval',
        },
        scope: 'reviewer-exceptions',
        tables: {
          reviewerExceptionsBase: env.AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID,
          reviewerExceptions: env.AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID,
        },
        dify: {
          knowledgeId: env.DIFY_REVIEWER_EXCEPTIONS_KNOWLEDGE_ID?.trim() || DEFAULT_DIFY_KNOWLEDGE_ID,
          retrievalGate: {
            includeInDifyRetrieval: true,
            knowledgeStatus: ['Approved', 'Active'],
            notExpired: true,
          },
        },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
