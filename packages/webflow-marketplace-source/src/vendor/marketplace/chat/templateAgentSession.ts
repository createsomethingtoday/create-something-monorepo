export type FetchLike = typeof fetch;

export interface AgentRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_REQUEST_MESSAGES = 20;
export const MAX_REQUEST_MESSAGE_CHARS = 4_000;
const MAX_REQUEST_TOTAL_CHARS = 40_000;

interface SessionResponse {
  session_token?: unknown;
}

export async function requestTemplateAgentSession(
  apiBase: string,
  turnstileToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(`${apiBase.replace(/\/+$/, '')}/api/templates/agent/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstile_token: turnstileToken }),
  });
  if (!response.ok) throw new Error(`Session unavailable (${response.status}).`);

  const payload = (await response.json()) as SessionResponse;
  if (typeof payload.session_token !== 'string' || payload.session_token.length < 32) {
    throw new Error('Session unavailable (invalid response).');
  }
  return payload.session_token;
}

export interface AuthorizedAgentRequest {
  url: string;
  init: RequestInit | (() => RequestInit);
  getSessionToken: () => Promise<string>;
  clearSessionToken: () => void;
  clearContextToken?: () => void;
  fetchImpl?: FetchLike;
}

export function prepareAgentMessages(messages: AgentRequestMessage[]): AgentRequestMessage[] {
  const prepared: AgentRequestMessage[] = [];
  let remainingChars = MAX_REQUEST_TOTAL_CHARS;

  for (let index = messages.length - 1; index >= 0 && prepared.length < MAX_REQUEST_MESSAGES; index -= 1) {
    const message = messages[index];
    if (!message || remainingChars <= 0) break;
    const content = message.content.slice(0, Math.min(MAX_REQUEST_MESSAGE_CHARS, remainingChars));
    if (!content.trim()) continue;
    prepared.push({ role: message.role, content });
    remainingChars -= content.length;
  }

  return prepared.reverse();
}

async function hasErrorCode(response: Response, code: string): Promise<boolean> {
  if (response.status !== 400) return false;
  try {
    const payload = (await response.clone().json()) as { code?: unknown };
    return payload.code === code;
  } catch {
    return false;
  }
}

/** Transparently remints expired sessions and drops expired continuity once. */
export async function fetchAuthorizedAgentRequest({
  url,
  init,
  getSessionToken,
  clearSessionToken,
  clearContextToken,
  fetchImpl = fetch,
}: AuthorizedAgentRequest): Promise<Response> {
  const attempt = async () => {
    const sessionToken = await getSessionToken();
    const requestInit = typeof init === 'function' ? init() : init;
    return fetchImpl(url, {
      ...requestInit,
      headers: {
        ...(requestInit.headers ?? {}),
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  };

  let response = await attempt();
  if (response.status === 401) {
    clearSessionToken();
    response = await attempt();
  }
  if (clearContextToken && (await hasErrorCode(response, 'invalid_context'))) {
    clearContextToken();
    response = await attempt();
  }
  return response;
}
