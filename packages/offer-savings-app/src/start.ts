#!/usr/bin/env node

import { createOfferSavingsHttpServer } from './http.js';
import { createLiveOfferService, readOfferSavingsRuntimeConfig } from './runtime.js';

async function main(): Promise<void> {
  const config = readOfferSavingsRuntimeConfig();
  const server = createOfferSavingsHttpServer({ service: createLiveOfferService(config) });
  server.listen(config.port, '0.0.0.0', () => {
    console.error(`Offer Savings Agent listening on :${config.port}/mcp`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Offer Savings Agent failed to start.');
  process.exitCode = 1;
});
