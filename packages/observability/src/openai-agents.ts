/**
 * OpenAI Agents SDK tracing -> Langfuse.
 *
 * This bridges `@openai/agents` span events into Langfuse spans so you can
 * debug agent runs in Langfuse (even when you are not calling the OpenAI SDK
 * directly).
 *
 * Enable by calling `registerOpenAIAgentsLangfuseTracing()` once at startup.
 */

import type { Span as AgentsSpan, SpanData, Trace as AgentsTrace, TracingProcessor } from '@openai/agents';
import { addTraceProcessor, setTraceProcessors } from '@openai/agents';

import {
  createLangfuseTrace,
  flush,
  initLangfuse,
  isLangfuseEnabled,
  type LangfuseConfig,
} from './langfuse.js';
import type { LangfuseTraceClient } from 'langfuse';

export type OpenAIAgentsLangfuseTracingConfig = {
  enabled?: boolean;
  projectName?: string;
  tags?: string[];
  langfuse?: LangfuseConfig;
  /**
   * By default, the OpenAI Agents SDK auto-installs an exporter that sends traces
   * to OpenAI (`/v1/traces/ingest`). In most client deployments we only want
   * Langfuse, so this defaults to `true` to replace the processors.
   */
  replaceTraceProcessors?: boolean;
};

let installed = false;

function isoToMillis(value: string | null): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  return ms;
}

function spanDisplayName(data: SpanData): string {
  switch (data.type) {
    case 'agent':
      return `agent:${data.name}`;
    case 'function':
      return `tool:${data.name}`;
    case 'generation':
      return data.model ? `generation:${data.model}` : 'generation';
    case 'response':
      return data.response_id ? `response:${data.response_id}` : 'response';
    case 'handoff':
      return `handoff:${data.from_agent ?? 'unknown'}->${data.to_agent ?? 'unknown'}`;
    case 'guardrail':
      return `guardrail:${data.name}`;
    case 'mcp_tools':
      return data.server ? `mcp_tools:${data.server}` : 'mcp_tools';
    case 'transcription':
      return data.model ? `transcription:${data.model}` : 'transcription';
    case 'speech':
      return data.model ? `speech:${data.model}` : 'speech';
    case 'speech_group':
      return 'speech_group';
    case 'custom':
      return `custom:${data.name}`;
    default:
      return (data as SpanData).type ?? 'span';
  }
}

function spanEvent(data: SpanData): {
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  error?: string;
} {
  switch (data.type) {
    case 'agent':
      return {
        metadata: {
          agent_name: data.name,
          tools: data.tools,
          handoffs: data.handoffs,
          output_type: data.output_type
        }
      };
    case 'function':
      return {
        input: data.input,
        output: data.output,
        metadata: {
          tool_name: data.name,
          mcp_data: data.mcp_data
        }
      };
    case 'generation': {
      const metrics: Record<string, unknown> = {};
      const usage = data.usage ?? {};
      if (typeof usage.input_tokens === 'number') metrics.input_tokens = usage.input_tokens;
      if (typeof usage.output_tokens === 'number') metrics.output_tokens = usage.output_tokens;
      if (usage.details && typeof usage.details === 'object') metrics.usage_details = usage.details;

      return {
        input: data.input,
        output: data.output,
        metadata: {
          model: data.model,
          model_config: data.model_config
        },
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined
      };
    }
    case 'response':
      return {
        input: data._input,
        output: data._response,
        metadata: {
          response_id: data.response_id
        }
      };
    case 'handoff':
      return {
        metadata: {
          from_agent: data.from_agent,
          to_agent: data.to_agent
        }
      };
    case 'guardrail':
      return {
        metadata: {
          name: data.name,
          triggered: data.triggered
        }
      };
    case 'mcp_tools':
      return {
        output: data.result,
        metadata: {
          server: data.server
        }
      };
    case 'transcription':
      return {
        input: data.input,
        output: data.output,
        metadata: {
          model: data.model,
          model_config: data.model_config
        }
      };
    case 'speech':
      return {
        input: data.input,
        output: data.output,
        metadata: {
          model: data.model,
          model_config: data.model_config
        }
      };
    case 'speech_group':
      return {
        input: data.input
      };
    case 'custom':
      return {
        metadata: {
          name: data.name,
          data: data.data
        }
      };
    default:
      return { metadata: { span_data: data } };
  }
}

class LangfuseAgentsTraceProcessor implements TracingProcessor {
  #tags: string[];
  #traces = new Map<string, LangfuseTraceClient>();

  constructor(tags: string[] = []) {
    this.#tags = tags;
  }

  async onTraceStart(trace: AgentsTrace): Promise<void> {
    if (!isLangfuseEnabled()) return;

    const root = createLangfuseTrace({
      name: `openai_agents:${trace.name}`,
      sessionId: trace.groupId ?? trace.traceId,
      metadata: {
        type: 'openai_agents',
        kind: 'trace',
        openai_agents_trace_id: trace.traceId,
        group_id: trace.groupId,
        trace_metadata: trace.metadata,
      },
      tags: ['openai-agents', ...this.#tags],
    });

    if (root) this.#traces.set(trace.traceId, root);
  }

  async onTraceEnd(trace: AgentsTrace): Promise<void> {
    const root = this.#traces.get(trace.traceId);
    if (!root) return;

    root.update({
      output: { endedAt: new Date().toISOString() },
    });
    this.#traces.delete(trace.traceId);
  }

  async onSpanStart(_span: AgentsSpan<any>): Promise<void> {
    // No-op (we log the span when it ends).
  }

  async onSpanEnd(span: AgentsSpan<any>): Promise<void> {
    if (!isLangfuseEnabled()) return;

    const data = span.spanData;
    const startedAt = isoToMillis(span.startedAt);

    const baseEvent = spanEvent(data);
    const errorMessage = span.error?.message ?? null;

    const trace =
      this.#traces.get(span.traceId) ??
      createLangfuseTrace({
        name: `openai_agents:${span.traceId}`,
        sessionId: span.traceId,
        metadata: {
          type: 'openai_agents',
          openai_agents_trace_id: span.traceId,
          recovered: true,
        },
        tags: ['openai-agents', ...this.#tags],
      });

    if (!trace) return;
    this.#traces.set(span.traceId, trace);

    const langfuseSpan = trace.span({
      name: `openai_agents:${spanDisplayName(data)}`,
      id: span.spanId,
      startTime: startedAt === undefined ? undefined : new Date(startedAt),
      input: baseEvent.input,
      output: baseEvent.output,
      metadata: {
        ...(baseEvent.metadata ?? {}),
        metrics: baseEvent.metrics,
        openai_agents_trace_id: span.traceId,
        openai_agents_span_id: span.spanId,
        openai_agents_parent_id: span.parentId,
        openai_agents_previous_span_id: span.previousSpan?.spanId,
        openai_agents_trace_metadata: span.traceMetadata,
        span_type: data.type,
      },
      level: errorMessage ? 'ERROR' : 'DEFAULT',
      statusMessage: errorMessage ?? undefined,
    });

    langfuseSpan.end({
      output: baseEvent.output,
    });
  }

  async shutdown(_timeout?: number): Promise<void> {
    await flush();
  }

  async forceFlush(): Promise<void> {
    await flush();
  }
}

/**
 * Register a Langfuse tracing processor for the OpenAI Agents SDK.
 *
 * This is safe to call multiple times (idempotent).
 */
export function registerOpenAIAgentsLangfuseTracing(
  options: OpenAIAgentsLangfuseTracingConfig = {}
): boolean {
  const enabled = options.enabled ?? true;
  if (!enabled) return false;

  initLangfuse({
    ...(options.langfuse ?? {}),
    projectName: options.projectName ?? options.langfuse?.projectName
  });

  if (!isLangfuseEnabled()) return false;
  if (installed) return true;

  const processor = new LangfuseAgentsTraceProcessor(options.tags ?? []);
  const replace = options.replaceTraceProcessors ?? true;
  if (replace) {
    setTraceProcessors([processor]);
  } else {
    addTraceProcessor(processor);
  }
  installed = true;
  return true;
}
