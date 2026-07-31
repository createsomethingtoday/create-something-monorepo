import { voiceConciergeInstructions, voiceConciergeVoice } from '../voice/knowledge';
import { npgClientServiceInstructions, npgClientServiceVoice } from '../voice/npg-knowledge';

export const VOICE_CONCIERGE_MODEL = 'gpt-realtime-2.1';
export const OPENAI_REALTIME_CLIENT_SECRET_URL =
  'https://api.openai.com/v1/realtime/client_secrets';

interface CreateVoiceSessionOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface VoiceSessionProfile {
  instructions: string;
  voice: string;
  unavailableMessage: string;
  failedMessage: string;
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

function sessionStartFailed(message: string): Response {
  return json(
    {
      error: 'session_start_failed',
      message
    },
    502
  );
}

async function createSessionResponse(
  { apiKey, fetchImpl = fetch }: CreateVoiceSessionOptions,
  profile: VoiceSessionProfile
): Promise<Response> {
  const standardKey = apiKey?.trim();
  if (!standardKey) {
    return json(
      {
        error: 'voice_unavailable',
        message: profile.unavailableMessage
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
          instructions: profile.instructions,
          audio: {
            output: {
              voice: profile.voice
            }
          }
        }
      })
    });
  } catch {
    return sessionStartFailed(profile.failedMessage);
  }

  if (!upstream.ok) return sessionStartFailed(profile.failedMessage);

  let payload: OpenAIClientSecretResponse;
  try {
    payload = (await upstream.json()) as OpenAIClientSecretResponse;
  } catch {
    return sessionStartFailed(profile.failedMessage);
  }

  if (typeof payload.value !== 'string' || typeof payload.expires_at !== 'number') {
    return sessionStartFailed(profile.failedMessage);
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

export function createVoiceSessionResponse(options: CreateVoiceSessionOptions): Promise<Response> {
  return createSessionResponse(options, {
    instructions: voiceConciergeInstructions,
    voice: voiceConciergeVoice,
    unavailableMessage:
      'Voice Concierge is not configured right now. Continue with the written application.',
    failedMessage: 'Voice Concierge could not start. Please try again or continue in writing.'
  });
}

export function createNpgClientServiceSessionResponse(
  options: CreateVoiceSessionOptions
): Promise<Response> {
  return createSessionResponse(options, {
    instructions: npgClientServiceInstructions,
    voice: npgClientServiceVoice,
    unavailableMessage:
      'NPG Client Service is not configured right now. Please ask for a human representative.',
    failedMessage:
      'NPG Client Service could not start. Please try again or ask for a human representative.'
  });
}
