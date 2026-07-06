import { randomUUID } from 'node:crypto';
import { appendFile } from 'node:fs/promises';

import { mcpToolMetadata, type AITaskType } from '@create-something/observability/atlas';
import {
  emitToolInvocation,
  initLangfuse,
  shutdownLangfuse,
} from '@create-something/observability/langfuse';

const SERVER_NAME = 'webflow-site-analyzer-mcp';
const SERVER_VERSION = '1.0.0';

const TELEMETRY_ENABLED = parseBoolean(process.env.MCP_TELEMETRY_ENABLED, true);
const TELEMETRY_PATH = normalizeString(process.env.MCP_TELEMETRY_PATH);

let langfuseInitialized = false;

export type ToolTraceContext = {
  traceId: string;
  requestId: string;
  toolName: string;
  accountId: string;
  startedAtMs: number;
  inputSummary: unknown;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readHeaderValue(headers: unknown, headerName: string): string | null {
  if (!headers) return null;

  const normalizedHeaderName = headerName.toLowerCase();

  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      if (String(entry[0]).toLowerCase() !== normalizedHeaderName) continue;
      return normalizeString(entry[1]);
    }
    return null;
  }

  const headersRecord = asRecord(headers);
  if (!headersRecord) return null;

  for (const [key, value] of Object.entries(headersRecord)) {
    if (key.toLowerCase() !== normalizedHeaderName) continue;

    const direct = normalizeString(value);
    if (direct) return direct;

    if (Array.isArray(value) && value.length > 0) {
      const first = normalizeString(value[0]);
      if (first) return first;
    }
  }

  return null;
}

function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return normalizeString(value.slice(7));
}

function resolveAccountId(args: Record<string, unknown>, extra: unknown): string {
  const fromArgs =
    normalizeString(args.account_id) ??
    normalizeString(args.accountId) ??
    normalizeString(args.entity_id) ??
    normalizeString(args.__dm_entity_id);
  if (fromArgs) return fromArgs;

  const extraRecord = asRecord(extra);
  const requestInfo = asRecord(extraRecord?.requestInfo);
  const requestInfoRequest = asRecord(requestInfo?.request);

  const fromHeaders =
    readHeaderValue(requestInfo?.headers, 'x-mcp-account-id') ??
    readHeaderValue(requestInfo?.headers, 'x-account-id') ??
    readHeaderValue(requestInfoRequest?.headers, 'x-mcp-account-id') ??
    readHeaderValue(requestInfoRequest?.headers, 'x-account-id');
  if (fromHeaders) return fromHeaders;

  const fromAuthorization =
    parseBearerToken(readHeaderValue(requestInfo?.headers, 'authorization')) ??
    parseBearerToken(readHeaderValue(requestInfoRequest?.headers, 'authorization'));
  if (fromAuthorization) return fromAuthorization;

  return 'operator';
}

function resolveRequestId(extra: unknown): string {
  const extraRecord = asRecord(extra);
  const meta = asRecord(extraRecord?._meta);

  const fromMeta =
    normalizeString(meta?.requestId) ??
    normalizeString(meta?.request_id) ??
    normalizeString(meta?.correlationId) ??
    normalizeString(meta?.correlation_id);

  return fromMeta || randomUUID();
}

function summarizeObject(value: unknown, depth = 0): unknown {
  if (depth > 2) return '[max_depth]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const sampled = value.slice(0, 5).map((item) => summarizeObject(item, depth + 1));
    return {
      length: value.length,
      sample: sampled,
    };
  }

  const record = asRecord(value);
  if (!record) return String(value);

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record).slice(0, 20)) {
    if (key === 'screenshot' && typeof item === 'string') {
      out.screenshotBase64Bytes = item.length;
      continue;
    }
    out[key] = summarizeObject(item, depth + 1);
  }
  if (Object.keys(record).length > 20) {
    out.__truncatedKeys = Object.keys(record).length - 20;
  }
  return out;
}

function telemetryEventBase(ctx: ToolTraceContext) {
  return {
    traceId: ctx.traceId,
    requestId: ctx.requestId,
    serverName: SERVER_NAME,
    serverVersion: SERVER_VERSION,
    toolName: ctx.toolName,
    accountId: ctx.accountId,
  };
}

function emitTelemetry(event: Record<string, unknown>): void {
  if (!TELEMETRY_ENABLED) return;

  const payload = JSON.stringify({
    ...event,
    emittedAt: new Date().toISOString(),
  });

  console.error(`[telemetry] ${payload}`);

  if (TELEMETRY_PATH) {
    appendFile(TELEMETRY_PATH, `${payload}\n`).catch((error) => {
      console.warn(
        `[telemetry] failed to append telemetry event to ${TELEMETRY_PATH}:`,
        error instanceof Error ? error.message : String(error),
      );
    });
  }
}

function inferAiTaskType(toolName: string): AITaskType {
  switch (toolName) {
    case 'analyze_touchpoints':
    case 'extract_designer_metadata':
      return 'extract';
    case 'extract_seo':
    case 'get_performance':
    case 'score_designer_checklist':
      return 'analyze';
    case 'capture_screenshot':
    case 'create_script_version':
      return 'transform';
    case 'compare_versions':
      return 'compare';
    case 'get_webflow_review_policy':
    case 'refresh_webflow_review_policy':
      return 'summarize';
    case 'run_template_review':
    case 'run_analysis_cycle':
      return 'orchestrate';
    default:
      return 'orchestrate';
  }
}

export function initMcpTracing(): void {
  const langfuseEnabled = parseBoolean(process.env.LANGFUSE_ENABLED, true);
  const publicKey = normalizeString(process.env.LANGFUSE_PUBLIC_KEY);
  const secretKey = normalizeString(process.env.LANGFUSE_SECRET_KEY);

  if (!langfuseEnabled || !publicKey || !secretKey) return;

  const projectName =
    normalizeString(process.env.LANGFUSE_PROJECT_NAME) ??
    normalizeString(process.env.LANGFUSE_PROJECT) ??
    SERVER_NAME;

  try {
    initLangfuse({
      publicKey,
      secretKey,
      projectName,
      host:
        normalizeString(process.env.LANGFUSE_BASE_URL) ??
        normalizeString(process.env.LANGFUSE_HOST) ??
        undefined,
      enabled: true,
    });
    langfuseInitialized = true;
  } catch (error) {
    console.warn(
      '[telemetry] failed to initialize Langfuse tracing:',
      error instanceof Error ? error.message : String(error),
    );
    langfuseInitialized = false;
  }
}

export function beginToolTrace(
  toolName: string,
  input: Record<string, unknown>,
  extra: unknown,
): ToolTraceContext {
  const context: ToolTraceContext = {
    traceId: randomUUID(),
    requestId: resolveRequestId(extra),
    toolName,
    accountId: resolveAccountId(input, extra),
    startedAtMs: Date.now(),
    inputSummary: summarizeObject(input),
  };

  emitTelemetry({
    event: 'tool_start',
    ...telemetryEventBase(context),
    input: context.inputSummary,
  });

  return context;
}

export async function endToolTraceSuccess(
  context: ToolTraceContext,
  output: unknown,
): Promise<void> {
  const durationMs = Date.now() - context.startedAtMs;
  const outputSummary = summarizeObject(output);

  emitTelemetry({
    event: 'tool_success',
    ...telemetryEventBase(context),
    durationMs,
    output: outputSummary,
  });

  if (!langfuseInitialized) return;

  const aiTaskType = inferAiTaskType(context.toolName);
  try {
    await emitToolInvocation({
      serverName: SERVER_NAME,
      toolName: context.toolName,
      accountId: context.accountId,
      input: context.inputSummary,
      output: outputSummary,
      durationMs,
      success: true,
      aiTaskType,
      atlasMetadata: {
        ...mcpToolMetadata(SERVER_NAME, context.toolName, aiTaskType),
        requestId: context.requestId,
        traceId: context.traceId,
        'mcp.server_version': SERVER_VERSION,
      },
    });
  } catch (error) {
    console.warn(
      `[telemetry] langfuse emit failed for ${context.toolName}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function endToolTraceError(
  context: ToolTraceContext,
  error: unknown,
): Promise<void> {
  const durationMs = Date.now() - context.startedAtMs;
  const errorMessage = error instanceof Error ? error.message : String(error);

  emitTelemetry({
    event: 'tool_error',
    ...telemetryEventBase(context),
    durationMs,
    error: errorMessage,
  });

  if (!langfuseInitialized) return;

  const aiTaskType = inferAiTaskType(context.toolName);
  try {
    await emitToolInvocation({
      serverName: SERVER_NAME,
      toolName: context.toolName,
      accountId: context.accountId,
      input: context.inputSummary,
      output: { error: errorMessage },
      durationMs,
      success: false,
      error: errorMessage,
      aiTaskType,
      atlasMetadata: {
        ...mcpToolMetadata(SERVER_NAME, context.toolName, aiTaskType),
        requestId: context.requestId,
        traceId: context.traceId,
        'mcp.server_version': SERVER_VERSION,
      },
    });
  } catch (error) {
    console.warn(
      `[telemetry] langfuse emit failed for ${context.toolName}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function shutdownMcpTracing(): Promise<void> {
  if (!langfuseInitialized) return;
  try {
    await shutdownLangfuse();
  } catch (error) {
    console.warn(
      '[telemetry] langfuse shutdown failed:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
