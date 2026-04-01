#!/usr/bin/env node

import { createServer } from './server.js';

export { createServer } from './server.js';
export { handleApplyWebhook } from './webhook.js';
export { createZipRecruiterClient } from './services/api.js';

async function main() {
  const server = createServer();
  await server.serveStdio();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
