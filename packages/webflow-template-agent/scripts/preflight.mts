// Runs before every deploy. Stops the deploy when the model API would reject
// the Worker's request, the cause of the 2026-10-30 outage (CRE-2460).
// The check uses the free token-count endpoint.
import { readFileSync } from 'node:fs';

import { preflightModelRequest } from '../src/agent.js';
import type { Env } from '../src/types.js';

if (process.env.SKIP_MODEL_PREFLIGHT === '1') {
  console.warn('Model preflight skipped (SKIP_MODEL_PREFLIGHT=1). The request shape is not checked.');
  process.exit(0);
}

const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.WEBFLOW_ANTHROPIC_KEY;
if (!apiKey) {
  console.error('Model preflight needs ANTHROPIC_API_KEY or WEBFLOW_ANTHROPIC_KEY. Run the deploy under `infisical run`.');
  process.exit(1);
}

// Check the model that this deploy ships, not the code default.
const model = /^ANTHROPIC_MODEL\s*=\s*"([^"]+)"/m.exec(readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'))?.[1];
const result = await preflightModelRequest({ ANTHROPIC_API_KEY: apiKey, ANTHROPIC_MODEL: model } as Env);

if (result.state === 'accepted') {
  console.log(`Model preflight passed (${model ?? 'default model'}).`);
} else if (result.state === 'rejected') {
  console.error(`Model preflight FAILED: the API rejects the request (HTTP ${result.status}). ${result.detail ?? ''}`);
  console.error('Do not deploy. Every visitor turn would fail.');
  process.exit(1);
} else {
  console.error(`Model preflight could not run (HTTP ${result.status ?? 'none'}). Try again, or set SKIP_MODEL_PREFLIGHT=1 to deploy without the check.`);
  process.exit(1);
}
