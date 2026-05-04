import {
  readEnv,
  readOptionalEnv,
  readOptionalEnvOrInfisicalSecret,
  type JsonRecord
} from '../mcp/shared.js';

export type DifyChatInput = {
  name: string;
  query: string;
  expectedText?: string;
  expectedTexts?: string[];
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
  apiKeyDescription?: string;
  user: string;
  timeoutMs: number;
  missingApiKeyHint?: string;
};

export type DifyClientConfigOptions = {
  baseUrl?: string;
  apiKeyEnv?: string;
  secretName?: string;
  infisicalEnvironment?: string;
  infisicalPath?: string;
  infisicalProjectId?: string;
  user?: string;
  timeoutMs?: number;
  skipSecretLookup?: boolean;
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
  code?: string;
  message?: string;
};

export const DEFAULT_DIFY_API_BASE_URL = 'https://api.dify.ai/v1';

export function buildDifyClientConfig(options: DifyClientConfigOptions = {}): DifyClientConfig {
  const apiKeyEnv =
    options.apiKeyEnv ??
    readOptionalEnv('DIFY_AGENT_API_KEY_ENV') ??
    'DIFY_ABUNDANCE_STAFF_AGENT_API_KEY';
  const secretName =
    options.secretName ?? readOptionalEnv('DIFY_AGENT_API_KEY_SECRET_NAME') ?? apiKeyEnv;
  const infisicalPath =
    options.infisicalPath ??
    readOptionalEnv('DIFY_AGENT_INFISICAL_PATH') ??
    '/dify/abundance-staff-mcp';
  const infisicalEnvironment =
    options.infisicalEnvironment ??
    readOptionalEnv('DIFY_AGENT_INFISICAL_ENV') ??
    readOptionalEnv('INFISICAL_ENV') ??
    'prod';
  const infisicalProjectId =
    options.infisicalProjectId ??
    readOptionalEnv('DIFY_AGENT_INFISICAL_PROJECT_ID') ??
    readOptionalEnv('INFISICAL_PROJECT_ID');
  const timeoutMs =
    options.timeoutMs ?? Number.parseInt(readEnv('DIFY_AGENT_EVAL_TIMEOUT_MS', '60000'), 10);

  return {
    baseUrl: (options.baseUrl ?? readEnv('DIFY_AGENT_BASE_URL', DEFAULT_DIFY_API_BASE_URL)).replace(
      /\/+$/,
      ''
    ),
    apiKey: options.skipSecretLookup
      ? readOptionalEnv(apiKeyEnv)
      : readOptionalEnvOrInfisicalSecret(apiKeyEnv, {
          secretName,
          environment: infisicalEnvironment,
          path: infisicalPath,
          projectId: infisicalProjectId
        }),
    user: options.user ?? readEnv('DIFY_AGENT_EVAL_USER', 'braintrust-dify-abundance-staff-agent'),
    timeoutMs,
    apiKeyDescription: `${apiKeyEnv} or Infisical ${infisicalEnvironment}:${infisicalPath}`,
    missingApiKeyHint: `Missing ${apiKeyEnv}; export it or allow Infisical lookup at ${infisicalPath}.`
  };
}

function parseSseEvents(text: string): DifyStreamEvent[] {
  const events: DifyStreamEvent[] = [];

  for (const block of text.split(/\n\n+/)) {
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

function extractToolCalls(events: DifyStreamEvent[]): DifyToolCall[] {
  const toolCalls: DifyToolCall[] = [];

  for (const event of events) {
    if (event.event !== 'agent_thought' || typeof event.tool !== 'string') continue;

    for (const tool of splitDifyToolNames(event.tool)) {
      toolCalls.push({
        tool,
        toolInput: typeof event.tool_input === 'string' ? event.tool_input : '',
        observation: typeof event.observation === 'string' ? event.observation : ''
      });
    }
  }

  return toolCalls;
}

function splitDifyToolNames(tool: string): string[] {
  return tool
    .split(';')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export async function callDifyChat(
  input: DifyChatInput,
  config: DifyClientConfig
): Promise<DifyChatOutput> {
  if (!config.apiKey) {
    return {
      skipped: true,
      reason:
        config.missingApiKeyHint ??
        `Missing ${config.apiKeyDescription ?? 'Dify Service API key'}.`,
      ok: false,
      status: null,
      durationMs: 0,
      answer: '',
      toolCalls: []
    };
  }

  const controller = new AbortController();
  const timeoutMs =
    Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : 60_000;
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
        if (typeof event.answer === 'string') answer = `${answer}${event.answer}`;
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

export function answerContainsAll(
  output: DifyChatOutput,
  expectedTexts: Array<string | number> | undefined
): boolean {
  if (!expectedTexts || expectedTexts.length === 0) return true;
  return expectedTexts.every((expected) => answerContains(output, expected));
}

export function observationsContain(
  output: DifyChatOutput,
  expected: string | number | undefined
): boolean {
  if (expected === undefined) return true;
  const needle = String(expected).toLowerCase();
  return output.toolCalls.some((call) => call.observation.toLowerCase().includes(needle));
}

export function observationsContainAll(
  output: DifyChatOutput,
  expectedTexts: Array<string | number> | undefined
): boolean {
  if (!expectedTexts || expectedTexts.length === 0) return true;
  return expectedTexts.every((expected) => observationsContain(output, expected));
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
