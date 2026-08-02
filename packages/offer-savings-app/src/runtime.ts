import { resolve } from 'node:path';

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
}

export function readOfferSavingsRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): OfferSavingsRuntimeConfig {
  if (!environment.OFFER_STATE_FILE?.trim()) {
    throw new Error(
      'OFFER_STATE_FILE is required so offer watches have an explicit durable location.'
    );
  }
  return {
    port: positiveInteger(environment.PORT, 8791, 'PORT'),
    stateFile: resolve(environment.OFFER_STATE_FILE)
  };
}

export function createLiveOfferService(config: OfferSavingsRuntimeConfig): OfferService {
  return createOfferService({ watches: createFileOfferWatchRepository({ filePath: config.stateFile }) });
}
