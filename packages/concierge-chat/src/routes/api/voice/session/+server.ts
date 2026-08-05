import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

import { createElevenLabsVoiceSessionResponse } from '$lib/server/elevenlabs-voice-session';

export const POST: RequestHandler = async ({ platform }) => {
  const apiKey = platform?.env?.ELEVENLABS_API_KEY ?? env.ELEVENLABS_API_KEY;
  const agentId = platform?.env?.ELEVENLABS_AGENT_ID ?? env.ELEVENLABS_AGENT_ID;
  return createElevenLabsVoiceSessionResponse({ apiKey, agentId });
};
