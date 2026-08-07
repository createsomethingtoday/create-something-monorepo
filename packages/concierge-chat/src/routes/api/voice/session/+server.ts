import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

import {
  createElevenLabsVoiceSessionResponse,
  createVoiceSessionRatePolicies,
  createVoiceSessionRequestDeniedResponse,
  isAllowedVoiceSessionRequest
} from '$lib/server/elevenlabs-voice-session';
import { resolveRequestIp } from '$lib/server/observability';
import {
  createRateLimitedJsonResponse,
  enforcePublicWritePolicies
} from '$lib/server/public-write-limits';

export const POST: RequestHandler = async ({ platform, request, url }) => {
  if (!isAllowedVoiceSessionRequest(request, url)) {
    return createVoiceSessionRequestDeniedResponse();
  }

  const subject = `ip:${resolveRequestIp(request)}`;
  const limitResult = await enforcePublicWritePolicies({
    platform,
    policies: createVoiceSessionRatePolicies(subject)
  });

  if (!limitResult.ok && limitResult.blockedPolicy) {
    return createRateLimitedJsonResponse(
      'Too many voice sessions were started from this connection. Wait and try again.',
      limitResult.blockedPolicy.retryAfterSeconds
    );
  }

  const apiKey = platform?.env?.ELEVENLABS_API_KEY ?? env.ELEVENLABS_API_KEY;
  const agentId = platform?.env?.ELEVENLABS_AGENT_ID ?? env.ELEVENLABS_AGENT_ID;
  return createElevenLabsVoiceSessionResponse({ apiKey, agentId });
};
