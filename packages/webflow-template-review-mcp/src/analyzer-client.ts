import { AirtableClientError } from './airtable.js';

const DEFAULT_ANALYZER_BASE_URL = 'https://analyzer.mcp.createsomething.agency/mcp';

type JsonRpcId = string | number;

export interface AnalyzerTemplateReviewInput {
  previewUrl: string;
  publishedUrl: string;
  timeout?: number;
  includeManual?: boolean;
  crawlMaxPages?: number;
  crawlMaxDepth?: number;
}

export type AnalyzerTemplateReviewJobRecord = Record<string, unknown>;

export interface AnalyzerClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export interface AnalyzerClient {
  enqueueTemplateReview(input: AnalyzerTemplateReviewInput): Promise<AnalyzerTemplateReviewJobRecord>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function resolveBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ANALYZER_BASE_URL;
}

function nextRequestId(): JsonRpcId {
  return `template-review-analyzer-${Date.now()}`;
}

function requireConfiguredApiKey(apiKey: string | undefined): string {
  const trimmed = apiKey?.trim();
  if (trimmed) return trimmed;
  throw new AirtableClientError(
    'ANALYZER_MCP_NOT_CONFIGURED',
    'Analyzer enqueue is not configured for this MCP runtime.',
    503,
  );
}

function extractToolResult(payload: unknown, toolName: string): Record<string, unknown> {
  const rpc = asRecord(payload);
  if (!rpc) {
    throw new AirtableClientError(
      'ANALYZER_MCP_INVALID_RESPONSE',
      `Analyzer MCP returned a non-object response for ${toolName}.`,
      502,
      { payload },
    );
  }

  if (rpc.error !== undefined) {
    throw new AirtableClientError(
      'ANALYZER_MCP_RPC_ERROR',
      `Analyzer MCP returned an RPC error for ${toolName}.`,
      502,
      rpc.error,
    );
  }

  const result = asRecord(rpc.result);
  if (!result) {
    throw new AirtableClientError(
      'ANALYZER_MCP_INVALID_RESPONSE',
      `Analyzer MCP returned no result for ${toolName}.`,
      502,
      rpc,
    );
  }

  const content = Array.isArray(result.content) ? result.content : [];
  const first = asRecord(content[0]);
  const text = typeof first?.text === 'string' ? first.text : '';
  const parsed = text ? safeParseJson(text) : result.structuredContent;

  if (result.isError === true) {
    const message =
      typeof asRecord(parsed)?.error === 'string'
        ? String(asRecord(parsed)?.error)
        : `Analyzer tool ${toolName} failed.`;
    throw new AirtableClientError('ANALYZER_MCP_TOOL_ERROR', message, 502, parsed);
  }

  const record = asRecord(parsed);
  if (!record) {
    throw new AirtableClientError(
      'ANALYZER_MCP_INVALID_RESPONSE',
      `Analyzer tool ${toolName} returned a non-object payload.`,
      502,
      parsed,
    );
  }

  return record;
}

class RemoteAnalyzerClient implements AnalyzerClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AnalyzerClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.apiKey = requireConfiguredApiKey(options.apiKey);
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  async enqueueTemplateReview(input: AnalyzerTemplateReviewInput): Promise<AnalyzerTemplateReviewJobRecord> {
    const response = await this.fetchFn(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextRequestId(),
        method: 'tools/call',
        params: {
          name: 'enqueue_template_review',
          arguments: input,
        },
      }),
    });

    const responseText = await response.text();
    const payload = responseText ? safeParseJson(responseText) : {};

    if (!response.ok) {
      throw new AirtableClientError(
        'ANALYZER_MCP_HTTP_ERROR',
        `Analyzer MCP returned HTTP ${response.status} for enqueue_template_review.`,
        response.status,
        payload,
      );
    }

    return extractToolResult(payload, 'enqueue_template_review');
  }
}

export function createAnalyzerClient(options: AnalyzerClientOptions = {}): AnalyzerClient {
  return new RemoteAnalyzerClient(options);
}

export { DEFAULT_ANALYZER_BASE_URL };
