#!/usr/bin/env tsx
/**
 * Migration Script - Sync Mock Papers to D1
 *
 * This script syncs all papers from mockPapers.json into the D1 database.
 * It can be run locally or deployed as an API endpoint.
 *
 * Usage:
 *   npm run migrate:papers
 *
 * Or call the API endpoint:
 *   POST /api/migrate/sync-papers
 */

const MIGRATION_ENDPOINT = process.env.MIGRATION_URL || 'http://localhost:3001/api/migrate/sync-papers';

async function checkStatus() {
  console.log('🔍 Checking migration status...\n');

  try {
    const response = await fetch(MIGRATION_ENDPOINT, { method: 'GET' });
    const data = await response.json();

    if (!data.available) {
      console.error('❌ D1 database not available:', data.error);
      process.exit(1);
    }

    console.log('📊 Current Status:');
    console.log(`   Papers in D1: ${data.database.papers_in_d1}`);
    console.log(`   Papers in Mock: ${data.database.papers_in_mock}`);
    console.log(`   Needs Sync: ${data.database.needs_sync ? 'Yes' : 'No'}`);
    console.log(`   Difference: ${data.database.difference} papers\n`);

    return data.database;
  } catch (error) {
    console.error('❌ Failed to check status:', error);
    process.exit(1);
  }
}

async function runMigration() {
  console.log('🚀 Starting migration...\n');

  try {
    const response = await fetch(MIGRATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Migration failed:', data.error);
      console.error('\nLogs:');
      data.logs?.forEach((log: string) => console.log(log));
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Results:');
    console.log(`   Inserted: ${data.stats.inserted}`);
    console.log(`   Updated: ${data.stats.updated}`);
    console.log(`   Errors: ${data.stats.errors}`);
    console.log(`   Total: ${data.stats.total}\n`);

    if (data.logs && data.logs.length > 0) {
      console.log('📝 Migration Logs (last 20 lines):');
      console.log('─'.repeat(80));
      data.logs.forEach((log: string) => console.log(log));
      console.log('─'.repeat(80));
    }

    return data.stats;
  } catch (error) {
    console.error('❌ Migration request failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('  📚 Paper Migration Tool - Mock Data → D1 Database');
  console.log('═'.repeat(80));
  console.log();

  // Check status first
  const status = await checkStatus();

  if (!status.needs_sync) {
    console.log('✨ Database is already in sync! No migration needed.');
    process.exit(0);
  }

  // Confirm migration
  console.log('⚠️  About to sync papers to D1 database.');
  console.log(`   This will insert ${status.difference} new papers.`);
  console.log();

  // Run migration
  const stats = await runMigration();

  // Verify
  console.log('\n🔍 Verifying results...');
  const finalStatus = await checkStatus();

  if (finalStatus.needs_sync) {
    console.log('⚠️  Warning: Database still needs sync after migration');
  } else {
    console.log('✅ Database is now fully synced!');
  }

  console.log('\n═'.repeat(80));
  console.log('  Migration Complete! 🎉');
  console.log('═'.repeat(80));
}

main().catch(console.error);
