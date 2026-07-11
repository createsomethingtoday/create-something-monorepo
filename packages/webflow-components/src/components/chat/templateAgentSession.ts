export type FetchLike = typeof fetch;

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
  init: RequestInit;
  getSessionToken: () => Promise<string>;
  clearSessionToken: () => void;
  fetchImpl?: FetchLike;
}

/** Performs one transparent remint/retry when a short-lived session expires. */
export async function fetchAuthorizedAgentRequest({
  url,
  init,
  getSessionToken,
  clearSessionToken,
  fetchImpl = fetch,
}: AuthorizedAgentRequest): Promise<Response> {
  const attempt = async () => {
    const sessionToken = await getSessionToken();
    return fetchImpl(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  };

  let response = await attempt();
  if (response.status === 401) {
    clearSessionToken();
    response = await attempt();
  }
  return response;
}

