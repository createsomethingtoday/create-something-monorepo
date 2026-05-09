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
// Note: Dify Agent Chat apps reject response_mode=blocking. We use streaming
// (SSE) and accumulate `agent_message` chunks until `message_end`, then return
// the assembled draft synchronously.

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
    // Dify expects all inputs as strings — the chat-messages API rejects
    // `boolean` and `number` types in the inputs map. Stringify is_top_level
    // and regenerate so the agent's prompt template binds them cleanly.
    inputs: {
      post_id: input.postId,
      is_top_level: input.isTopLevel ? 'true' : 'false',
      space_id: input.spaceId ?? '',
      author_member_id: input.authorMemberId ?? '',
      author_email: input.authorEmail ?? '',
      author_name: input.authorName ?? '',
      regenerate: input.regenerate ? 'true' : 'false',
    },
    query: buildQuery(input),
    response_mode: 'streaming',
    user: config.user,
    conversation_id: '',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dify chat-messages failed (${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.body) {
    throw new Error('Dify chat-messages returned no body.');
  }

  return await accumulateStream(response.body);
}

async function accumulateStream(body: ReadableStream<Uint8Array>): Promise<DifyDraftResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let messageId: string | null = null;
  let conversationId: string | null = null;
  let lastError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = parseSseEvent(chunk);
      if (event) {
        if (event.event === 'agent_message' || event.event === 'message') {
          if (typeof event.answer === 'string') answer += event.answer;
          if (typeof event.message_id === 'string') messageId = event.message_id;
          if (typeof event.conversation_id === 'string') conversationId = event.conversation_id;
        } else if (event.event === 'message_end') {
          if (typeof event.message_id === 'string') messageId = event.message_id;
          if (typeof event.conversation_id === 'string') conversationId = event.conversation_id;
        } else if (event.event === 'error') {
          lastError = (event.message as string) || JSON.stringify(event);
        }
      }
      idx = buffer.indexOf('\n\n');
    }
  }

  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error(`Dify returned no draft content${lastError ? `: ${lastError}` : ''}`);
  }
  return { answer: trimmed, messageId, conversationId };
}

function parseSseEvent(chunk: string): Record<string, unknown> | null {
  const dataLines: string[] = [];
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  const payload = dataLines.join('\n');
  if (!payload || payload === '[DONE]') return null;
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildQuery(input: DifyDraftInput): string {
  // The Dify agent's system prompt should already tell it what to do.
  // The query is a short, structured directive in case the agent's
  // input-binding setup expects a non-empty query field.
  return input.regenerate
    ? `Regenerate the admin reply for Bettermode post ${input.postId}. Different angle.`
    : `Draft an admin reply for Bettermode post ${input.postId}.`;
}
