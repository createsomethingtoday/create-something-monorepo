#!/usr/bin/env node
/**
 * Half Dozen Gmail Sync
 * 
 * CLI for syncing Gmail emails to Notion Interactions database.
 * Automatically links to Contacts by email/name matching.
 */

import { config } from 'dotenv';
import { GmailOAuth } from './gmail/oauth.js';
import { GmailClient } from './gmail/client.js';
import { InteractionsClient } from './notion/interactions.js';
import type { InteractionData } from './types.js';

// Load environment variables
config();

const COMMANDS: Record<string, string> = {
  auth: 'Run Gmail OAuth flow (one-time setup)',
  sync: 'Sync emails matching a query to Notion',
  search: 'Search Gmail without syncing',
  labels: 'List Gmail labels',
  test: 'Test connections to Gmail and Notion',
};

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'auth':
      await runAuth();
      break;

    case 'sync':
      await runSync(args);
      break;

    case 'search':
      await runSearch(args);
      break;

    case 'labels':
      await runLabels();
      break;

    case 'test':
      await runTest();
      break;

    default:
      printHelp();
      break;
  }
}

function printHelp() {
  console.log(`
📧 Half Dozen Gmail Sync

Usage: pnpm start <command> [options]

Commands:
${Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`).join('\n')}

Examples:
  pnpm auth                          # Authorize with Gmail (one-time)
  pnpm sync "from:client@co.com"     # Sync emails from a sender
  pnpm sync "label:Important"        # Sync emails with a label
  pnpm search "subject:invoice"      # Search without syncing
  pnpm test:connection               # Test Gmail and Notion connections

Options (for sync/search):
  --limit=N           Maximum emails to process (default: 10)

Note: Contacts are automatically created for unknown senders during sync.

Environment Variables (.env file):
  GOOGLE_CLIENT_ID        Google OAuth Client ID
  GOOGLE_CLIENT_SECRET    Google OAuth Client Secret
  NOTION_API_KEY          Notion Integration Token
  NOTION_INTERACTIONS_DB_ID  Interactions database ID
  NOTION_CONTACTS_DB_ID      Contacts database ID
`);
}

// ═══════════════════════════════════════════════════════════════
// AUTH COMMAND
// ═══════════════════════════════════════════════════════════════

async function runAuth() {
  console.log('\n🔐 Gmail OAuth Authorization\n');
  
  const oauth = new GmailOAuth();
  
  // Check if already authorized
  if (await oauth.hasValidTokens()) {
    console.log('✓ Already authorized. Run `pnpm auth` again to re-authorize.\n');
    
    // Offer to re-authorize
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>(resolve => {
      rl.question('Re-authorize? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      return;
    }
  }

  await oauth.runAuthFlow();
}

// ═══════════════════════════════════════════════════════════════
// SYNC COMMAND
// ═══════════════════════════════════════════════════════════════

async function runSync(args: string[]) {
  const query = args.find(a => !a.startsWith('--'));
  
  if (!query) {
    console.error('❌ Query required.\n');
    console.log('Examples:');
    console.log('  pnpm sync "from:client@example.com"');
    console.log('  pnpm sync "label:Important"');
    console.log('  pnpm sync "subject:invoice after:2024/01/01"');
    process.exit(1);
  }

  // Parse options
  const maxResults = parseInt(
    args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10'
  );

  // Validate environment
  if (!process.env.NOTION_INTERACTIONS_DB_ID || !process.env.NOTION_CONTACTS_DB_ID) {
    console.error('❌ Missing Notion database IDs in .env file.\n');
    console.log('Required:');
    console.log('  NOTION_INTERACTIONS_DB_ID=xxx');
    console.log('  NOTION_CONTACTS_DB_ID=xxx');
    process.exit(1);
  }

  console.log(`\n🔍 Gmail Query: ${query}`);
  console.log(`   Max results: ${maxResults}\n`);

  // Search Gmail
  console.log('Searching Gmail...');
  const gmail = new GmailClient();
  const emails = await gmail.searchEmails({ 
    query, 
    maxResults, 
    includeBody: true 
  });

  if (emails.length === 0) {
    console.log('\n📭 No emails found matching query.\n');
    return;
  }

  console.log(`Found ${emails.length} email(s)`);

  // Convert to InteractionData
  const teamEmails = getTeamEmails();
  
  const interactions: InteractionData[] = emails.map(email => ({
    subject: email.subject,
    from: email.from,
    to: email.to,
    date: email.date,
    snippet: email.snippet,
    body: email.body,
    gmailId: email.id,
    threadId: email.threadId,
    direction: isOutbound(email.from.email, teamEmails) ? 'Outbound' : 'Inbound',
  }));

  // Sync to Notion
  const notionClient = new InteractionsClient({
    interactionsDatabaseId: process.env.NOTION_INTERACTIONS_DB_ID,
    contactsDatabaseId: process.env.NOTION_CONTACTS_DB_ID,
  });

  const result = await notionClient.syncEmails(interactions);

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Sync Complete\n');
  console.log(`   Total:    ${result.total}`);
  console.log(`   Synced:   ${result.successful}`);
  console.log(`   Skipped:  ${result.skipped}`);
  console.log(`   Failed:   ${result.failed}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// SEARCH COMMAND
// ═══════════════════════════════════════════════════════════════

async function runSearch(args: string[]) {
  const query = args.find(a => !a.startsWith('--'));
  
  if (!query) {
    console.error('❌ Query required.\n');
    console.log('Examples:');
    console.log('  pnpm search "subject:invoice"');
    console.log('  pnpm search "from:client@example.com"');
    process.exit(1);
  }

  const maxResults = parseInt(
    args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10'
  );

  console.log(`\n🔍 Searching Gmail: ${query}\n`);

  const gmail = new GmailClient();
  const emails = await gmail.searchEmails({ 
    query, 
    maxResults, 
    includeBody: false 
  });

  if (emails.length === 0) {
    console.log('📭 No emails found.\n');
    return;
  }

  console.log(`Found ${emails.length} email(s):\n`);

  for (const email of emails) {
    const date = new Date(email.date).toLocaleDateString();
    console.log(`📧 ${email.subject}`);
    console.log(`   From: ${email.from.name || email.from.email}`);
    console.log(`   Date: ${date}`);
    console.log(`   ID: ${email.id}`);
    if (email.hasAttachments) {
      console.log(`   📎 Has attachments`);
    }
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════
// LABELS COMMAND
// ═══════════════════════════════════════════════════════════════

async function runLabels() {
  console.log('\n📋 Gmail Labels\n');

  const gmail = new GmailClient();
  const labels = await gmail.getLabels();

  // Separate system and user labels
  const systemLabels = labels.filter(l => l.id.startsWith('CATEGORY_') || !l.id.includes('Label_'));
  const userLabels = labels.filter(l => l.id.includes('Label_'));

  console.log('System Labels:');
  for (const label of systemLabels.slice(0, 10)) {
    console.log(`  ${label.name}`);
  }
  if (systemLabels.length > 10) {
    console.log(`  ... and ${systemLabels.length - 10} more`);
  }

  console.log('\nUser Labels:');
  for (const label of userLabels) {
    console.log(`  ${label.name}`);
  }

  console.log(`\nTotal: ${labels.length} labels\n`);
}

// ═══════════════════════════════════════════════════════════════
// TEST COMMAND
// ═══════════════════════════════════════════════════════════════

async function runTest() {
  console.log('\n🧪 Testing Connections\n');

  let gmailOk = false;
  let notionOk = false;

  // Test Gmail
  console.log('Gmail:');
  try {
    const gmail = new GmailClient();
    const emails = await gmail.searchEmails({ 
      query: 'in:inbox', 
      maxResults: 1,
      includeBody: false,
    });
    console.log('  ✅ Connected');
    console.log(`  Latest: ${emails[0]?.subject || '(empty inbox)'}`);
    gmailOk = true;
  } catch (error) {
    console.log('  ❌ Failed');
    console.log(`  ${error instanceof Error ? error.message : error}`);
  }

  // Test Notion
  console.log('\nNotion:');
  try {
    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    
    // Test Interactions DB
    if (process.env.NOTION_INTERACTIONS_DB_ID) {
      const db = await notion.databases.retrieve({
        database_id: process.env.NOTION_INTERACTIONS_DB_ID,
      });
      const title = (db as { title?: Array<{ plain_text: string }> }).title?.[0]?.plain_text;
      console.log(`  ✅ Interactions DB: ${title || 'Found'}`);
    } else {
      console.log('  ⚠️  NOTION_INTERACTIONS_DB_ID not set');
    }

    // Test Contacts DB
    if (process.env.NOTION_CONTACTS_DB_ID) {
      const db = await notion.databases.retrieve({
        database_id: process.env.NOTION_CONTACTS_DB_ID,
      });
      const title = (db as { title?: Array<{ plain_text: string }> }).title?.[0]?.plain_text;
      console.log(`  ✅ Contacts DB: ${title || 'Found'}`);
    } else {
      console.log('  ⚠️  NOTION_CONTACTS_DB_ID not set');
    }

    notionOk = true;
  } catch (error) {
    console.log('  ❌ Failed');
    console.log(`  ${error instanceof Error ? error.message : error}`);
  }

  // Summary
  console.log('\n' + '─'.repeat(40));
  if (gmailOk && notionOk) {
    console.log('✅ All connections working!\n');
  } else {
    console.log('⚠️  Some connections failed. Check configuration.\n');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get team email addresses from environment.
 * Used to detect outbound emails (sent by a team member).
 */
function getTeamEmails(): string[] {
  const emails = process.env.TEAM_EMAILS || '';
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Check if email is outbound (sent by a team member).
 */
function isOutbound(fromEmail: string, teamEmails: string[]): boolean {
  if (teamEmails.length === 0) return false;
  return teamEmails.includes(fromEmail.toLowerCase());
}

// Run main
main().catch(error => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});
