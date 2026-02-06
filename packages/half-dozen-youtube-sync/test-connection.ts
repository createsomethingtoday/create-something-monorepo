#!/usr/bin/env npx tsx
/**
 * Connection Test for Half Dozen YouTube Sync
 * 
 * Verifies all required services are reachable and configured correctly.
 * Run this after setting up your .env to confirm everything works.
 * 
 * Usage:
 *   pnpm test:connection
 *   npx tsx test-connection.ts
 */

import 'dotenv/config';

// =============================================================================
// Test Runner
// =============================================================================

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  detail?: string;
}

const results: TestResult[] = [];

function pass(name: string, message: string, detail?: string) {
  results.push({ name, status: 'pass', message, detail });
}

function fail(name: string, message: string, detail?: string) {
  results.push({ name, status: 'fail', message, detail });
}

function skip(name: string, message: string) {
  results.push({ name, status: 'skip', message });
}

// =============================================================================
// Tests
// =============================================================================

async function testNotionApiKey() {
  const key = process.env.NOTION_API_KEY;
  if (!key) {
    fail('Notion API Key', 'NOTION_API_KEY not set in .env');
    return;
  }

  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (response.ok) {
      const data = await response.json() as { name?: string; type?: string };
      pass('Notion API Key', `Authenticated as "${data.name || 'integration'}" (${data.type || 'bot'})`);
    } else {
      const error = await response.text();
      fail('Notion API Key', `Authentication failed (${response.status})`, error);
    }
  } catch (error) {
    fail('Notion API Key', 'Connection failed', String(error));
  }
}

async function testNotionDatabase() {
  const key = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!key || !dbId) {
    skip('Notion Database', 'Requires NOTION_API_KEY and NOTION_DATABASE_ID');
    return;
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (response.ok) {
      const data = await response.json() as {
        title?: Array<{ plain_text: string }>;
        properties?: Record<string, { type: string }>;
      };

      const title = data.title?.[0]?.plain_text || 'Untitled';
      const props = data.properties ? Object.keys(data.properties) : [];

      // Check for required properties
      const required = ['Item', 'Source URL', 'Status', 'Source', 'Type'];
      const missing = required.filter(r => !props.includes(r));

      if (missing.length > 0) {
        fail('Notion Database', `"${title}" is missing properties: ${missing.join(', ')}`, `Found: ${props.join(', ')}`);
      } else {
        pass('Notion Database', `"${title}" — all required properties found`, `Properties: ${props.join(', ')}`);
      }
    } else {
      const error = await response.text();
      fail('Notion Database', `Could not access database (${response.status})`, error);
    }
  } catch (error) {
    fail('Notion Database', 'Connection failed', String(error));
  }
}

async function testSteelApiKey() {
  const key = process.env.STEEL_API_KEY;
  if (!key) {
    skip('Steel API Key', 'STEEL_API_KEY not set — browser automation disabled (API-only transcripts still work)');
    return;
  }

  try {
    const response = await fetch('https://api.steel.dev/v1/sessions', {
      method: 'GET',
      headers: {
        'steel-api-key': key,
      },
    });

    if (response.ok) {
      const data = await response.json() as { sessions?: unknown[] };
      pass('Steel API Key', 'Authenticated successfully');
    } else if (response.status === 401) {
      fail('Steel API Key', 'Invalid API key');
    } else {
      // Some status codes are acceptable (e.g., 404 means auth worked but endpoint varies)
      pass('Steel API Key', `Key accepted (status: ${response.status})`);
    }
  } catch (error) {
    fail('Steel API Key', 'Connection failed', String(error));
  }
}

async function testYouTubeTranscriptApi() {
  // Test with a well-known video that has captions (Rick Astley - Never Gonna Give You Up)
  const testVideoId = 'dQw4w9WgXcQ';

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${testVideoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      fail('YouTube API', `Could not reach YouTube (${response.status})`);
      return;
    }

    const html = await response.text();
    const hasCaptions = html.includes('"captionTracks"');

    if (hasCaptions) {
      pass('YouTube API', 'YouTube reachable, captions API available');
    } else {
      pass('YouTube API', 'YouTube reachable (caption detection may vary by region)');
    }
  } catch (error) {
    fail('YouTube API', 'Could not reach YouTube', String(error));
  }
}

async function testResendApiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    skip('Resend (Email)', 'RESEND_API_KEY not set — email notifications disabled');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    });

    if (response.ok) {
      pass('Resend (Email)', 'Authenticated — email notifications enabled');
    } else if (response.status === 401) {
      fail('Resend (Email)', 'Invalid API key');
    } else {
      fail('Resend (Email)', `Unexpected response (${response.status})`);
    }
  } catch (error) {
    fail('Resend (Email)', 'Connection failed', String(error));
  }
}

// =============================================================================
// Report
// =============================================================================

function printReport() {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log('\n  Half Dozen YouTube Sync — Connection Test\n');
  console.log('  ' + '─'.repeat(52));

  for (const r of results) {
    const icon = r.status === 'pass' ? '  \x1b[32m●\x1b[0m'
               : r.status === 'fail' ? '  \x1b[31m●\x1b[0m'
               : '  \x1b[33m○\x1b[0m';
    
    console.log(`${icon}  ${r.name}`);
    console.log(`     ${r.message}`);
    if (r.detail) {
      console.log(`     \x1b[2m${r.detail}\x1b[0m`);
    }
    console.log();
  }

  console.log('  ' + '─'.repeat(52));
  console.log(`  ${passed} passed  ${failed} failed  ${skipped} skipped\n`);

  if (failed > 0) {
    console.log('  \x1b[31mFix the failures above, then run again:\x1b[0m');
    console.log('  pnpm test:connection\n');
  } else if (passed > 0) {
    console.log('  \x1b[32mReady to sync.\x1b[0m Try:');
    console.log('  npx tsx batch-sync.ts --check-db');
    console.log('  npx tsx batch-sync.ts --video "https://youtube.com/watch?v=..." --sync\n');
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  await testNotionApiKey();
  await testNotionDatabase();
  await testSteelApiKey();
  await testYouTubeTranscriptApi();
  await testResendApiKey();
  printReport();

  const failed = results.filter(r => r.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
