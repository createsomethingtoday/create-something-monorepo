#!/usr/bin/env node

/**
 * Setup script for Webflow Review platform
 * Creates all necessary Cloudflare resources
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    throw error;
  }
}

async function setup() {
  log('\n🚀 Setting up Webflow Review Platform\n', 'blue');

  // Step 1: Create D1 database
  log('1. Creating D1 database...', 'yellow');
  const d1Output = exec('wrangler d1 create webflow-review-db');
  const d1Match = d1Output.match(/database_id = "([^"]+)"/);
  const d1Id = d1Match ? d1Match[1] : null;

  if (d1Id) {
    log(`   ✓ D1 database created: ${d1Id}`, 'green');
  } else {
    log('   ✗ Failed to create D1 database', 'red');
    process.exit(1);
  }

  // Step 2: Create KV namespace
  log('2. Creating KV namespace...', 'yellow');
  const kvOutput = exec('wrangler kv:namespace create KV');
  const kvMatch = kvOutput.match(/id = "([^"]+)"/);
  const kvId = kvMatch ? kvMatch[1] : null;

  if (kvId) {
    log(`   ✓ KV namespace created: ${kvId}`, 'green');
  } else {
    log('   ✗ Failed to create KV namespace', 'red');
    process.exit(1);
  }

  // Step 3: Create R2 bucket
  log('3. Creating R2 bucket...', 'yellow');
  try {
    exec('wrangler r2 bucket create webflow-review-screenshots');
    log('   ✓ R2 bucket created: webflow-review-screenshots', 'green');
  } catch (error) {
    log('   ⚠ R2 bucket might already exist or creation failed', 'yellow');
  }

  // Step 4: Create queues
  log('4. Creating queues...', 'yellow');
  try {
    exec('wrangler queues create webflow-review-queue');
    log('   ✓ Queue created: webflow-review-queue', 'green');
  } catch (error) {
    log('   ⚠ Queue might already exist', 'yellow');
  }

  try {
    exec('wrangler queues create webflow-review-dlq');
    log('   ✓ Dead letter queue created: webflow-review-dlq', 'green');
  } catch (error) {
    log('   ⚠ Dead letter queue might already exist', 'yellow');
  }

  // Step 5: Update wrangler.toml files
  log('5. Updating wrangler.toml files...', 'yellow');

  const orchestratorWranglerPath = join(process.cwd(), 'workers/orchestrator/wrangler.toml');
  const queueWranglerPath = join(process.cwd(), 'workers/queue-consumer/wrangler.toml');

  // Update orchestrator wrangler.toml
  let orchestratorConfig = readFileSync(orchestratorWranglerPath, 'utf8');
  orchestratorConfig = orchestratorConfig.replace(
    /database_id = "YOUR_D1_DATABASE_ID"/,
    `database_id = "${d1Id}"`
  );
  orchestratorConfig = orchestratorConfig.replace(
    /id = "YOUR_KV_NAMESPACE_ID"/,
    `id = "${kvId}"`
  );
  writeFileSync(orchestratorWranglerPath, orchestratorConfig);
  log('   ✓ Updated orchestrator wrangler.toml', 'green');

  // Update queue consumer wrangler.toml
  let queueConfig = readFileSync(queueWranglerPath, 'utf8');
  queueConfig = queueConfig.replace(
    /database_id = "YOUR_D1_DATABASE_ID"/,
    `database_id = "${d1Id}"`
  );
  writeFileSync(queueWranglerPath, queueConfig);
  log('   ✓ Updated queue-consumer wrangler.toml', 'green');

  // Step 6: Apply migrations
  log('6. Applying database migrations...', 'yellow');
  try {
    exec('wrangler d1 migrations apply webflow-review-db --remote');
    log('   ✓ Migrations applied', 'green');
  } catch (error) {
    log('   ⚠ Migration might have failed - run manually: pnpm db:migrate', 'yellow');
  }

  // Done!
  log('\n✅ Setup complete!\n', 'green');
  log('Next steps:', 'blue');
  log('  1. Deploy workers: pnpm deploy:all');
  log('  2. Test API: curl https://your-worker.workers.dev/health');
  log('  3. Build Chrome extension (Phase 2)\n');

  log('Resource IDs:', 'blue');
  log(`  D1 Database: ${d1Id}`);
  log(`  KV Namespace: ${kvId}`);
  log(`  R2 Bucket: webflow-review-screenshots`);
  log(`  Queue: webflow-review-queue\n`);
}

setup().catch(error => {
  log('\n❌ Setup failed:', 'red');
  console.error(error);
  process.exit(1);
});
