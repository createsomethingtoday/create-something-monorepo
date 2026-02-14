#!/usr/bin/env npx tsx
/**
 * Fetch session context (cookies) from a Steel session by ID.
 * Use the printed JSON with the Zoom MCP upload_session_context tool.
 *
 *   STEEL_API_KEY=xxx npx tsx scripts/fetch-session-context.ts <session-id>
 *   # e.g. STEEL_API_KEY=xxx npx tsx scripts/fetch-session-context.ts ed31e1eb-07f2-4b41-b7b9-7f7f539d067d
 */
import 'dotenv/config';
import { SteelClient } from '../src/lib/steel.js';

const sessionId = process.argv[2];
const apiKey = process.env.STEEL_API_KEY;

if (!sessionId || !apiKey) {
  console.error('Usage: STEEL_API_KEY=xxx npx tsx scripts/fetch-session-context.ts <session-id>');
  process.exit(1);
}

const steel = new SteelClient(apiKey);

steel
  .getSessionContext(sessionId)
  .then((context) => {
    console.log(JSON.stringify(context, null, 2));
  })
  .catch((e: unknown) => {
    console.error('Failed to fetch session context:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
