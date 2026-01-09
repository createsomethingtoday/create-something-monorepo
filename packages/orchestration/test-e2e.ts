/**
 * End-to-end test script for orchestration Phase 3 features
 */

import { readWorkerSignal } from './src/coordinator/worker-pool.js';
import { shouldNudgeWorker, generateHealthReport, Witness } from './src/coordinator/witness.js';
import { selectModel } from './src/integration/model-routing.js';
import type { BeadsIssue } from './src/types.js';

async function testWorkerSignaling() {
  console.log('\n=== Test 1: Worker Signaling ===');

  // Test reading the simulated worker signals
  const workers = ['worker-test-1', 'worker-test-2', 'worker-test-3'];

  for (const workerId of workers) {
    const signal = await readWorkerSignal(workerId);
    if (signal) {
      console.log(`✓ ${workerId}: ${signal.status}, cost: $${signal.costUsd.toFixed(4)}, updated: ${signal.updatedAt}`);

      // Check staleness
      const updateTime = new Date(signal.updatedAt).getTime();
      const elapsed = Date.now() - updateTime;
      const minutes = Math.floor(elapsed / 60000);

      if (minutes > 20) {
        console.log(`  ⚠️  Stale (${minutes} minutes old) - should trigger nudge`);
      } else if (signal.status === 'completed') {
        console.log(`  ✓ Completed successfully`);
      } else {
        console.log(`  ✓ Healthy (${minutes} minutes old)`);
      }
    } else {
      console.log(`✗ ${workerId}: signal not found`);
    }
  }
}

async function testNudgeThrottling() {
  console.log('\n=== Test 2: Nudge Throttling ===');

  // Test if worker-test-2 (stale) should be nudged
  const shouldNudge = await shouldNudgeWorker('worker-test-2');
  console.log(`Should nudge worker-test-2: ${shouldNudge}`);

  if (shouldNudge) {
    console.log('✓ Nudge logic correctly identifies stale worker');
  } else {
    console.log('✗ Nudge logic failed to identify stale worker');
  }
}

async function testHealthReport() {
  console.log('\n=== Test 3: Health Report Generation ===');

  try {
    const report = await generateHealthReport('convoy-Q-S1i3KGJY', 'epic-e2e-test');

    console.log(`Healthy workers: ${report.healthy}`);
    console.log(`Completed workers: ${report.completed}`);
    console.log(`Failed workers: ${report.failed}`);
    console.log(`Stale workers: ${report.stale}`);

    if (report.completed === 1 && report.stale === 1) {
      console.log('✓ Health report correctly identified worker states');
    } else {
      console.log('✗ Health report counts incorrect');
    }
  } catch (error) {
    console.log(`Error generating health report: ${error}`);
  }
}

async function testModelRouting() {
  console.log('\n=== Test 4: Model Routing ===');

  // Test model selection for the 3 test issues
  const issues: Array<Partial<BeadsIssue> & { id: string; title: string; labels: string[] }> = [
    {
      id: 'csm-zc6ap',
      title: 'E2E Test: Create simple utility function',
      labels: ['complexity:trivial'],
    },
    {
      id: 'csm-3gs6j',
      title: 'E2E Test: Add unit tests for utility',
      labels: ['complexity:simple'],
    },
    {
      id: 'csm-xkoz4',
      title: 'E2E Test: Update documentation',
      labels: ['complexity:trivial'],
    },
  ];

  for (const issue of issues) {
    const decision = selectModel(issue as BeadsIssue);
    console.log(`${issue.id}: "${issue.title}" → ${decision.model} (${decision.strategy})`);

    // Verify routing is correct
    if (issue.labels.includes('complexity:trivial') && decision.model === 'haiku') {
      console.log(`  ✓ Correctly routed to haiku`);
    } else if (issue.labels.includes('complexity:simple') && decision.model === 'haiku') {
      console.log(`  ✓ Correctly routed to haiku`);
    } else {
      console.log(`  ⚠️  Unexpected routing: ${decision.rationale}`);
    }
  }
}

async function testWitnessConfig() {
  console.log('\n=== Test 5: Witness Configuration ===');

  // Test witness with default config
  const witness = new Witness({
    convoyId: 'convoy-Q-S1i3KGJY',
    epicId: 'epic-e2e-test',
  });

  console.log(`Poll interval: ${witness['config'].pollInterval}s`);
  console.log(`Stale threshold: ${witness['config'].staleThreshold} min`);
  console.log(`Escalation threshold: ${witness['config'].escalationThreshold} min`);

  if (witness['config'].staleThreshold === 20) {
    console.log('✓ Default stale threshold correct (20 min)');
  }

  // Test witness with custom config
  const customWitness = new Witness({
    convoyId: 'convoy-Q-S1i3KGJY',
    epicId: 'epic-e2e-test',
    pollInterval: 30,
    staleThreshold: 15,
  });

  if (customWitness['config'].staleThreshold === 15) {
    console.log('✓ Custom stale threshold applied (15 min)');
  }
}

// Run all tests
async function runE2ETests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Orchestration Phase 3 End-to-End Test Suite         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    await testWorkerSignaling();
    await testNudgeThrottling();
    await testHealthReport();
    await testModelRouting();
    await testWitnessConfig();

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  ✓ End-to-End Tests Complete                          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error);
    process.exit(1);
  }
}

runE2ETests();
