/**
 * Schedule LinkedIn posts from content files
 * Run with: npx tsx scripts/schedule-posts.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTENT_DIR = join(__dirname, '../content/social');
const DB_NAME = 'create-something-db';

// Organization IDs
const ORGS = {
  'CREATE SOMETHING': '110433670',
  'WORKWAY': '35463531',
};

interface Post {
  id: string;
  platform: 'linkedin';
  content: string;
  comment?: string;
  campaign: string;
  organizationId?: string;
  scheduledFor: number;
}

function parseMarkdown(content: string): { post: string; comment?: string; campaign?: string; target?: string } {
  const lines = content.split('\n');

  // Extract metadata
  let campaign = '';
  let target = '';
  for (const line of lines) {
    if (line.startsWith('**Campaign:**')) {
      campaign = line.replace('**Campaign:**', '').trim();
    }
    if (line.startsWith('**Target:**')) {
      target = line.replace('**Target:**', '').trim();
    }
  }

  // Extract post content (between ## Post and ---)
  const postMatch = content.match(/## Post\n\n([\s\S]*?)\n\n---/);
  const post = postMatch ? postMatch[1].trim() : '';

  // Extract comment content
  const commentMatch = content.match(/## Comment.*?\n\n([\s\S]*?)\n\n---/);
  const comment = commentMatch ? commentMatch[1].trim() : undefined;

  return { post, comment, campaign, target };
}

function getOrganizationId(target: string): string | undefined {
  if (target.includes('CREATE SOMETHING company')) return ORGS['CREATE SOMETHING'];
  if (target.includes('WORKWAY')) return ORGS['WORKWAY'];
  return undefined; // Personal account
}

function generateId(): string {
  return 'sp_' + Math.random().toString(36).substring(2, 15);
}

function getNextWeekdays(startDate: Date, count: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (dates.length < count) {
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const scheduleDate = new Date(current);
      // Set to 9 AM Pacific (17:00 UTC in winter)
      scheduleDate.setUTCHours(17, 0, 0, 0);
      dates.push(scheduleDate);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function main() {
  const files = readdirSync(CONTENT_DIR).filter(f => f.startsWith('linkedin-') && f.endsWith('.md'));

  console.log(`Found ${files.length} LinkedIn content files\n`);

  const posts: Post[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start tomorrow

  // Sort files to ensure consistent ordering
  files.sort();

  // Prioritize: CS company page first, then personal gateway, then others
  const priorityOrder = [
    'linkedin-cs-norvig-partnership.md',  // CREATE SOMETHING company - Day 1
    'linkedin-norvig-partnership.md',      // Personal gateway - Day 2
    'linkedin-personal-transparency.md',   // Personal strategy - Day 3
    'linkedin-workway-first-post.md',      // WORKWAY company - Day 4
  ];

  const orderedFiles = [
    ...priorityOrder.filter(f => files.includes(f)),
    ...files.filter(f => !priorityOrder.includes(f))
  ];

  // Pre-calculate all weekday dates
  const scheduleDates = getNextWeekdays(startDate, orderedFiles.length);
  let dateIndex = 0;

  for (const file of orderedFiles) {
    const content = readFileSync(join(CONTENT_DIR, file), 'utf-8');
    const parsed = parseMarkdown(content);

    if (!parsed.post) {
      console.log(`⚠️  Skipping ${file} - no post content found`);
      continue;
    }

    const organizationId = getOrganizationId(parsed.target || '');
    const scheduledFor = scheduleDates[dateIndex];

    const post: Post = {
      id: generateId(),
      platform: 'linkedin',
      content: parsed.post,
      comment: parsed.comment,
      campaign: parsed.campaign || file.replace('.md', ''),
      organizationId,
      scheduledFor: scheduledFor.getTime(),
    };

    posts.push(post);

    const accountLabel = organizationId
      ? (organizationId === ORGS['CREATE SOMETHING'] ? 'CREATE SOMETHING' : 'WORKWAY')
      : 'Personal';

    console.log(`📅 ${file}`);
    console.log(`   Account: ${accountLabel}`);
    console.log(`   Date: ${scheduledFor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} 9:00 AM PT`);
    console.log(`   Chars: ${parsed.post.length}`);
    console.log('');

    dateIndex++;
  }

  console.log('---');
  console.log(`\nTotal posts to schedule: ${posts.length}`);
  console.log('');

  // Generate SQL insert statements
  const inserts = posts.map(p => {
    const metadata = JSON.stringify({
      organizationId: p.organizationId,
      commentLink: p.comment,
    }).replace(/'/g, "''");

    const content = p.content.replace(/'/g, "''");

    return `INSERT INTO social_posts (id, platform, content, scheduled_for, status, campaign, created_at, metadata) VALUES ('${p.id}', '${p.platform}', '${content}', ${p.scheduledFor}, 'pending', '${p.campaign}', ${Date.now()}, '${metadata}');`;
  });

  // Write SQL to file
  const sqlFile = join(__dirname, 'schedule-posts.sql');
  const sql = inserts.join('\n');
  writeFileSync(sqlFile, sql);

  console.log(`SQL written to: ${sqlFile}`);
  console.log('\nTo apply, run:');
  console.log(`wrangler d1 execute ${DB_NAME} --file=${sqlFile} --remote`);
}

main().catch(console.error);
