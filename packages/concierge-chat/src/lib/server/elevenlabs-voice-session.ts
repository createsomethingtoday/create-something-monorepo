export const ELEVENLABS_CONVERSATION_TOKEN_URL =
  'https://api.elevenlabs.io/v1/convai/conversation/token';

export function createVoiceSessionRatePolicies(subject: string) {
  return [
    {
      scope: 'voice_session.ip.10m',
      subject,
      windowMs: 10 * 60 * 1000,
      maxHits: 8
    },
    {
      scope: 'voice_session.ip.1d',
      subject,
      windowMs: 24 * 60 * 60 * 1000,
      maxHits: 30
    }
  ];
}

interface CreateElevenLabsVoiceSessionOptions {
  apiKey?: string;
  agentId?: string;
  fetchImpl?: typeof fetch;
}

interface ElevenLabsConversationTokenResponse {
  token?: unknown;
}

export function isAllowedVoiceSessionRequest(request: Request, requestUrl: URL): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function createVoiceSessionRequestDeniedResponse(): Response {
  return json(
    {
      error: 'request_not_allowed',
      message: 'Voice Concierge could not start from this page.'
    },
    403
  );
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
