/**
 * Trigger a Webflow Extraction Workflow
 * 
 * This script starts a new workflow execution. The workflow
 * runs durably - if the worker crashes, it resumes automatically.
 * 
 * Usage:
 *   npx tsx src/temporal/trigger.ts <webflow-preview-url>
 *   
 *   # Example:
 *   npx tsx src/temporal/trigger.ts "https://preview.webflow.com/preview/woven-wear?..."
 *   
 *   # Resume a specific workflow:
 *   npx tsx src/temporal/trigger.ts --resume <workflow-id>
 */

import { Client, Connection } from '@temporalio/client';
import { webflowExtractionWorkflow } from './workflows.js';

const TASK_QUEUE = 'webflow-extraction';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx src/temporal/trigger.ts <webflow-preview-url>');
    console.error('       npx tsx src/temporal/trigger.ts --resume <workflow-id>');
    process.exit(1);
  }
  
  // Connect to Temporal
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
  });
  
  const client = new Client({ connection });
  
  // Check if resuming
  if (args[0] === '--resume') {
    const workflowId = args[1];
    if (!workflowId) {
      console.error('Missing workflow ID for --resume');
      process.exit(1);
    }
    
    console.log(`📍 Getting handle for workflow: ${workflowId}`);
    const handle = client.workflow.getHandle(workflowId);
    
    console.log('⏳ Waiting for result...');
    const result = await handle.result();
    
    console.log('\n✅ Workflow completed!');
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  // Start new workflow
  const url = args[0];
  const workflowId = `webflow-extraction-${Date.now()}`;
  
  console.log('🚀 Starting Webflow Extraction Workflow');
  console.log(`📍 URL: ${url}`);
  console.log(`📍 Workflow ID: ${workflowId}`);
  console.log(`📍 Task Queue: ${TASK_QUEUE}`);
  console.log('');
  
  const handle = await client.workflow.start(webflowExtractionWorkflow, {
    args: [url],
    taskQueue: TASK_QUEUE,
    workflowId
  });
  
  console.log(`✅ Workflow started: ${handle.workflowId}`);
  console.log('');
  console.log('To view progress in Temporal UI:');
  console.log('  http://localhost:8233/namespaces/default/workflows');
  console.log('');
  console.log('⏳ Waiting for workflow to complete...');
  console.log('   (Kill this process to test resume - workflow continues!)');
  console.log('');
  
  // Wait for result
  const result = await handle.result();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ EXTRACTION COMPLETE');
  console.log('='.repeat(60) + '\n');
  
  console.log(`🌐 Site: ${result.siteName}`);
  console.log(`💼 Plan: ${result.sitePlan}`);
  console.log(`📄 Pages: ${result.pages.length}`);
  console.log(`🎨 Style Classes: ${result.styleClasses.length}`);
  console.log(`🧩 Components: ${result.components.length}`);
  console.log(`⚡ Interactions: ${result.interactions.length}`);
  console.log(`📊 CMS Collections: ${result.cmsCollections.length}`);
  console.log(`🖼️  Assets: ${result.assets.length}`);
  console.log(`📱 Breakpoints: ${result.breakpoints.length}`);
  console.log('');
  console.log(`🔗 Session Viewer: ${result.viewerUrl}`);
  console.log(`⏰ Extracted At: ${result.extractedAt}`);
  console.log('');
  
  // Show pages
  if (result.pages.length > 0) {
    console.log('📄 Pages:');
    for (const page of result.pages) {
      console.log(`   - ${page.name} (${page.type})`);
    }
    console.log('');
  }
  
  // Show components
  if (result.components.length > 0) {
    console.log('🧩 Components:');
    for (const comp of result.components) {
      const unused = comp.isUnused ? ' [UNUSED]' : '';
      console.log(`   - ${comp.name}: ${comp.instanceCount} instances${unused}`);
    }
    console.log('');
  }
  
  // Show activities completed
  console.log('✅ Activities Completed:', result.activitiesCompleted.join(' → '));
  
  await connection.close();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
