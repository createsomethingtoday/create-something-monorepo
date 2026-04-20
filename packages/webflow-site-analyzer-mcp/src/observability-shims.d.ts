declare module '@create-something/observability' {
  export type TraceHandle = unknown;
  export type SpanHandle = {
    end(payload?: Record<string, unknown>): void;
  };

  export function initObservability(): void;
  export function createTrace(input: Record<string, unknown>): TraceHandle;
  export function createSpan(trace: TraceHandle, input: Record<string, unknown>): SpanHandle;
  export function logEvent(trace: TraceHandle, event: Record<string, unknown>): void;
  export function recordScore(trace: TraceHandle, score: Record<string, unknown>): void;
}

declare module '@create-something/observability/atlas' {
  export type AITaskType =
    | 'extract'
    | 'analyze'
    | 'transform'
    | 'compare'
    | 'summarize'
    | 'orchestrate'
    | string;

  export type AtlasMetadata = Record<string, unknown>;

  export function mcpToolMetadata(
    serverName: string,
    toolName: string,
    aiTaskType: AITaskType
  ): AtlasMetadata;
}

declare module '@create-something/observability/braintrust' {
  export function initBraintrust(options: Record<string, unknown>): void;
  export function emitToolInvocation(payload: Record<string, unknown>): Promise<void>;
  export function shutdownBraintrust(): Promise<void>;
}
