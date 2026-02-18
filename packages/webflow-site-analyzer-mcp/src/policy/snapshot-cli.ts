#!/usr/bin/env node

import { refreshWebflowPolicySnapshot } from './index.js';

async function main(): Promise<void> {
  const snapshot = await refreshWebflowPolicySnapshot();
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`policy snapshot failed: ${message}\n`);
  process.exit(1);
});
