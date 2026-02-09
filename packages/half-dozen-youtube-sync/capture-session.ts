#!/usr/bin/env npx tsx
/**
 * Capture YouTube Session Context
 * 
 * Creates a Steel session with a live view where you can log into Google/YouTube.
 * Once authenticated, captures the session context and saves it locally.
 * This context is then reused by the MCP server for authenticated transcript extraction.
 * 
 * Usage:
 *   pnpm capture:session
 *   npx tsx capture-session.ts
 * 
 * Steps:
 *   1. Opens a Steel session and prints the Live View URL
 *   2. Open the Live View URL in your browser
 *   3. Navigate to youtube.com and sign in with your Google account
 *   4. Press Enter in this terminal once you're signed in
 *   5. Session context is captured and saved to session-context.json
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import * as readline from 'readline';
import * as fs from 'fs';

const SESSION_CONTEXT_FILE = 'session-context.json';

async function main() {
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('STEEL_API_KEY not set. Add it to your .env file.');
    process.exit(1);
  }

  const client = new Steel({ steelAPIKey: apiKey });

  console.log('\n  Capture YouTube Session Context\n');
  console.log('  ' + '─'.repeat(52));
  console.log('\n  Creating Steel session...\n');

  const session = await client.sessions.create({
    timeout: 15 * 60 * 1000, // 15 minutes to sign in
    solveCaptcha: true,
  });

  const viewerUrl = (session as { sessionViewerUrl?: string }).sessionViewerUrl ||
    `https://app.steel.dev/sessions/${session.id}`;

  console.log(`  Session: ${session.id}`);
  console.log(`\n  Open this URL in your browser:\n`);
  console.log(`  \x1b[1;37m${viewerUrl}\x1b[0m\n`);
  console.log('  ' + '─'.repeat(52));
  console.log(`\n  Steps:`);
  console.log(`  1. Open the Live View URL above`);
  console.log(`  2. Navigate to youtube.com in the Steel browser`);
  console.log(`  3. Sign in with your Google account`);
  console.log(`  4. Verify the transcript panel works (click "Show transcript" on any video)`);
  console.log(`  5. Come back here and press Enter\n`);

  // Wait for user to press Enter
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>(resolve => {
    rl.question('  Press Enter once you are signed in... ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n  Capturing session context...');

  try {
    const context = await client.sessions.context(session.id);

    // Save context to file
    fs.writeFileSync(SESSION_CONTEXT_FILE, JSON.stringify(context, null, 2));
    console.log(`\n  \x1b[32m●\x1b[0m  Context saved to ${SESSION_CONTEXT_FILE}`);
    console.log(`     Contains authenticated YouTube/Google session state`);
    console.log(`     This file is gitignored (contains auth tokens)\n`);
  } catch (error) {
    console.error(`\n  \x1b[31m●\x1b[0m  Failed to capture context: ${(error as Error).message}`);
  } finally {
    console.log('  Releasing session...');
    await client.sessions.release(session.id);
    console.log('  Done.\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
