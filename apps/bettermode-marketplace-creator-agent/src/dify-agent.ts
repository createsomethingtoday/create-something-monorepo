// Dify chat-messages client.
//
// The Dify agent app is the canonical drafting brain: it owns the system
// prompt, the policy knowledge base (Submission Guidelines, Grading Rubric,
// Submission Guidelines Updates V2.md), the model choice, and the connected
// bettermode-creator MCP. The worker just hands off the post ID and receives
// the drafted reply.
//
// API: https://docs.dify.ai/en/guides/application-publishing/developing-with-apis/chat-app
//   POST {api_base}/chat-messages
//   Authorization: Bearer <DIFY_AGENT_API_KEY>
//   Body: { inputs, query, response_mode, user, conversation_id }
//
// We use response_mode=blocking so the worker can persist the draft in one
// pass. Streaming would land back in the dynamic block via DB polling.

const DEFAULT_API_BASE = 'https://api.dify.ai/v1';

export type DifyAgentConfig = {
  apiBase: string;
  apiKey: string;
  user: string;
};

export type DifyDraftInput = {
  postId: string;
  isTopLevel: boolean;
  spaceId: string | null;
  authorMemberId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  regenerate: boolean;
};

export type DifyDraftResult = {
  answer: string;
  messageId: string | null;
  conversationId: string | null;
};

export function difyAgentConfig(env: {
  DIFY_API_BASE?: string;
  DIFY_AGENT_API_KEY?: string;
  DIFY_AGENT_USER?: string;
}): DifyAgentConfig | null {
  if (!env.DIFY_AGENT_API_KEY) return null;
  return {
    apiBase: env.DIFY_API_BASE || DEFAULT_API_BASE,
    apiKey: env.DIFY_AGENT_API_KEY,
    user: env.DIFY_AGENT_USER || 'bettermode-marketplace-creator-agent',
  };
}

export async function generateDraftViaDify(
  input: DifyDraftInput,
  config: DifyAgentConfig,
): Promise<DifyDraftResult> {
  const url = `${config.apiBase}/chat-messages`;
  const body = {
    inputs: {
      post_id: input.postId,
      is_top_level: input.isTopLevel,
      space_id: input.spaceId ?? '',
      author_member_id: input.authorMemberId ?? '',
      author_email: input.authorEmail ?? '',
      author_name: input.authorName ?? '',
      regenerate: input.regenerate,
    },
    query: buildQuery(input),
    response_mode: 'blocking',
    user: config.user,
    conversation_id: '',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dify chat-messages failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as DifyChatBlockingResponse;
  const answer = payload.answer?.trim();
  if (!answer) {
    throw new Error('Dify returned no draft content.');
  }

  return {
    answer,
    messageId: payload.message_id || null,
    conversationId: payload.conversation_id || null,
  };
}

type DifyChatBlockingResponse = {
  answer?: string;
  message_id?: string;
  conversation_id?: string;
};

function buildQuery(input: DifyDraftInput): string {
  // The Dify agent's system prompt should already tell it what to do.
  // The query is a short, structured directive in case the agent's
  // input-binding setup expects a non-empty query field.
  return input.regenerate
    ? `Regenerate the admin reply for Bettermode post ${input.postId}. Different angle.`
    : `Draft an admin reply for Bettermode post ${input.postId}.`;
}
