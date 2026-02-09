#!/usr/bin/env npx tsx
/**
 * Capture YouTube Browser Profile
 * 
 * Creates a Steel session where you sign into Google/YouTube.
 * On release, the entire browser profile (cookies, auth state, service workers,
 * Chrome internals) is persisted via Steel's Profiles API.
 * 
 * The profileId is saved to .env and reused for all future sessions —
 * YouTube sees a real signed-in browser, not just restored cookies.
 * 
 * Usage:
 *   pnpm capture:session
 * 
 * Steps:
 *   1. Opens a Steel session with Live View URL
 *   2. Sign into YouTube/Google in the Live View
 *   3. Press Enter → profile saved, profileId written to .env
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import * as readline from 'readline';
import * as fs from 'fs';

async function main() {
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('STEEL_API_KEY not set. Add it to your .env file.');
    process.exit(1);
  }

  const client = new Steel({ steelAPIKey: apiKey });

  console.log('\n  Capture YouTube Browser Profile\n');
  console.log('  ' + '─'.repeat(52));

  // Check for existing profile
  const existingProfileId = process.env.STEEL_PROFILE_ID;
  if (existingProfileId) {
    console.log(`\n  Existing profile: ${existingProfileId}`);
    console.log('  This will create a NEW profile (update the old one by signing in again).\n');
  }

  console.log('  Creating Steel session (persistProfile: true)...\n');

  const session = await client.sessions.create({
    timeout: 15 * 60 * 1000,
    solveCaptcha: true,
    persistProfile: true,
    // If there's an existing profile, build on it
    ...(existingProfileId ? { profileId: existingProfileId } : {}),
  });

  const viewerUrl = (session as { sessionViewerUrl?: string }).sessionViewerUrl ||
    `https://app.steel.dev/sessions/${session.id}`;

  console.log(`  Session: ${session.id}`);
  console.log(`  Profile: ${(session as { profileId?: string }).profileId || 'new'}`);
  console.log(`\n  Open this URL in your browser:\n`);
  console.log(`  \x1b[1;37m${viewerUrl}\x1b[0m\n`);
  console.log('  ' + '─'.repeat(52));
  console.log(`\n  1. Open the Live View URL above`);
  console.log(`  2. Navigate to youtube.com`);
  console.log(`  3. Sign in with your Google account`);
  console.log(`  4. Verify you see the transcript panel on a video`);
  console.log(`  5. Come back here and press Enter\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>(resolve => {
    rl.question('  Press Enter once signed in... ', () => { rl.close(); resolve(); });
  });

  console.log('\n  Releasing session (saving profile)...');
  await client.sessions.release(session.id);

  const profileId = (session as { profileId?: string }).profileId;

  if (!profileId) {
    console.error('\n  No profileId returned. Profile may not have been saved.');
    process.exit(1);
  }

  // Save profileId to .env
  const envPath = '.env';
  let envContent = '';
  try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch { /* no .env yet */ }

  if (envContent.includes('STEEL_PROFILE_ID=')) {
    envContent = envContent.replace(/STEEL_PROFILE_ID=.*/, `STEEL_PROFILE_ID=${profileId}`);
  } else {
    envContent += `\n# Steel browser profile with YouTube/Google auth (captured by pnpm capture:session)\nSTEEL_PROFILE_ID=${profileId}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log(`\n  \x1b[32m●\x1b[0m  Profile saved: ${profileId}`);
  console.log(`     Written to .env as STEEL_PROFILE_ID`);
  console.log(`     All future sessions will use this authenticated browser profile.`);
  console.log(`     Profile expires after 30 days of inactivity.\n`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
