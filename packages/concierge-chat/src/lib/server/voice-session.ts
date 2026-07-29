import { voiceConciergeInstructions, voiceConciergeVoice } from '../voice/knowledge';

export const VOICE_CONCIERGE_MODEL = 'gpt-realtime-2.1';
export const OPENAI_REALTIME_CLIENT_SECRET_URL =
  'https://api.openai.com/v1/realtime/client_secrets';

interface CreateVoiceSessionOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface OpenAIClientSecretResponse {
  value?: unknown;
  expires_at?: unknown;
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

export async function createVoiceSessionResponse({
  apiKey,
  fetchImpl = fetch
}: CreateVoiceSessionOptions): Promise<Response> {
  const standardKey = apiKey?.trim();
  if (!standardKey) {
    return json(
      {
        error: 'voice_unavailable',
        message:
          'Voice Concierge is not configured right now. Continue with the written application.'
      },
      503
    );
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(OPENAI_REALTIME_CLIENT_SECRET_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${standardKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: VOICE_CONCIERGE_MODEL,
          instructions: voiceConciergeInstructions,
          audio: {
            output: {
              voice: voiceConciergeVoice
            }
          }
        }
      })
    });
  } catch {
    return sessionStartFailed();
  }

  if (!upstream.ok) return sessionStartFailed();

  let payload: OpenAIClientSecretResponse;
  try {
    payload = (await upstream.json()) as OpenAIClientSecretResponse;
  } catch {
    return sessionStartFailed();
  }

  if (typeof payload.value !== 'string' || typeof payload.expires_at !== 'number') {
    return sessionStartFailed();
  }

  return json(
    {
      value: payload.value,
      expiresAt: payload.expires_at,
      model: VOICE_CONCIERGE_MODEL
    },
    200
  );
}
