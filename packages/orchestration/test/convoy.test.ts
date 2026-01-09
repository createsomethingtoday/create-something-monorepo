/**
 * @create-something/orchestration
 *
 * Phase 2: Convoy Support Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import {
  createConvoy,
  loadConvoy,
  listConvoys,
  getConvoyStatus,
} from '../src/coordinator/convoy.js';

import {
  createCostTracker,
  recordSessionCost,
  recordWorkerCost,
  aggregateCosts,
} from '../src/cost/tracker.js';

const execAsync = promisify(exec);

// Test directory (gitignored)
const TEST_DIR = path.join(process.cwd(), 'test-temp');

describe('Phase 2: Convoy Support', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });

    // Initialize git repo (required for convoy commits)
    try {
      await execAsync('git init', { cwd: TEST_DIR });
      await execAsync('git config user.email "test@test.com"', { cwd: TEST_DIR });
      await execAsync('git config user.name "Test User"', { cwd: TEST_DIR });
    } catch (error) {
      console.warn('Git init failed (may already exist):', error);
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  it('should create convoy with Git storage', async () => {
    const convoy = await createConvoy('test-epic-001', 'Test Convoy', ['cs-a', 'cs-b'], null, TEST_DIR);

    expect(convoy.id).toMatch(/^convoy-/);
    expect(convoy.issueIds).toEqual(['cs-a', 'cs-b']);
    expect(convoy.name).toBe('Test Convoy');
    expect(convoy.status).toBe('pending');

    // Verify Git commit
    const loaded = await loadConvoy(convoy.id, 'test-epic-001', TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded?.convoy.id).toBe(convoy.id);
  });

  it('should list convoys for an epic', async () => {
    await createConvoy('test-epic-001', 'Convoy A', ['cs-a'], null, TEST_DIR);
    await createConvoy('test-epic-001', 'Convoy B', ['cs-b'], null, TEST_DIR);
    await createConvoy('test-epic-002', 'Convoy C', ['cs-c'], null, TEST_DIR);

    const convoysEpic1 = await listConvoys('test-epic-001', TEST_DIR);
    const convoysEpic2 = await listConvoys('test-epic-002', TEST_DIR);

    expect(convoysEpic1).toHaveLength(2);
    expect(convoysEpic2).toHaveLength(1);

    expect(convoysEpic1.map((c) => c.name)).toContain('Convoy A');
    expect(convoysEpic1.map((c) => c.name)).toContain('Convoy B');
  });

  it('should get convoy status', async () => {
    const convoy = await createConvoy('test-epic-001', 'Test Convoy', ['cs-a', 'cs-b', 'cs-c'], 10.0, TEST_DIR);

    const status = await getConvoyStatus(convoy.id, 'test-epic-001', TEST_DIR);

    expect(status).not.toBeNull();
    expect(status?.convoyId).toBe(convoy.id);
    expect(status?.totalIssues).toBe(3);
    expect(status?.completedIssues).toBe(0);
    expect(status?.inProgressIssues).toBe(0);
    expect(status?.budgetRemaining).toBe(10.0);
  });

  it('should track costs across hierarchy', async () => {
    const tracker = createCostTracker(10.0);

    // Record session cost
    let updated = recordSessionCost(tracker, 'sess-1', 1.5);
    expect(updated.sessionCosts['sess-1']).toBe(1.5);
    expect(updated.convoyCost).toBe(1.5);
    expect(updated.epicRemaining).toBe(8.5);

    // Record worker cost
    updated = recordWorkerCost(updated, 'worker-1', 2.0);
    expect(updated.workerCosts['worker-1']).toBe(2.0);
    expect(updated.convoyCost).toBe(2.0); // Workers override sessions
    expect(updated.epicRemaining).toBe(8.0);
  });

  it('should aggregate costs correctly', async () => {
    const tracker = createCostTracker(10.0);

    let updated = recordSessionCost(tracker, 'sess-1', 1.0);
    updated = recordSessionCost(updated, 'sess-2', 1.5);
    updated = recordWorkerCost(updated, 'worker-1', 2.0);
    updated = recordWorkerCost(updated, 'worker-2', 3.0);

    const summary = aggregateCosts(updated);

    expect(summary.sessionCount).toBe(2);
    expect(summary.sessionTotal).toBe(2.5);
    expect(summary.workerCount).toBe(2);
    expect(summary.workerTotal).toBe(5.0);
    expect(summary.convoyTotal).toBe(5.0); // Workers are primary
    expect(summary.epicRemaining).toBe(5.0);
  });
});
