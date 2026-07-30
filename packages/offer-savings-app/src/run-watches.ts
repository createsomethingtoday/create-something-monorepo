#!/usr/bin/env node

import { createLiveOfferService, readOfferSavingsRuntimeConfig } from './runtime.js';

function readRunKey(argv: string[]): string {
  const index = argv.indexOf('--run-key');
  const value = index >= 0 ? argv[index + 1]?.trim() : process.env.OFFER_WATCH_RUN_KEY?.trim();
  if (!value) {
    throw new Error(
      'Provide a stable scheduler attempt key with --run-key or OFFER_WATCH_RUN_KEY.'
    );
  }
  return value;
}

async function main(): Promise<void> {
  const config = readOfferSavingsRuntimeConfig();
  const result = await createLiveOfferService(config).runDueWatches({
    runKey: readRunKey(process.argv.slice(2))
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Offer watch execution failed.');
  process.exitCode = 1;
});
