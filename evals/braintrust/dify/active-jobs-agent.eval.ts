import { Eval, type Score } from 'braintrust';

import { readEnv, readOptionalEnv, readOptionalEnvOrInfisicalSecret } from '../mcp/shared.js';

type ExpectedMode = 'listings' | 'search_result' | 'no_results' | 'tool_error' | 'follow_up';

type ActiveJobsAgentInput = {
  name: string;
  query: string;
  maxDurationMs: number;
  expectation: {
    mode: ExpectedMode;
    expectedTools?: string[];
    requiredTerms?: string[];
    anyTermGroups?: string[][];
    forbiddenTerms?: string[];
    minAnswerLength?: number;
  };
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
  toolNames: string[];
  error?: string;
};

type DifyStreamEvent = {
  event?: string;
  answer?: string;
  message?: string;
  error?: string;
  tool?: string;
  tool_name?: string;
  tool_input?: unknown;
};

const PROJECT_NAME = readEnv(
  'BRAINTRUST_DIFY_PROJECT_NAME',
  readEnv('BRAINTRUST_PROJECT_NAME', 'create-something-dify-agents')
);

const DIFY_API_BASE_URL = readEnv('DIFY_API_BASE_URL', 'https://api.dify.ai/v1').replace(
  /\/+$/,
  ''
);

const JOB_LISTING_RESPONSE_CONTRACT = [
  'title',
  'organization',
  'location',
  'source',
  'posted_or_indexed_or_modified_date',
  'application_url',
  'salary_or_remote_when_present'
] as const;

const ACTIVE_JOBS_CASES = [
  {
    input: {
      name: 'remote-data-engineering-limit-2',
      query:
        'Find 2 remote data engineering jobs in the United States posted this week. Use limit 2.',
      maxDurationMs: 30_000,
      expectation: {
        mode: 'listings',
        expectedTools: ['Get_Jobs_7_days_posted'],
        requiredTerms: ['remote', 'data'],
        anyTermGroups: [
          ['posted', 'week', 'may '],
          ['application url', 'http']
        ],
        minAnswerLength: 120
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      contract: JOB_LISTING_RESPONSE_CONTRACT
    }
  },
  {
    input: {
      name: 'no-result-specific-company',
      query:
        'Find 2 senior mainframe reliability jobs at QZTRP Holdings in Antarctica posted this week. Use limit 2.',
      maxDurationMs: 30_000,
      expectation: {
        mode: 'no_results',
        expectedTools: ['Get_Jobs_7_days_posted'],
        requiredTerms: ['qztrp'],
        anyTermGroups: [['no matching', 'no jobs', 'no results', 'could not find', 'did not find']],
        minAnswerLength: 60
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      scenario: 'no_results'
    }
  },
  {
    input: {
      name: 'hourly-freshness-query',
      query:
        'Find 2 data engineering jobs discovered in the last hour in the United States. Use limit 2.',
      maxDurationMs: 30_000,
      expectation: {
        mode: 'search_result',
        expectedTools: ['Get_Jobs_Hourly'],
        requiredTerms: ['hour'],
        anyTermGroups: [
          ['data', 'engineering'],
          ['remote', 'united states', 'us', 'no matching', 'no jobs']
        ],
        minAnswerLength: 80
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      scenario: 'hourly'
    }
  },
  {
    input: {
      name: 'modified-24h-query',
      query:
        'Find 2 software engineering jobs modified in the last 24 hours in the United States. Use limit 2.',
      maxDurationMs: 30_000,
      expectation: {
        mode: 'tool_error',
        expectedTools: ['Ultra_-_Get_Modified_Jobs_24h'],
        requiredTerms: ['modified'],
        anyTermGroups: [
          ['subscription', 'restriction', 'restricted', 'unable to access', 'access'],
          ['software', 'engineer', 'posted', '7 days', 'instead']
        ],
        minAnswerLength: 80
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      scenario: 'modified_24h'
    }
  },
  {
    input: {
      name: 'greenhouse-source-filter',
      query:
        'Find 2 data or machine learning engineering jobs from Greenhouse in the United States posted this week. Use limit 2.',
      maxDurationMs: 30_000,
      expectation: {
        mode: 'search_result',
        expectedTools: ['Get_Jobs_7_days_posted'],
        requiredTerms: ['greenhouse'],
        anyTermGroups: [
          ['data', 'machine learning'],
          ['posted', 'week', 'no matching', 'no jobs']
        ],
        minAnswerLength: 80
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      scenario: 'source_filter'
    }
  },
  {
    input: {
      name: 'broad-query-asks-follow-up',
      query: 'Find jobs.',
      maxDurationMs: 20_000,
      expectation: {
        mode: 'follow_up',
        expectedTools: [],
        anyTermGroups: [
          ['role', 'title', 'position'],
          ['location', 'where', 'geography']
        ],
        minAnswerLength: 20
      }
    } satisfies ActiveJobsAgentInput,
    metadata: {
      suite: 'dify-agents',
      agent: 'active-jobs',
      mcp_server: 'active-jobs',
      scenario: 'broad_guardrail'
    }
  }
];

function configuredScore(output: ActiveJobsAgentOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason }
  };
}

function apiOkScore(output: ActiveJobsAgentOutput): Score {
  if (output.skipped) return { name: 'api_ok', score: null, metadata: { reason: output.reason } };
  return {
    name: 'api_ok',
    score: output.ok ? 1 : 0,
    metadata: { status: output.status, error: output.error }
  };
}

function answerPresentScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped)
    return { name: 'answer_present', score: null, metadata: { reason: output.reason } };

  const minimum = input.expectation.minAnswerLength ?? 80;
  return {
    name: 'answer_present',
    score: output.answerLength >= minimum ? 1 : 0,
    metadata: { answerLength: output.answerLength, minimum }
  };
}

function toolSelectionScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped)
    return { name: 'tool_selection', score: null, metadata: { reason: output.reason } };

  const expectedTools = input.expectation.expectedTools;
  const uniqueToolNames = [...new Set(output.toolNames)];

  if (input.expectation.mode === 'follow_up') {
    return {
      name: 'tool_selection',
      score: uniqueToolNames.length === 0 ? 1 : 0,
      metadata: { expectedTools: [], toolNames: uniqueToolNames }
    };
  }

  if (!expectedTools || expectedTools.length === 0) {
    const agentThoughtCount = output.eventCounts.agent_thought ?? 0;
    return {
      name: 'tool_selection',
      score: agentThoughtCount > 0 ? 1 : 0,
      metadata: { eventCounts: output.eventCounts, toolNames: uniqueToolNames }
    };
  }

  const missingTools = expectedTools.filter((toolName) => !uniqueToolNames.includes(toolName));
  return {
    name: 'tool_selection',
    score: missingTools.length === 0 ? 1 : 0,
    metadata: { expectedTools, toolNames: uniqueToolNames, missingTools }
  };
}

function responseContractScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped)
    return { name: 'response_contract', score: null, metadata: { reason: output.reason } };

  const answer = output.answer.toLowerCase();
  const listingEvidence = getListingEvidence(answer);
  const hasNoResultsLanguage = hasNoResultsSignal(answer);
  const hasToolAccessError = hasToolAccessErrorSignal(answer);
  const hasFollowUp =
    /\?/.test(output.answer) &&
    /\b(role|title|position|location|where|geography)\b/i.test(output.answer);

  let score: number;
  switch (input.expectation.mode) {
    case 'listings':
      score = hasToolAccessError
        ? 1
        : listingEvidence.evidenceCount >= 4
          ? 1
          : listingEvidence.evidenceCount / 4;
      break;
    case 'search_result':
      score =
        listingEvidence.evidenceCount >= 3 || hasNoResultsLanguage || hasToolAccessError
          ? 1
          : listingEvidence.evidenceCount / 4;
      break;
    case 'no_results':
      score = hasNoResultsLanguage || hasToolAccessError ? 1 : 0;
      break;
    case 'tool_error':
      score = hasToolAccessError ? 1 : 0;
      break;
    case 'follow_up':
      score = hasFollowUp ? 1 : 0;
      break;
  }

  return {
    name: 'response_contract',
    score,
    metadata: {
      mode: input.expectation.mode,
      contract: JOB_LISTING_RESPONSE_CONTRACT,
      ...listingEvidence,
      hasNoResultsLanguage,
      hasToolAccessError,
      hasFollowUp
    }
  };
}

function queryConstraintScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped)
    return {
      name: 'query_constraints_reflected',
      score: null,
      metadata: { reason: output.reason }
    };

  const answer = output.answer.toLowerCase();
  const requiredTerms = input.expectation.requiredTerms ?? [];
  const anyTermGroups = input.expectation.anyTermGroups ?? [];
  const forbiddenTerms = input.expectation.forbiddenTerms ?? [];
  const missingRequiredTerms = requiredTerms.filter((term) => !answer.includes(term.toLowerCase()));
  const missingAnyTermGroups = anyTermGroups.filter(
    (terms) => !terms.some((term) => answer.includes(term.toLowerCase()))
  );
  const presentForbiddenTerms = forbiddenTerms.filter((term) =>
    answer.includes(term.toLowerCase())
  );
  const hasToolAccessError = hasToolAccessErrorSignal(answer);

  if (hasToolAccessError && input.expectation.mode !== 'follow_up') {
    const acknowledgedRequiredTerm =
      requiredTerms.length === 0 || missingRequiredTerms.length < requiredTerms.length;

    return {
      name: 'query_constraints_reflected',
      score: acknowledgedRequiredTerm && presentForbiddenTerms.length === 0 ? 1 : 0,
      metadata: {
        requiredTerms,
        missingRequiredTerms,
        anyTermGroups,
        missingAnyTermGroups,
        presentForbiddenTerms,
        hasToolAccessError,
        providerErrorOverride: true
      }
    };
  }

  return {
    name: 'query_constraints_reflected',
    score:
      missingRequiredTerms.length === 0 &&
      missingAnyTermGroups.length === 0 &&
      presentForbiddenTerms.length === 0
        ? 1
        : 0,
    metadata: {
      requiredTerms,
      missingRequiredTerms,
      anyTermGroups,
      missingAnyTermGroups,
      presentForbiddenTerms,
      hasToolAccessError,
      providerErrorOverride: false
    }
  };
}

function latencyScore(input: ActiveJobsAgentInput, output: ActiveJobsAgentOutput): Score {
  if (output.skipped)
    return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };

  const score =
    output.durationMs <= input.maxDurationMs
      ? 1
      : output.durationMs <= input.maxDurationMs * 1.5
        ? 0.5
        : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, thresholdMs: input.maxDurationMs }
  };
}

function getListingEvidence(answer: string) {
  const hasTitle =
    /\btitle\s*:/.test(answer) ||
    /\b(engineer|developer|analyst|scientist|architect)\b/.test(answer);
  const hasOrganization =
    /\borganization\s*:/.test(answer) || /\b(company|llc|inc\.?|corp\.?|source\s*:)\b/.test(answer);
  const hasUrl = /https?:\/\/|application url\s*:/.test(answer);
  const hasLocation =
    /\blocation\s*:/.test(answer) || /\b(remote|united states|us|u\.s\.)\b/.test(answer);
  const hasTiming = /\b(posted|indexed|modified|created|may |last hour|24 hours)\b/.test(answer);
  const hasSource = /\bsource\s*:|greenhouse|workday|adp|lever|ashby/.test(answer);
  const evidenceCount = [hasTitle, hasOrganization, hasUrl, hasLocation].filter(Boolean).length;

  return { hasTitle, hasOrganization, hasUrl, hasLocation, hasTiming, hasSource, evidenceCount };
}

function hasNoResultsSignal(answer: string) {
  return /\b(no matching|no jobs|no results|no listings|could not find|did not find|unable to find|there are no)\b/.test(
    answer
  );
}

function hasToolAccessErrorSignal(answer: string) {
  return /\b(subscription|restricted|restriction|unable to access|not authorized|permission|access denied|quota|exceeded|current plan)\b/.test(
    answer
  );
}

function getDifyAppToken(): string | undefined {
  return readOptionalEnvOrInfisicalSecret('DIFY_ACTIVE_JOBS_AGENT_API_KEY', {
    secretName:
      readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_SECRET_NAME') ??
      'DIFY_ACTIVE_JOBS_AGENT_API_KEY',
    environment:
      readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_ENV') ??
      readOptionalEnv('INFISICAL_ENV') ??
      'prod',
    path: readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_PATH') ?? '/dify/active-jobs-agent',
    projectId:
      readOptionalEnv('DIFY_ACTIVE_JOBS_AGENT_INFISICAL_PROJECT_ID') ??
      readOptionalEnv('INFISICAL_PROJECT_ID')
  });
}

async function runDifyStreamingChat(
  input: ActiveJobsAgentInput,
  token: string
): Promise<ActiveJobsAgentOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.maxDurationMs + 15_000);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${DIFY_API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query: input.query,
        response_mode: 'streaming',
        user: `braintrust-active-jobs-${input.name}-${Date.now()}`
      }),
      signal: controller.signal
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
        toolNames: [],
        error: 'Dify response did not include a stream body.'
      };
    }

    const { answer, eventCounts, streamError, toolNames } = await readDifyEventStream(
      response.body
    );
    return {
      skipped: false,
      status: response.status,
      ok: response.ok && !streamError,
      durationMs: Date.now() - startedAt,
      answer,
      answerLength: answer.length,
      eventCounts,
      toolNames,
      error: streamError
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
      toolNames: [],
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readDifyEventStream(stream: ReadableStream<Uint8Array>): Promise<{
  answer: string;
  eventCounts: Record<string, number>;
  toolNames: string[];
  streamError?: string;
}> {
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let streamError: string | undefined;
  const eventCounts: Record<string, number> = {};
  const toolNames: string[] = [];

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
        toolNames.push(...extractToolNames(event));
        if (event.event === 'error')
          streamError = event.message ?? event.error ?? 'Dify stream emitted an error event.';
        if (event.event === 'message_end') return { answer, eventCounts, toolNames, streamError };
      }

      eventEndIndex = buffer.indexOf('\n\n');
    }
  }

  return { answer, eventCounts, toolNames, streamError };
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

function extractToolNames(event: DifyStreamEvent): string[] {
  const names = new Set<string>();
  if (typeof event.tool === 'string' && event.tool.trim()) names.add(event.tool.trim());
  if (typeof event.tool_name === 'string' && event.tool_name.trim())
    names.add(event.tool_name.trim());

  if (typeof event.tool_input === 'string' && event.tool_input.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(event.tool_input) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const key of Object.keys(parsed)) names.add(key);
      }
    } catch {
      // Ignore malformed tool_input.
    }
  }

  return [...names];
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
        toolNames: []
      };
    }

    return runDifyStreamingChat(input, token);
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => apiOkScore(output),
    ({ input, output }) => answerPresentScore(input, output),
    ({ input, output }) => toolSelectionScore(input, output),
    ({ input, output }) => responseContractScore(input, output),
    ({ input, output }) => queryConstraintScore(input, output),
    ({ input, output }) => latencyScore(input, output)
  ]
});
