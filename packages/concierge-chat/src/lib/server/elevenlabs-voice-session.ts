export const ELEVENLABS_CONVERSATION_TOKEN_URL =
  'https://api.elevenlabs.io/v1/convai/conversation/token';

interface CreateElevenLabsVoiceSessionOptions {
  apiKey?: string;
  agentId?: string;
  fetchImpl?: typeof fetch;
}

interface ElevenLabsConversationTokenResponse {
  token?: unknown;
}

const noStoreHeaders = {
  'Cache-Control': 'no-store, private',
  Pragma: 'no-cache'
};

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: noStoreHeaders
  });
}

function sessionStartFailed(): Response {
  return json(
    {
      error: 'session_start_failed',
      message: 'Voice Concierge could not start. Please try again or continue in writing.'
    },
    502
  );
}

export async function createElevenLabsVoiceSessionResponse({
  apiKey,
  agentId,
  fetchImpl = fetch
}: CreateElevenLabsVoiceSessionOptions): Promise<Response> {
  const standardKey = apiKey?.trim();
  const configuredAgentId = agentId?.trim();
  if (!standardKey || !configuredAgentId) {
    return json(
      {
        error: 'voice_unavailable',
        message: 'Voice Concierge is not configured right now. Continue with the written application.'
      },
      503
    );
  }

  const tokenUrl = new URL(ELEVENLABS_CONVERSATION_TOKEN_URL);
  tokenUrl.searchParams.set('agent_id', configuredAgentId);

  let upstream: Response;
  try {
    upstream = await fetchImpl(tokenUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'xi-api-key': standardKey
      }
    });
  } catch {
    return sessionStartFailed();
  }

  if (!upstream.ok) return sessionStartFailed();

  let payload: ElevenLabsConversationTokenResponse;
  try {
    payload = (await upstream.json()) as ElevenLabsConversationTokenResponse;
  } catch {
    return sessionStartFailed();
  }

  if (typeof payload.token !== 'string' || !payload.token.trim()) {
    return sessionStartFailed();
  }

  return json({ conversationToken: payload.token }, 200);
}
