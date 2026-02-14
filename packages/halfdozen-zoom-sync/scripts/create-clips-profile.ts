#!/usr/bin/env npx tsx
/**
 * Create a Steel profile for Zoom Clips (one-time setup).
 * Opens a browser session with persistProfile: true; you log into Zoom in the viewer,
 * then we release the session. Steel returns a profileId — use it with the MCP tool set_clips_profile.
 *
 *   STEEL_API_KEY=xxx pnpm run create-clips-profile
 *   # or: STEEL_API_KEY=xxx npx tsx scripts/create-clips-profile.ts
 */
import 'dotenv/config';
import * as readline from 'readline';
import { SteelClient } from '../src/lib/steel.js';

const apiKey = process.env.STEEL_API_KEY;
if (!apiKey) {
  console.error('Set STEEL_API_KEY (e.g. in .env or export).');
  process.exit(1);
}

const steel = new SteelClient(apiKey);

async function main() {
  console.log('Creating Steel session with persistProfile: true...');
  const session = await steel.createSession({
    timeout: 15 * 60 * 1000,
    persistProfile: true,
  });

  const raw = session as unknown as { profileId?: string; profile_id?: string; sessionViewerUrl?: string; session_viewer_url?: string };
  const profileId = session.profileId ?? raw.profile_id;
  const viewerUrl = session.sessionViewerUrl ?? raw.session_viewer_url;
  if (!profileId) {
    console.warn('Steel did not return a profileId in the create response. The profile may still be created after release; check Steel dashboard.');
  }

  console.log('\n--- Log in to Zoom in the browser ---');
  console.log('Open this URL in your browser and sign in to Zoom:\n');
  console.log(viewerUrl || '(check Steel dashboard for session viewer URL)');
  console.log('\nWhen you are logged in and the Zoom Clips page has loaded, come back here.');
  console.log('The session will be released and the profile saved (ready for set_clips_profile).\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<string>((resolve) => rl.question('Press Enter to release the session and save the profile... ', resolve));
  rl.close();

  await steel.releaseSession(session.id);
  console.log('Session released. Profile is now READY (or will be shortly).\n');

  if (profileId) {
    console.log('Use this profile ID with the Zoom MCP set_clips_profile tool:\n');
    console.log(profileId);
    console.log('\nExample (via MCP client): set_clips_profile(profile_id="' + profileId + '")');
    console.log('Profile expires after 30 days unused; run this script again to create a new profile.');
  } else {
    console.log('Check the Steel dashboard for the profile ID linked to this session, then call set_clips_profile with that ID.');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
