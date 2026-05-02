import {
  readEnv,
  readOptionalEnv,
  readOptionalEnvOrInfisicalSecret,
  type JsonRecord
} from '../mcp/shared.js';

export type DifyChatInput = {
  name: string;
  query: string;
  expectedTitle?: string;
  expectedMethod?: string;
  expectedSegmentCount?: number;
  shouldUseTool?: string;
  forbiddenTools?: string[];
};

export type DifyToolCall = {
  tool: string;
  toolInput: string;
  observation: string;
};

export type DifyChatOutput = {
  skipped: boolean;
  reason?: string;
  ok: boolean;
  status: number | null;
  durationMs: number;
  answer: string;
  messageId?: string;
  conversationId?: string;
  toolCalls: DifyToolCall[];
  usage?: JsonRecord;
  error?: string;
};

export type DifyClientConfig = {
  baseUrl: string;
  apiKey?: string;
  user: string;
  timeoutMs: number;
};

type DifyStreamEvent = JsonRecord & {
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

export const DEFAULT_DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
export const DEFAULT_DIFY_INFISICAL_PATH = '/dify/youtube-transcript-notion-agent';
export const DEFAULT_DIFY_API_KEY_ENV = 'DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY';

export function buildDifyClientConfig(): DifyClientConfig {
  const apiKeyEnv = readOptionalEnv('DIFY_AGENT_API_KEY_ENV') ?? DEFAULT_DIFY_API_KEY_ENV;
  const secretName = readOptionalEnv('DIFY_AGENT_API_KEY_SECRET_NAME') ?? apiKeyEnv;

  return {
    baseUrl: readEnv('DIFY_AGENT_BASE_URL', DEFAULT_DIFY_API_BASE_URL).replace(/\/+$/, ''),
    apiKey: readOptionalEnvOrInfisicalSecret(apiKeyEnv, {
      secretName,
      environment:
        readOptionalEnv('DIFY_AGENT_INFISICAL_ENV') ?? readOptionalEnv('INFISICAL_ENV') ?? 'prod',
      path: readOptionalEnv('DIFY_AGENT_INFISICAL_PATH') ?? DEFAULT_DIFY_INFISICAL_PATH,
      projectId:
        readOptionalEnv('DIFY_AGENT_INFISICAL_PROJECT_ID') ??
        readOptionalEnv('INFISICAL_PROJECT_ID')
    }),
    user: readEnv('DIFY_AGENT_EVAL_USER', 'braintrust-dify-youtube-transcript-agent'),
    timeoutMs: Number.parseInt(readEnv('DIFY_AGENT_EVAL_TIMEOUT_MS', '45000'), 10)
  };
}

function parseSseEvents(text: string): DifyStreamEvent[] {
  const events: DifyStreamEvent[] = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''));

    if (dataLines.length === 0) continue;

    const data = dataLines.join('\n').trim();
    if (!data || data === '[DONE]') continue;

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

function appendAnswer(current: string, chunk: unknown): string {
  return typeof chunk === 'string' ? `${current}${chunk}` : current;
}

function extractToolCalls(events: DifyStreamEvent[]): DifyToolCall[] {
  return events
    .filter(
      (event) =>
        event.event === 'agent_thought' && typeof event.tool === 'string' && event.tool.length > 0
    )
    .map((event) => ({
      tool: event.tool ?? '',
      toolInput: typeof event.tool_input === 'string' ? event.tool_input : '',
      observation: typeof event.observation === 'string' ? event.observation : ''
    }));
}

export async function callDifyChat(
  input: DifyChatInput,
  config: DifyClientConfig
): Promise<DifyChatOutput> {
  if (!config.apiKey) {
    return {
      skipped: true,
      reason: `Missing ${DEFAULT_DIFY_API_KEY_ENV}; export it or allow Infisical lookup at ${DEFAULT_DIFY_INFISICAL_PATH}.`,
      ok: false,
      status: null,
      durationMs: 0,
      answer: '',
      toolCalls: []
    };
  }

  const controller = new AbortController();
  const timeoutMs =
    Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : 45_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${config.baseUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query: input.query,
        response_mode: 'streaming',
        conversation_id: '',
        user: config.user
      }),
      signal: controller.signal
    });

    const text = await response.text();
    const events = parseSseEvents(text);
    let answer = '';
    let messageId: string | undefined;
    let conversationId: string | undefined;
    let usage: JsonRecord | undefined;
    let streamError: string | undefined;

    for (const event of events) {
      if (event.event === 'message' || event.event === 'agent_message') {
        answer = appendAnswer(answer, event.answer);
      }

      if (event.event === 'message_end') {
        if (typeof event.message_id === 'string') messageId = event.message_id;
        if (typeof event.conversation_id === 'string') conversationId = event.conversation_id;
        const maybeUsage = event.metadata?.usage;
        if (maybeUsage && typeof maybeUsage === 'object' && !Array.isArray(maybeUsage)) {
          usage = maybeUsage as JsonRecord;
        }
      }

      if (event.event === 'error') {
        streamError = [event.code, event.message].filter(Boolean).join(': ');
      }
    }

    return {
      skipped: false,
      ok: response.ok && !streamError,
      status: response.status,
      durationMs: Date.now() - startedAt,
      answer,
      messageId,
      conversationId,
      toolCalls: extractToolCalls(events),
      usage,
      error: streamError
    };
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

export function answerContains(
  output: DifyChatOutput,
  expected: string | number | undefined
): boolean {
  if (expected === undefined) return true;
  return output.answer.toLowerCase().includes(String(expected).toLowerCase());
}

export function observationsContain(
  output: DifyChatOutput,
  expected: string | number | undefined
): boolean {
  if (expected === undefined) return true;
  const needle = String(expected).toLowerCase();
  return output.toolCalls.some((call) => call.observation.toLowerCase().includes(needle));
}

export function usedTool(output: DifyChatOutput, toolName: string | undefined): boolean {
  if (!toolName) return true;
  return output.toolCalls.some((call) => call.tool === toolName);
}

export function usedForbiddenTool(
  output: DifyChatOutput,
  forbiddenTools: string[] | undefined
): boolean {
  if (!forbiddenTools || forbiddenTools.length === 0) return false;
  return output.toolCalls.some((call) => forbiddenTools.includes(call.tool));
}
