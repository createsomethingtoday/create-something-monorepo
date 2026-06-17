import { getDifyAgentApiKey, type DifyOperatorAgent } from './agent-registry';

export interface DifyToolCallSummary {
  tool: string;
  hasInput: boolean;
  hasObservation: boolean;
  observationBytes: number;
}

export interface DifyChatOutput {
  skipped: boolean;
  ok: boolean;
  status: number | null;
  durationMs: number;
  answer: string;
  messageId?: string;
  conversationId?: string;
  toolCalls: DifyToolCallSummary[];
  error?: string;
  reason?: string;
}

export interface DifyChatInput {
  agent: DifyOperatorAgent;
  query: string;
  conversationId?: string;
  user: string;
  platform?: App.Platform;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

type JsonRecord = Record<string, unknown>;

export type DifyStreamEvent = JsonRecord & {
  event?: string;
  answer?: string;
  tool?: string;
  tool_input?: string;
  observation?: string;
  message_id?: string;
  conversation_id?: string;
  metadata?: JsonRecord;
  status?: number;
  code?: string;
  message?: string;
};

export function parseDifySseEvents(text: string): DifyStreamEvent[] {
  const events: DifyStreamEvent[] = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''));

    if (dataLines.length === 0) {
      continue;
    }

    const data = dataLines.join('\n').trim();
    if (!data || data === '[DONE]') {
      continue;
    }

    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        events.push(parsed as DifyStreamEvent);
      }
    } catch {
      events.push({ event: 'parse_error', message: data });
    }
  }

  return events;
}

export function splitDifyToolNames(tool: string): string[] {
  return tool
    .split(';')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function appendAnswer(current: string, chunk: unknown): string {
  return typeof chunk === 'string' ? `${current}${chunk}` : current;
}

function getObservationBytes(observation: unknown): number {
  return typeof observation === 'string' ? new TextEncoder().encode(observation).byteLength : 0;
}

function extractPlainErrorMessage(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const message = [parsed.code, parsed.message, parsed.detail]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(': ');
    return message || trimmed;
  } catch {
    return trimmed;
  }
}

function extractToolCalls(events: DifyStreamEvent[]): DifyToolCallSummary[] {
  const toolCalls: DifyToolCallSummary[] = [];

  for (const event of events) {
    if (event.event !== 'agent_thought' || typeof event.tool !== 'string') {
      continue;
    }

    for (const tool of splitDifyToolNames(event.tool)) {
      toolCalls.push({
        tool,
        hasInput: typeof event.tool_input === 'string' && event.tool_input.trim().length > 0,
        hasObservation:
          typeof event.observation === 'string' && event.observation.trim().length > 0,
        observationBytes: getObservationBytes(event.observation)
      });
    }
  }

  return toolCalls;
}

export function collectDifyStreamOutput(input: {
  events: DifyStreamEvent[];
  responseOk: boolean;
  status: number | null;
  durationMs: number;
  fallbackError?: string;
}): DifyChatOutput {
  let answer = '';
  let messageId: string | undefined;
  let conversationId: string | undefined;
  let streamError: string | undefined;

  for (const event of input.events) {
    if (event.event === 'message' || event.event === 'agent_message') {
      answer = appendAnswer(answer, event.answer);
    }

    if (event.event === 'message_end') {
      if (typeof event.message_id === 'string') {
        messageId = event.message_id;
      }
      if (typeof event.conversation_id === 'string') {
        conversationId = event.conversation_id;
      }
    }

    if (event.event === 'error') {
      streamError = [event.code, event.message].filter(Boolean).join(': ');
    }
  }

  return {
    skipped: false,
    ok: input.responseOk && !streamError,
    status: input.status,
    durationMs: input.durationMs,
    answer,
    messageId,
    conversationId,
    toolCalls: extractToolCalls(input.events),
    error: streamError ?? input.fallbackError
  };
}

export async function callDifyChat(input: DifyChatInput): Promise<DifyChatOutput> {
  const apiKey = getDifyAgentApiKey(input.agent, input.platform);

  if (!apiKey) {
    return {
      skipped: true,
      ok: false,
      status: null,
      durationMs: 0,
      answer: '',
      toolCalls: [],
      reason: `Missing ${input.agent.apiKeyEnv}; bind it from Infisical prod:${input.agent.infisicalPath}.`
    };
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(input.timeoutMs) && input.timeoutMs ? input.timeoutMs : 45_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const runtimeFetch = input.fetch ?? globalThis.fetch;

  try {
    const response = await runtimeFetch(
      `${input.agent.serviceApiBaseUrl.replace(/\/+$/, '')}/chat-messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {},
          query: input.query,
          response_mode: 'streaming',
          conversation_id: input.conversationId ?? '',
          user: input.user
        }),
        signal: controller.signal
      }
    );

    const text = await response.text();
    const events = parseDifySseEvents(text);
    return collectDifyStreamOutput({
      events,
      responseOk: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      fallbackError: !response.ok ? extractPlainErrorMessage(text) : undefined
    });
  } catch (error) {
    return {
      skipped: false,
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      answer: '',
      toolCalls: [],
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}
