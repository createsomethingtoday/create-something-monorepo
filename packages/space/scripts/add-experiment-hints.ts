/**
 * Add hints to experiments for mechanism design
 * Game-theoretic contextual help
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to local D1 database
const db = new Database(path.join(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a74e70ae6a9443da905eb90719c8dfd2.sqlite'));

// Cloudflare KV Quick Start - Add hints to lessons
const kvQuickStartHints = {
  'cloudflare-kv-quick-start': [
    {
      lessonId: 1,
      hints: [
        "Make sure you're in your project directory before creating the namespace",
        "The namespace name 'CACHE' will be used in your wrangler.toml binding",
        "If you get a login error, try running 'wrangler whoami' first"
      ]
    },
    {
      lessonId: 2,
      hints: [
        "The key-value syntax is: await env.CACHE.put(key, value)",
        "Make sure to use 'await' when working with KV operations",
        "Check that your CACHE binding matches what's in wrangler.toml"
      ]
    },
    {
      lessonId: 3,
      hints: [
        "Use await env.CACHE.get(key) to retrieve values",
        "Remember that KV values are returned as strings by default",
        "If the key doesn't exist, get() returns null"
      ]
    },
    {
      lessonId: 4,
      hints: [
        "The list() method returns an object with keys array",
        "You can filter results with a prefix: env.CACHE.list({ prefix: 'user:' })",
        "Listing is paginated - check the 'cursor' field for more results"
      ]
    },
    {
      lessonId: 5,
      hints: [
        "The delete() method removes a key-value pair",
        "Deleting a non-existent key doesn't throw an error",
        "Consider using expiration instead of manual deletion for temporary data"
      ]
    },
    {
      lessonId: 6,
      hints: [
        "expirationTtl is in seconds, not milliseconds",
        "Set it in the put() options: { expirationTtl: 60 }",
        "Expired keys are automatically removed by Cloudflare"
      ]
    }
  ]
};

async function updateExperimentHints() {
  console.log('📝 Adding hints to experiments...\n');

  // Get the Cloudflare KV Quick Start paper
  const paper = db.prepare('SELECT * FROM papers WHERE slug = ?').get('cloudflare-kv-quick-start');

  if (!paper) {
    console.error('❌ Cloudflare KV Quick Start experiment not found');
    return;
  }

  console.log(`✅ Found: ${paper.title}`);

  // Parse existing lessons
  let lessons: any[] = [];
  try {
    lessons = JSON.parse(paper.code_lessons || '[]');
  } catch (e) {
    console.error('❌ Failed to parse lessons:', e);
    return;
  }

  console.log(`📚 Found ${lessons.length} lessons\n`);

  // Add hints to each lesson
  const hints = kvQuickStartHints['cloudflare-kv-quick-start'];
  lessons.forEach((lesson: any, index: number) => {
    const hintData = hints.find(h => h.lessonId === lesson.id);
    if (hintData) {
      lesson.hints = hintData.hints;
      console.log(`  ✨ Lesson ${lesson.id}: Added ${hintData.hints.length} hints`);
    }
  });

  // Update the database
  const updatedLessons = JSON.stringify(lessons);
  db.prepare('UPDATE papers SET code_lessons = ? WHERE id = ?').run(updatedLessons, paper.id);

  console.log(`\n✅ Successfully updated ${paper.title}`);
  console.log('🎯 Hints are now available for mechanism design!\n');
}

// Run the update
updateExperimentHints();
db.close();
