/**
 * OpenAI Agents SDK tracing -> Braintrust.
 *
 * This bridges `@openai/agents` span events into Braintrust spans so you can
 * debug agent runs in Braintrust (even when you are not calling the OpenAI SDK
 * directly).
 *
 * Enable by calling `registerOpenAIAgentsBraintrustTracing()` once at startup.
 */

import type { Span as AgentsSpan, SpanData, Trace as AgentsTrace, TracingProcessor } from '@openai/agents';
import { addTraceProcessor } from '@openai/agents';

import { flush, initBraintrust, isBraintrustEnabled, startSpan, type BraintrustConfig } from './braintrust.js';

export type OpenAIAgentsBraintrustTracingConfig = {
  enabled?: boolean;
  projectName?: string;
  tags?: string[];
  braintrust?: BraintrustConfig;
};

let installed = false;

function nowSeconds(): number {
  return Date.now() / 1000;
}

function isoToSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  return ms / 1000;
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

class BraintrustAgentsTraceProcessor implements TracingProcessor {
  #tags: string[];
  #rootSpans = new Map<string, ReturnType<typeof startSpan>>();

  constructor(tags: string[] = []) {
    this.#tags = tags;
  }

  async onTraceStart(trace: AgentsTrace): Promise<void> {
    if (!isBraintrustEnabled()) return;

    const root = startSpan({
      name: `openai_agents:${trace.name}`,
      spanId: trace.traceId,
      startTime: nowSeconds(),
      spanAttributes: {
        type: 'openai_agents',
        kind: 'trace'
      },
      event: {
        tags: ['openai-agents', ...this.#tags],
        metadata: {
          openai_agents_trace_id: trace.traceId,
          group_id: trace.groupId,
          trace_metadata: trace.metadata
        }
      }
    });

    this.#rootSpans.set(trace.traceId, root);
  }

  async onTraceEnd(trace: AgentsTrace): Promise<void> {
    const root = this.#rootSpans.get(trace.traceId);
    if (!root) return;

    root.end({ endTime: nowSeconds() });
    this.#rootSpans.delete(trace.traceId);
  }

  async onSpanStart(_span: AgentsSpan<any>): Promise<void> {
    // No-op (we log the span when it ends).
  }

  async onSpanEnd(span: AgentsSpan<any>): Promise<void> {
    if (!isBraintrustEnabled()) return;

    const data = span.spanData;
    const startedAt = isoToSeconds(span.startedAt);
    const endedAt = isoToSeconds(span.endedAt);

    const baseEvent = spanEvent(data);
    const errorMessage = span.error?.message ?? null;

    const btSpan = startSpan({
      name: `openai_agents:${spanDisplayName(data)}`,
      spanId: span.spanId,
      startTime: startedAt,
      parentSpanIds: {
        rootSpanId: span.traceId,
        spanId: span.parentId ?? span.traceId
      },
      spanAttributes: {
        type: 'openai_agents',
        span_type: data.type
      },
      event: {
        tags: ['openai-agents', ...this.#tags],
        input: baseEvent.input,
        output: baseEvent.output,
        metadata: {
          ...(baseEvent.metadata ?? {}),
          openai_agents_trace_id: span.traceId,
          openai_agents_span_id: span.spanId,
          openai_agents_parent_id: span.parentId,
          openai_agents_previous_span_id: span.previousSpan?.spanId,
          openai_agents_trace_metadata: span.traceMetadata
        },
        metrics: {
          ...(baseEvent.metrics ?? {}),
          ...(startedAt !== undefined && endedAt !== undefined
            ? { duration_s: Math.max(0, endedAt - startedAt) }
            : {})
        },
        ...(errorMessage ? { error: errorMessage } : {})
      }
    });

    btSpan.end({ endTime: endedAt });
  }

  async shutdown(_timeout?: number): Promise<void> {
    await flush();
  }

  async forceFlush(): Promise<void> {
    await flush();
  }
}

/**
 * Register a Braintrust tracing processor for the OpenAI Agents SDK.
 *
 * This is safe to call multiple times (idempotent).
 */
export function registerOpenAIAgentsBraintrustTracing(
  options: OpenAIAgentsBraintrustTracingConfig = {}
): boolean {
  const enabled = options.enabled ?? true;
  if (!enabled) return false;

  initBraintrust({
    ...(options.braintrust ?? {}),
    projectName: options.projectName ?? options.braintrust?.projectName
  });

  if (!isBraintrustEnabled()) return false;
  if (installed) return true;

  addTraceProcessor(new BraintrustAgentsTraceProcessor(options.tags ?? []));
  installed = true;
  return true;
}
