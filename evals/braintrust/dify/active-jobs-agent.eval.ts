import { Eval, type Score } from 'braintrust';

import { readEnv, readOptionalEnv, readOptionalEnvOrInfisicalSecret } from '../mcp/shared.js';

type ActiveJobsAgentInput = {
  name: string;
  query: string;
  maxDurationMs: number;
};

type ActiveJobsAgentOutput = {
  skipped: boolean;
  reason?: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  answer: string;
  answerLength: number;
  eventCounts: Record<string, number>;
  error?: string;
};

type DifyStreamEvent = {
  event?: string;
  answer?: string;
  message?: string;
  error?: string;
};

const PROJECT_NAME = readEnv(
  'BRAINTRUST_DIFY_PROJECT_NAME',
  readEnv('BRAINTRUST_PROJECT_NAME', 'create-something-dify-agents'),
);

const DIFY_API_BASE_URL = readEnv('DIFY_API_BASE_URL', 'https://api.dify.ai/v1').replace(/\/+$/, '');

const ACTIVE_JOBS_CASES = [
  {
    input: {
      name: 'remote-data-engineering-limit-2',
      query: 'Find 2 remote data engineering jobs in the United States posted this week. Use limit 2.',
      maxDurationMs: 30_000,
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
    },
  },
];

function configuredScore(output: ActiveJobsAgentOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function apiOkScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'api_ok', score: null, metadata: { reason: output.reason } };
  return {
    name: 'api_ok',
    score: output.ok ? 1 : 0,
    metadata: { status: output.status, error: output.error },
  };
}

function answerPresentScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'answer_present', score: null, metadata: { reason: output.reason } };
  return {
    name: 'answer_present',
    score: output.answerLength >= 120 ? 1 : 0,
    metadata: { answerLength: output.answerLength },
  };
}

function toolUseScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'agent_used_tool_path', score: null, metadata: { reason: output.reason } };

  const agentThoughtCount = output.eventCounts.agent_thought ?? 0;
  return {
    name: 'agent_used_tool_path',
    score: agentThoughtCount > 0 ? 1 : 0,
    metadata: { eventCounts: output.eventCounts },
  };
}

function listingStructureScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'job_listing_structure', score: null, metadata: { reason: output.reason } };

  const answer = output.answer.toLowerCase();
  const hasTitle = /\btitle\s*:/.test(answer) || /\b(engineer|developer|analyst|scientist|architect)\b/.test(answer);
  const hasOrganization = /\borganization\s*:/.test(answer) || /\b(company|llc|inc\.?|corp\.?|source\s*:)\b/.test(answer);
  const hasUrl = /https?:\/\/|application url\s*:/.test(answer);
  const hasLocation = /\blocation\s*:/.test(answer) || /\b(remote|united states|us|u\.s\.)\b/.test(answer);
  const evidenceCount = [hasTitle, hasOrganization, hasUrl, hasLocation].filter(Boolean).length;

  return {
    name: 'job_listing_structure',
    score: evidenceCount >= 3 ? 1 : evidenceCount / 4,
    metadata: { hasTitle, hasOrganization, hasUrl, hasLocation, evidenceCount },
  };
}

function queryConstraintScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'query_constraints_reflected', score: null, metadata: { reason: output.reason } };

  const answer = output.answer.toLowerCase();
  const mentionsRemote = answer.includes('remote');
  const mentionsData = answer.includes('data');
  const mentionsTiming = answer.includes('posted') || answer.includes('week') || answer.includes('may ');
  const respectsLimit = /\b2\b/.test(answer) || answer.includes('two ');

  return {
    name: 'query_constraints_reflected',
    score: mentionsRemote && mentionsData && mentionsTiming && respectsLimit ? 1 : 0,
    metadata: { mentionsRemote, mentionsData, mentionsTiming, respectsLimit },
  };
}

function latencyScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };

  const score = output.durationMs <= input.maxDurationMs ? 1 : output.durationMs <= input.maxDurationMs * 1.5 ? 0.5 : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, thresholdMs: input.maxDurationMs },
  };
}

function getDifyAppToken(): string | undefined {
  return readOptionalEnvOrInfisicalSecret('DIFY_ACTIVE_JOBS_AGENT_API_KEY', {
    secretName: readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_SECRET_NAME') ?? 'DIFY_ACTIVE_JOBS_AGENT_API_KEY',
    environment:
      readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_ENV') ?? readOptionalEnv('INFISICAL_ENV') ?? 'prod',
    path: readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_PATH') ?? '/dify/active-jobs-agent',
    projectId:
      readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_PROJECT_ID') ?? readOptionalEnv('INFISICAL_PROJECT_ID'),
  });
}

async function runDifyStreamingChat(input: ActiveJobsAgentInput, token: string): Promise<ActiveJobsAgentOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.maxDurationMs + 15_000);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${DIFY_API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: input.query,
        response_mode: 'streaming',
        user: `braintrust-active-jobs-${Date.now()}`,
      }),
      signal: controller.signal,
    });

    if (!response.body) {
      return {
        skipped: false,
        status: response.status,
        ok: false,
        durationMs: Date.now() - startedAt,
        answer: '',
        answerLength: 0,
        eventCounts: {},
        error: 'Dify response did not include a stream body.',
      };
    }

    const { answer, eventCounts, streamError } = await readDifyEventStream(response.body);
    return {
      skipped: false,
      status: response.status,
      ok: response.ok && !streamError,
      durationMs: Date.now() - startedAt,
      answer,
      answerLength: answer.length,
      eventCounts,
      error: streamError,
    };
  } catch (error) {
    return {
      skipped: false,
      status: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      answer: '',
      answerLength: 0,
      eventCounts: {},
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readDifyEventStream(stream: ReadableStream<Uint8Array>): Promise<{
  answer: string;
  eventCounts: Record<string, number>;
  streamError?: string;
}> {
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let streamError: string | undefined;
  const eventCounts: Record<string, number> = {};

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });

    let eventEndIndex = buffer.indexOf('\n\n');
    while (eventEndIndex >= 0) {
      const rawEvent = buffer.slice(0, eventEndIndex);
      buffer = buffer.slice(eventEndIndex + 2);
      const event = parseDifySseEvent(rawEvent);

      if (event) {
        if (event.event) eventCounts[event.event] = (eventCounts[event.event] ?? 0) + 1;
        if (typeof event.answer === 'string') answer += event.answer;
        if (event.event === 'error') streamError = event.message ?? event.error ?? 'Dify stream emitted an error event.';
        if (event.event === 'message_end') return { answer, eventCounts, streamError };
      }

      eventEndIndex = buffer.indexOf('\n\n');
    }
  }

  return { answer, eventCounts, streamError };
}

function parseDifySseEvent(rawEvent: string): DifyStreamEvent | null {
  for (const line of rawEvent.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;

    try {
      return JSON.parse(data) as DifyStreamEvent;
    } catch {
      return { event: 'parse_error', error: data };
    }
  }

  return null;
}

void Eval<ActiveJobsAgentInput, ActiveJobsAgentOutput>(PROJECT_NAME, {
  experimentName: 'active_jobs_dify_agent_live',
  data: ACTIVE_JOBS_CASES,
  task: async (input): Promise<ActiveJobsAgentOutput> => {
    const token = getDifyAppToken();
    if (!token) {
      return {
        skipped: true,
        reason:
          'Set DIFY_ACTIVE_JOBS_AGENT_API_KEY or ensure Infisical can resolve prod:/dify/active-jobs-agent:DIFY_ACTIVE_JOBS_AGENT_API_KEY.',
        status: null,
        ok: false,
        durationMs: 0,
        answer: '',
        answerLength: 0,
        eventCounts: {},
      };
    }

    return runDifyStreamingChat(input, token);
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => apiOkScore(output),
    ({ output }) => answerPresentScore(output),
    ({ output }) => toolUseScore(output),
    ({ output }) => listingStructureScore(output),
    ({ output }) => queryConstraintScore(output),
    ({ input, output }) => latencyScore(input, output),
  ],
});
