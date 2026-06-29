import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAgencyAccessControlPlaneSurface } from '$lib/agency-access';
import { buildControlPlaneBridgeHref } from '$lib/control-plane';
import { callDifyChat, type DifyChatOutput } from '$lib/server/dify/client';
import {
  getDifyOperatorAgent,
  getDifyOperatorAgentViews,
  toDifyOperatorAgentView,
  type DifyOperatorAgent
} from '$lib/server/dify/agent-registry';
import { getAgencyAccessStateForRequest } from '$lib/server/agency-access';
import { ensureConciergeSession } from '$lib/server/threads/session';

type OperatorMessageRole = 'assistant' | 'user';
type ProofTone = 'good' | 'warn' | 'danger';

interface OperatorChatMessage {
  id: string;
  role: OperatorMessageRole;
  author: string;
  body: string;
  createdAt: string;
  state?: 'ready' | 'pending' | 'blocked';
}

interface OperatorProofEvent {
  label: string;
  value: string;
  tone: ProofTone;
  detail: string;
}

interface OperatorActionResult {
  messages: OperatorChatMessage[];
  conversationId: string;
  proofEvents: OperatorProofEvent[];
  submitError?: string;
}

const MAX_TRANSCRIPT_MESSAGES = 32;
const MAX_MESSAGE_CHARS = 6000;

function getRequiredAgent(agentId: string | undefined): DifyOperatorAgent {
  const agent = agentId ? getDifyOperatorAgent(agentId) : null;

  if (!agent) {
    throw error(404, `Unknown Dify operator agent: ${agentId ?? '(missing)'}`);
  }

  return agent;
}

function createOperatorMessage(input: {
  role: OperatorMessageRole;
  author: string;
  body: string;
  state?: OperatorChatMessage['state'];
}): OperatorChatMessage {
  return {
    id: crypto.randomUUID(),
    role: input.role,
    author: input.author,
    body: input.body,
    createdAt: new Date().toISOString(),
    state: input.state
  };
}

function getInitialMessages(agent: DifyOperatorAgent): OperatorChatMessage[] {
  return [
    createOperatorMessage({
      role: 'assistant',
      author: 'Abundance operator shell',
      body: `${agent.label} is selected. Ask for the next operator action, required proof, or a concise handoff brief.`,
      state: 'ready'
    })
  ];
}

function isOperatorMessage(value: unknown): value is OperatorChatMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.role === 'assistant' || record.role === 'user') &&
    typeof record.author === 'string' &&
    typeof record.body === 'string' &&
    typeof record.createdAt === 'string'
  );
}

function parseTranscript(rawValue: FormDataEntryValue | null, agent: DifyOperatorAgent) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return getInitialMessages(agent);
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return getInitialMessages(agent);
    }

    const messages = parsed
      .filter(isOperatorMessage)
      .slice(-MAX_TRANSCRIPT_MESSAGES)
      .map((message) => ({
        ...message,
        id: typeof message.id === 'string' && message.id ? message.id : crypto.randomUUID(),
        body: message.body.slice(0, MAX_MESSAGE_CHARS)
      }));

    return messages.length > 0 ? messages : getInitialMessages(agent);
  } catch {
    return getInitialMessages(agent);
  }
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function buildProofEvents(output: DifyChatOutput, agent: DifyOperatorAgent): OperatorProofEvent[] {
  const statusTone: ProofTone = output.ok ? 'good' : output.skipped ? 'warn' : 'danger';
  const proofEvents: OperatorProofEvent[] = [
    {
      label: 'Dify proxy',
      value: output.skipped ? 'Skipped' : output.status ? String(output.status) : 'No status',
      tone: statusTone,
      detail: output.skipped
        ? (output.reason ?? `Missing ${agent.apiKeyEnv}`)
        : output.error
          ? output.error
          : `${agent.id} answered through the server-side chat-messages route.`
    },
    {
      label: 'Runtime',
      value: `${output.durationMs} ms`,
      tone: output.durationMs > 30_000 ? 'warn' : 'good',
      detail: 'Duration measured by the CREATE SOMETHING proxy.'
    }
  ];

  if (output.messageId) {
    proofEvents.push({
      label: 'Message ID',
      value: output.messageId,
      tone: 'good',
      detail: 'Use this ID with Dify monitoring or Langfuse trace inspection.'
    });
  }

  if (output.conversationId) {
    proofEvents.push({
      label: 'Conversation ID',
      value: output.conversationId,
      tone: 'good',
      detail: 'The browser stores only the opaque conversation handle.'
    });
  }

  for (const toolCall of output.toolCalls) {
    proofEvents.push({
      label: 'Tool call',
      value: toolCall.tool,
      tone: toolCall.hasObservation ? 'good' : 'warn',
      detail: toolCall.hasObservation
        ? `Observation captured server-side (${toolCall.observationBytes} bytes).`
        : 'Tool name was reported without an observation payload.'
    });
  }

  return proofEvents;
}

function buildAssistantBody(output: DifyChatOutput, agent: DifyOperatorAgent): string {
  if (output.answer.trim()) {
    return output.answer.trim();
  }

  if (output.skipped) {
    return `I cannot call ${agent.label} yet. ${output.reason ?? `Bind ${agent.apiKeyEnv} first.`}`;
  }

  return `The Dify request completed without a usable answer. ${output.error ?? 'Check Dify monitoring with the returned status.'}`;
}

export const load: PageServerLoad = async ({ parent, params, platform }) => {
  const parentData = await parent();
  const accessAllowed = parentData.agencyAccess.status === 'allowed';
  const agent = getRequiredAgent(params.agentId);

  return {
    accessAllowed,
    controlPlaneHref: buildControlPlaneBridgeHref(
      getAgencyAccessControlPlaneSurface(parentData.agencyAccess)
    ),
    agents: accessAllowed ? getDifyOperatorAgentViews(platform) : [],
    selectedAgent: accessAllowed ? toDifyOperatorAgentView(agent, platform) : null,
    initialMessages: accessAllowed ? getInitialMessages(agent) : [],
    initialProofEvents: [] satisfies OperatorProofEvent[]
  };
};

export const actions: Actions = {
  default: async ({ cookies, fetch, params, platform, request, url }) => {
    const agencyAccess = await getAgencyAccessStateForRequest({
      cookies,
      fetch,
      request,
      platform
    });
    const accessAllowed = agencyAccess.status === 'allowed';
    const agent = getRequiredAgent(params.agentId);

    const formData = await request.formData();
    const messages = parseTranscript(formData.get('transcript'), agent);
    const conversationId = readString(formData, 'conversationId');
    const query = readString(formData, 'message').slice(0, MAX_MESSAGE_CHARS);

    if (!accessAllowed) {
      return fail(403, {
        messages,
        conversationId,
        proofEvents: [],
        submitError: 'Staff access is required before calling Dify agents.'
      } satisfies OperatorActionResult);
    }

    if (!query) {
      return fail(400, {
        messages,
        conversationId,
        proofEvents: [],
        submitError: 'Enter a message before sending.'
      } satisfies OperatorActionResult);
    }

    const nextMessages = [
      ...messages,
      createOperatorMessage({
        role: 'user',
        author: 'Operator',
        body: query,
        state: 'ready'
      })
    ];
    const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
    const output = await callDifyChat({
      agent,
      query,
      conversationId,
      user: `abundance-operator-${sessionId}`,
      platform,
      fetch
    });

    return {
      messages: [
        ...nextMessages,
        createOperatorMessage({
          role: 'assistant',
          author: agent.label,
          body: buildAssistantBody(output, agent),
          state: output.ok ? 'ready' : output.skipped ? 'blocked' : 'pending'
        })
      ],
      conversationId: output.conversationId ?? conversationId,
      proofEvents: buildProofEvents(output, agent),
      submitError: output.ok || output.skipped ? undefined : output.error
    } satisfies OperatorActionResult;
  },
  reset: async ({ cookies, fetch, params, platform, request }) => {
    const agencyAccess = await getAgencyAccessStateForRequest({
      cookies,
      fetch,
      request,
      platform
    });
    const agent = getRequiredAgent(params.agentId);

    if (agencyAccess.status !== 'allowed') {
      return fail(403, {
        messages: [],
        conversationId: '',
        proofEvents: [],
        submitError: 'Staff access is required before resetting an operator chat.'
      } satisfies OperatorActionResult);
    }

    return {
      messages: getInitialMessages(agent),
      conversationId: '',
      proofEvents: []
    } satisfies OperatorActionResult;
  }
};
