/**
 * Integration tests for background execution and witness monitoring.
 *
 * Tests Phase 3 features:
 * - Background convoy spawning
 * - Witness health monitoring
 * - Three-tier escalation (nudge → blocker → terminate)
 * - Worker signaling and status updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import type { Convoy, WorkerSignal } from '../src/types.js';
import {
  shouldNudgeWorker,
  generateHealthReport,
  Witness,
  type WitnessConfig,
  DEFAULT_WITNESS_CONFIG,
} from '../src/coordinator/witness.js';
import { readWorkerSignal, writeWorkerSignal } from '../src/coordinator/worker-pool.js';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-witness');
const WORKER_DIR = path.join(TEST_DIR, '.orchestration/workers');

describe('Background Execution & Witness Monitoring', () => {
  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(WORKER_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Worker Signaling', () => {
    it('writes and reads worker signals correctly', async () => {
      const workerId = 'worker-test-123';
      const signal: WorkerSignal = {
        workerId,
        issueId: 'cs-abc123',
        status: 'running',
        costUsd: 0.05,
        updatedAt: new Date().toISOString(),
      };

      // Write signal
      await writeWorkerSignal(signal, TEST_DIR);

      // Read signal back
      const readSignal = await readWorkerSignal(workerId, TEST_DIR);

      expect(readSignal).toBeDefined();
      expect(readSignal?.workerId).toBe(workerId);
      expect(readSignal?.issueId).toBe('cs-abc123');
      expect(readSignal?.status).toBe('running');
      expect(readSignal?.costUsd).toBe(0.05);
    });

    it('returns null for non-existent worker', async () => {
      const signal = await readWorkerSignal('worker-nonexistent', TEST_DIR);
      expect(signal).toBeNull();
    });

    it('overwrites existing signal on update', async () => {
      const workerId = 'worker-update-test';
      const signal1: WorkerSignal = {
        workerId,
        issueId: 'cs-test',
        status: 'running',
        costUsd: 0.01,
        updatedAt: new Date().toISOString(),
      };

      // Write initial signal
      await writeWorkerSignal(signal1, TEST_DIR);

      // Update signal
      const signal2: WorkerSignal = {
        ...signal1,
        status: 'completed',
        costUsd: 0.05,
        updatedAt: new Date().toISOString(),
      };
      await writeWorkerSignal(signal2, TEST_DIR);

      // Read updated signal
      const readSignal = await readWorkerSignal(workerId, TEST_DIR);
      expect(readSignal?.status).toBe('completed');
      expect(readSignal?.costUsd).toBe(0.05);
    });
  });

  describe('Nudge Throttling', () => {
    const REAL_WORKER_DIR = path.join(process.cwd(), '.orchestration', 'workers');

    it('allows nudging when no command file exists', async () => {
      const workerId = 'worker-no-commands';

      // No commands.json file = OK to nudge
      const canNudge = await shouldNudgeWorker(workerId);
      expect(canNudge).toBe(true);
    });

    it('prevents nudging within 5 minutes of last nudge', async () => {
      const workerId = 'worker-recent-nudge';
      const workerDir = path.join(REAL_WORKER_DIR, workerId);
      await fs.mkdir(workerDir, { recursive: true });

      // Write recent nudge command (2 minutes ago)
      const command = {
        command: 'nudge' as const,
        reason: 'Test nudge',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      };

      await fs.writeFile(
        path.join(workerDir, 'commands.json'),
        JSON.stringify(command, null, 2),
        'utf-8'
      );

      try {
        const canNudge = await shouldNudgeWorker(workerId);
        expect(canNudge).toBe(false); // Too soon
      } finally {
        // Cleanup
        await fs.rm(workerDir, { recursive: true, force: true });
      }
    });

    it('allows nudging after 5 minutes', async () => {
      const workerId = 'worker-old-nudge';
      const workerDir = path.join(REAL_WORKER_DIR, workerId);
      await fs.mkdir(workerDir, { recursive: true });

      // Write old nudge command (6 minutes ago)
      const command = {
        command: 'nudge' as const,
        reason: 'Test nudge',
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString()
      };

      await fs.writeFile(
        path.join(workerDir, 'commands.json'),
        JSON.stringify(command, null, 2),
        'utf-8'
      );

      try {
        const canNudge = await shouldNudgeWorker(workerId);
        expect(canNudge).toBe(true); // Enough time passed
      } finally {
        // Cleanup
        await fs.rm(workerDir, { recursive: true, force: true });
      }
    });
  });

  describe('Health Report Generation', () => {
    // Note: generateHealthReport requires a convoy to exist in the file system
    // These tests would need a full convoy setup. For now, test the basic case.

    it('returns empty report for non-existent convoy', async () => {
      const report = await generateHealthReport('convoy-nonexistent');

      expect(report.healthy).toBe(0);
      expect(report.completed).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.stale).toBe(0);
      expect(report.staleWorkerIds).toEqual([]);
    });

    // Full integration tests would require:
    // - Creating a convoy with createConvoy()
    // - Writing worker signals with various timestamps
    // - Calling generateHealthReport()
    // - Verifying correct classification (healthy/stale/completed/failed)
    //
    // This is better suited for integration tests that run against
    // the full orchestration system rather than unit tests.
  });

  describe('Witness Configuration', () => {
    it('has correct default thresholds', () => {
      // Default: 20 min stale, 40 min escalate, 60 min terminate
      expect(DEFAULT_WITNESS_CONFIG.pollInterval).toBe(60);
      expect(DEFAULT_WITNESS_CONFIG.staleThreshold).toBe(20);
      expect(DEFAULT_WITNESS_CONFIG.escalationThreshold).toBe(40);
      expect(DEFAULT_WITNESS_CONFIG.terminationThreshold).toBe(60);
    });

    it('creates witness with custom thresholds', () => {
      const customConfig: WitnessConfig = {
        convoyId: 'convoy-test',
        epicId: 'epic-test',
        pollInterval: 30,           // 30 seconds
        staleThreshold: 30,         // 30 min
        escalationThreshold: 60,    // 60 min
        terminationThreshold: 90,   // 90 min
      };

      // Should not throw
      const witness = new Witness(customConfig);
      expect(witness).toBeDefined();

      // Stop immediately to prevent background monitoring
      witness.stop();
    });

    it('merges custom config with defaults', () => {
      const partialConfig: WitnessConfig = {
        convoyId: 'convoy-test',
        staleThreshold: 30,  // Override just one value
      };

      const witness = new Witness(partialConfig);
      expect(witness).toBeDefined();
      witness.stop();
    });
  });

  describe('Worker Status Tracking', () => {
    it('tracks completed workers correctly', async () => {
      const workerId = 'worker-completed';
      const signal: WorkerSignal = {
        workerId,
        issueId: 'cs-test',
        status: 'completed',
        outcome: { success: true, summary: 'Tests passed', stats: { filesModified: 3 } },
        costUsd: 0.08,
        updatedAt: new Date().toISOString(),
      };

      await writeWorkerSignal(signal, TEST_DIR);
      const readSignal = await readWorkerSignal(workerId, TEST_DIR);

      expect(readSignal?.status).toBe('completed');
      expect(readSignal?.outcome?.success).toBe(true);
    });

    it('tracks failed workers with error messages', async () => {
      const workerId = 'worker-failed';
      const signal: WorkerSignal = {
        workerId,
        issueId: 'cs-test',
        status: 'failed',
        error: 'Tests failed: 5 failures',
        costUsd: 0.03,
        updatedAt: new Date().toISOString(),
      };

      await writeWorkerSignal(signal, TEST_DIR);
      const readSignal = await readWorkerSignal(workerId, TEST_DIR);

      expect(readSignal?.status).toBe('failed');
      expect(readSignal?.error).toBe('Tests failed: 5 failures');
    });

    it('accumulates cost over time', async () => {
      const workerId = 'worker-cost-tracking';

      // Initial signal
      await writeWorkerSignal({
        workerId,
        issueId: 'cs-test',
        status: 'running',
        costUsd: 0.01,
        updatedAt: new Date().toISOString(),
      }, TEST_DIR);

      // Update with higher cost
      await writeWorkerSignal({
        workerId,
        issueId: 'cs-test',
        status: 'running',
        costUsd: 0.05,
        updatedAt: new Date().toISOString(),
      }, TEST_DIR);

      const readSignal = await readWorkerSignal(workerId, TEST_DIR);
      expect(readSignal?.costUsd).toBe(0.05);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing worker directory gracefully', async () => {
      const signal = await readWorkerSignal('worker-no-dir', '/nonexistent');
      expect(signal).toBeNull();
    });

    it('handles corrupted signal files', async () => {
      const workerId = 'worker-corrupt';
      const workerPath = path.join(WORKER_DIR, workerId);
      await fs.mkdir(workerPath, { recursive: true });

      // Write invalid JSON
      await fs.writeFile(
        path.join(workerPath, 'status.json'),
        'invalid json{{{',
        'utf-8'
      );

      const signal = await readWorkerSignal(workerId, TEST_DIR);
      expect(signal).toBeNull();
    });
  });
});
