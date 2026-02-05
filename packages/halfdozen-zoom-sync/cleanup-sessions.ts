#!/usr/bin/env npx tsx
/**
 * Cleanup all Steel sessions
 */

import 'dotenv/config';
import Steel from 'steel-sdk';

async function main() {
  console.log('Listing Steel sessions...\n');
  
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
  
  try {
    const sessions = await client.sessions.list();
    console.log(`Found ${sessions.sessions?.length || 0} sessions\n`);
    
    if (sessions.sessions && sessions.sessions.length > 0) {
      for (const session of sessions.sessions) {
        console.log(`Releasing session ${session.id} (status: ${session.status})...`);
        try {
          await client.sessions.release(session.id);
          console.log(`  ✓ Released`);
        } catch (e) {
          console.log(`  ✗ Failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
    
    console.log('\nDone!');
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
