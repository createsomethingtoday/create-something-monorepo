/**
 * Test Notion API connection (token + database access).
 * Run from package root with NOTION_API_KEY and NOTION_DATABASE_ID in env or .env.
 *
 *   pnpm run test:notion
 *   # or: NOTION_API_KEY=xxx NOTION_DATABASE_ID=yyy npx tsx scripts/test-notion.ts
 */
import 'dotenv/config';
import { notionQueryDatabase } from '../src/lib/notion.js';

const apiKey = process.env.NOTION_API_KEY;
const databaseId = process.env.NOTION_DATABASE_ID;

if (!apiKey || !databaseId) {
  console.error('Missing NOTION_API_KEY or NOTION_DATABASE_ID (set in .env or environment)');
  process.exit(1);
}

async function main() {
  try {
    const result = await notionQueryDatabase(apiKey, databaseId, {}, 1);
    console.log('OK: Notion connection works. Database query returned', result.results?.length ?? 0, 'page(s).');
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Notion test failed:', err.message);
    process.exit(1);
  }
}

main();
