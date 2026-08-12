import { Langfuse, type LangfuseTraceClient } from 'langfuse';
import type { AITaskType, AtlasMetadata } from './atlas.js';

export interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  host?: string;
  projectName?: string;
  enabled?: boolean;
  flushAt?: number;
  flushInterval?: number;
  environment?: string;
  release?: string;
}

export interface ToolInvocationOutcome {
  success: boolean;
  error?: string;
}

export interface GovernanceTraceContext {
  accountId?: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  policyId?: string;
  routeClassification?: string;
  authzDecision?: 'allow' | 'review' | 'block' | string;
  laneSlug?: string;
  boundHost?: string;
  entrypoint?: string;
}

export interface ToolInvocationEvent {
  serverName: string;
  toolName: string;
  accountId?: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  success: boolean;
  error?: string;
  aiTaskType?: AITaskType;
  atlasMetadata?: AtlasMetadata;
  traceContext?: GovernanceTraceContext;
}

export interface WrappedToolOptions {
  serverName: string;
  toolName: string;
  aiTaskType?: AITaskType;
  atlasMetadata?: AtlasMetadata;
  getAccountId?: (args: Record<string, unknown>) => string | undefined;
  getTraceContext?: (args: Record<string, unknown>) => GovernanceTraceContext | undefined;
}

let client: Langfuse | null = null;
let enabled = true;

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function endpointBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function defaultHost(): string {
  return (
    optionalEnv('LANGFUSE_BASE_URL') ??
    optionalEnv('LANGFUSE_HOST') ??
    endpointBaseUrl(optionalEnv('LANGFUSE_MCP_ENDPOINT')) ??
    'https://us.cloud.langfuse.com'
  );
}

function extractMcpErrorText(result: Record<string, unknown>): string | undefined {
  if (!Array.isArray(result.content)) return undefined;

  const messages = result.content
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const text = (item as Record<string, unknown>).text;
      return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
    })
    .filter((value): value is string => Boolean(value));

  return messages.length > 0 ? messages.join('\n') : undefined;
}

/**
 * Resolve a returned tool value into the signal Langfuse should record.
 * MCP transports commonly return failures as successful promises with
 * `isError: true`; observability must not confuse transport success with tool
 * success.
 */
export function resolveToolInvocationOutcome(result: unknown): ToolInvocationOutcome {
  if (!result || typeof result !== 'object' || (result as Record<string, unknown>).isError !== true) {
    return { success: true };
  }

  const record = result as Record<string, unknown>;
  return {
    success: false,
    error: extractMcpErrorText(record) ?? 'MCP tool returned isError=true',
  };
}

function governanceMetadata(traceContext: GovernanceTraceContext | undefined): Record<string, string> {
  if (!traceContext) return {};

  return Object.fromEntries(
    Object.entries({
      tenantId: traceContext.tenantId,
      userId: traceContext.userId,
      sessionId: traceContext.sessionId,
      correlationId: traceContext.correlationId,
      requestId: traceContext.requestId,
      policyId: traceContext.policyId,
      routeClassification: traceContext.routeClassification,
      authzDecision: traceContext.authzDecision,
      laneSlug: traceContext.laneSlug,
      boundHost: traceContext.boundHost,
      entrypoint: traceContext.entrypoint,
    }).filter(([, value]) => typeof value === 'string' && value.length > 0),
  ) as Record<string, string>;
}

function governanceTags(traceContext: GovernanceTraceContext | undefined): string[] {
  if (!traceContext) return [];

  return [
    traceContext.policyId ? `policy:${traceContext.policyId}` : null,
    traceContext.routeClassification ? `route:${traceContext.routeClassification}` : null,
    traceContext.authzDecision ? `authz:${traceContext.authzDecision}` : null,
    traceContext.laneSlug ? `lane:${traceContext.laneSlug}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function initLangfuse(config: LangfuseConfig = {}): Langfuse | null {
  enabled = config.enabled ?? true;
  if (!enabled) return null;
  if (client) return client;

  const publicKey = config.publicKey ?? optionalEnv('LANGFUSE_PUBLIC_KEY');
  const secretKey = config.secretKey ?? optionalEnv('LANGFUSE_SECRET_KEY');
  if (!publicKey || !secretKey) {
    console.warn('[langfuse] Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY. Tracing disabled.');
    enabled = false;
    return null;
  }

  client = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: config.host ?? defaultHost(),
    flushAt: config.flushAt ?? 1,
    flushInterval: config.flushInterval ?? 250,
    environment:
      config.environment ?? optionalEnv('LANGFUSE_TRACING_ENVIRONMENT') ?? optionalEnv('ENVIRONMENT'),
    release: config.release ?? optionalEnv('LANGFUSE_RELEASE'),
  });

  return client;
}

export function getLangfuseClient(): Langfuse | null {
  return client;
}

export function isLangfuseEnabled(): boolean {
  return enabled && client !== null;
}

export async function flush(): Promise<void> {
  await client?.flushAsync();
}

export async function shutdownLangfuse(): Promise<void> {
  await client?.shutdownAsync();
  client = null;
}

export function createLangfuseTrace(options: {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
  sessionId?: string;
}): LangfuseTraceClient | null {
  if (!client || !enabled) return null;
  return client.trace(options);
}

export async function emitToolInvocation(event: ToolInvocationEvent): Promise<void> {
  if (!client || !enabled) return;

  try {
    const resolvedAccountId = event.traceContext?.accountId || event.accountId || 'operator';
    const metadata = {
      server: event.serverName,
      tool: event.toolName,
      accountId: resolvedAccountId,
      durationMs: event.durationMs,
      success: event.success,
      aiTaskType: event.aiTaskType,
      error: event.error,
      ...governanceMetadata(event.traceContext),
      ...event.atlasMetadata,
    };

    const trace = client.trace({
      name: `mcp:${event.serverName}:${event.toolName}`,
      userId: resolvedAccountId,
      sessionId: event.traceContext?.sessionId,
      input: event.input,
      output: event.output,
      metadata,
      tags: [
        'mcp',
        event.serverName,
        event.toolName,
        event.success ? 'success' : 'error',
        ...governanceTags(event.traceContext),
      ],
    });

    trace
      .span({
        name: `execute:${event.toolName}`,
        input: event.input,
        output: event.output,
        metadata,
        level: event.success ? 'DEFAULT' : 'ERROR',
        statusMessage: event.error,
      })
      .end();

    trace.score({
      name: 'execution_success',
      value: event.success ? 1 : 0,
      dataType: 'BOOLEAN',
      comment: event.error,
    });

    await client.flushAsync();
  } catch (err) {
    console.warn('[langfuse] emitToolInvocation failed:', err);
  }
}

export function wrapMcpToolWithLangfuse<TArgs extends Record<string, unknown>, TResult>(
  options: WrappedToolOptions,
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    if (!client || !enabled) return handler(args);

    const accountId = options.getAccountId?.(args);
    const traceContext = options.getTraceContext?.(args);
    const start = Date.now();

    try {
      const result = await handler(args);
      const outcome = resolveToolInvocationOutcome(result);
      await emitToolInvocation({
        serverName: options.serverName,
        toolName: options.toolName,
        accountId,
        traceContext,
        input: args,
        output: result,
        durationMs: Date.now() - start,
        success: outcome.success,
        error: outcome.error,
        aiTaskType: options.aiTaskType,
        atlasMetadata: options.atlasMetadata,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await emitToolInvocation({
        serverName: options.serverName,
        toolName: options.toolName,
        accountId,
        traceContext,
        input: args,
        output: { error: errorMessage },
        durationMs: Date.now() - start,
        success: false,
        error: errorMessage,
        aiTaskType: options.aiTaskType,
        atlasMetadata: options.atlasMetadata,
      });
      throw error;
    }
  };
}

export type { AITaskType, AtlasMetadata } from './atlas.js';
