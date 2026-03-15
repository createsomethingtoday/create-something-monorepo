/**
 * Temporal Worker for Webflow Extraction
 * 
 * The worker runs workflows and activities. It connects to
 * the Temporal server (local or cloud) and processes tasks.
 * 
 * Usage:
 *   # Start Temporal server locally first:
 *   temporal server start-dev --http-port 7243
 *   
 *   # Then run the worker:
 *   npx tsx src/temporal/worker.ts
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities.js';

const TASK_QUEUE = 'webflow-extraction';

async function run() {
  console.log('🚀 Starting Webflow Extraction Worker...');
  console.log(`📍 Task Queue: ${TASK_QUEUE}`);
  console.log(`🔧 Temporal: ${process.env.TEMPORAL_ADDRESS || 'localhost:7233'}`);
  
  // Connect to Temporal
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
  });
  
  // Create worker
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: TASK_QUEUE,
    workflowsPath: require.resolve('./workflows'),
    activities
  });
  
  console.log('✅ Worker started. Waiting for workflows...');
  console.log('');
  console.log('To trigger a workflow, run in another terminal:');
  console.log('  npx tsx src/temporal/trigger.ts <webflow-preview-url>');
  console.log('');
  
  // Run until terminated
  await worker.run();
}

run().catch((err) => {
  console.error('❌ Worker error:', err);
  process.exit(1);
});
