import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const ANALYZER_JOB_STATUS_OPTIONS = ['queued', 'running', 'succeeded', 'failed', 'canceled'] as const;

export type AnalyzerReviewJobStatus = (typeof ANALYZER_JOB_STATUS_OPTIONS)[number];

export interface AnalyzerReviewInput {
  previewUrl: string;
  publishedUrl: string;
  templateVersionId?: string;
  timeout?: number;
  includeManual?: boolean;
  crawlMaxPages?: number;
  crawlMaxDepth?: number;
}

export interface AnalyzerReviewJobRecord extends Record<string, unknown> {
  jobId: string;
  status: AnalyzerReviewJobStatus;
  input: AnalyzerReviewInput;
}

export interface AnalyzerReviewListInput {
  templateVersionId?: string;
  status?: AnalyzerReviewJobStatus;
  limit?: number;
}

export interface TemplateReviewAnalyzerClient {
  enqueueReview(input: AnalyzerReviewInput): Promise<AnalyzerReviewJobRecord>;
  getReview(jobId: string): Promise<AnalyzerReviewJobRecord>;
  listReviews(input?: AnalyzerReviewListInput): Promise<AnalyzerReviewJobRecord[]>;
}

export class AnalyzerClientError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AnalyzerClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type McpToolResult = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
  structuredContent?: unknown;
};

function normalizeBearerToken(value: string): string {
  return value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;
}

function extractText(result: McpToolResult): string {
  return result.content
    ?.filter((part: { type?: string; text?: string }) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part: { type?: string; text?: string }) => part.text ?? '')
    .join('\n')
    .trim() ?? '';
}

function parseJsonText<T>(text: string, toolName: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new AnalyzerClientError(
      'ANALYZER_INVALID_TOOL_PAYLOAD',
      `Analyzer tool "${toolName}" returned invalid JSON.`,
      502,
      {
        text,
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export function createRemoteAnalyzerClient(config: {
  url: string;
  apiKey?: string;
}): TemplateReviewAnalyzerClient {
  const endpoint = new URL(config.url);
  const headers: HeadersInit = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };

  if (config.apiKey?.trim()) {
    headers.Authorization = normalizeBearerToken(config.apiKey.trim());
  }

  let clientPromise: Promise<Client> | null = null;

  async function resetClient(): Promise<void> {
    if (!clientPromise) return;
    const current = clientPromise;
    clientPromise = null;
    try {
      const client = await current;
      await client.close();
    } catch {
      // ignore reset errors
    }
  }

  async function getClient(): Promise<Client> {
    if (!clientPromise) {
      const client = new Client(
        { name: 'webflow-template-review-mcp', version: '0.1.0' },
        { capabilities: {} },
      );
      const requestInit: RequestInit = {};
      if (Object.keys(headers).length > 0) {
        requestInit.headers = headers;
      }
      const transport = new StreamableHTTPClientTransport(endpoint, { requestInit });
      clientPromise = client.connect(transport).then(() => client);
    }

    try {
      return await clientPromise;
    } catch (error) {
      clientPromise = null;
      throw new AnalyzerClientError(
        'ANALYZER_REQUEST_FAILED',
        error instanceof Error ? error.message : String(error),
        502,
      );
    }
  }

  function parseToolPayload<T>(result: McpToolResult, toolName: string): T {
    if (result.structuredContent !== undefined) {
      return result.structuredContent as T;
    }

    const text = extractText(result);
    if (result.isError) {
      if (text) {
        const parsed = parseJsonText<Record<string, unknown>>(text, toolName);
        const message = typeof parsed.error === 'string' ? parsed.error : `Analyzer tool "${toolName}" failed.`;
        throw new AnalyzerClientError('ANALYZER_TOOL_ERROR', message, 502, parsed);
      }
      throw new AnalyzerClientError(
        'ANALYZER_TOOL_ERROR',
        `Analyzer tool "${toolName}" failed without a payload.`,
        502,
      );
    }

    if (!text) {
      throw new AnalyzerClientError(
        'ANALYZER_EMPTY_TOOL_PAYLOAD',
        `Analyzer tool "${toolName}" did not return a JSON payload.`,
        502,
      );
    }

    return parseJsonText<T>(text, toolName);
  }

  async function callTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    try {
      const client = await getClient();
      const result = (await client.callTool({
        name: toolName,
        arguments: args,
      })) as McpToolResult;
      return parseToolPayload<T>(result, toolName);
    } catch (error) {
      if (error instanceof AnalyzerClientError) {
        if (error.code === 'ANALYZER_REQUEST_FAILED') {
          await resetClient();
        }
        throw error;
      }

      await resetClient();
      throw new AnalyzerClientError(
        'ANALYZER_REQUEST_FAILED',
        error instanceof Error ? error.message : String(error),
        502,
      );
    }
  }

  return {
    enqueueReview(input) {
      return callTool<AnalyzerReviewJobRecord>('enqueue_template_review', { ...input });
    },
    getReview(jobId) {
      return callTool<AnalyzerReviewJobRecord>('get_template_review_job', { jobId });
    },
    listReviews(input = {}) {
      return callTool<AnalyzerReviewJobRecord[]>('list_template_review_jobs', { ...input });
    },
  };
}
