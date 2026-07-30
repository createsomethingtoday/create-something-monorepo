import { resolve } from 'node:path';

import { createAgentOfferDiscoveryProvider } from '@create-something/offer-resolution/agent';
import {
  createFileOfferWatchRepository,
  createOfferService,
  type OfferService
} from '@create-something/offer-resolution';

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export interface OfferSavingsRuntimeConfig {
  port: number;
  stateFile: string;
  model: string;
  maxTurns: number;
}

export function readOfferSavingsRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): OfferSavingsRuntimeConfig {
  if (!environment.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is required for live public-offer discovery.');
  }
  if (!environment.OFFER_STATE_FILE?.trim()) {
    throw new Error(
      'OFFER_STATE_FILE is required so offer watches have an explicit durable location.'
    );
  }
  return {
    port: positiveInteger(environment.PORT, 8791, 'PORT'),
    stateFile: resolve(environment.OFFER_STATE_FILE),
    model: environment.OFFER_AGENT_MODEL?.trim() || 'gpt-5.4-mini',
    maxTurns: positiveInteger(environment.OFFER_AGENT_MAX_TURNS, 6, 'OFFER_AGENT_MAX_TURNS')
  };
}

export function createLiveOfferService(config: OfferSavingsRuntimeConfig): OfferService {
  return createOfferService({
    discovery: createAgentOfferDiscoveryProvider({
      model: config.model,
      maxTurns: config.maxTurns
    }),
    watches: createFileOfferWatchRepository({ filePath: config.stateFile })
  });
}
