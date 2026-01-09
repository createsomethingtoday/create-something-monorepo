/**
 * Test checkpoint and resume flow.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startSession, pauseSession, resumeSession } from '../src/session/lifecycle.js';
import { generateEpicId } from '../src/session/context.js';
import { hasCheckpoints, deleteEpicCheckpoints } from '../src/checkpoint/store.js';
import type { SessionConfig } from '../src/types.js';
import fs from 'fs/promises';
import path from 'path';

describe('Checkpoint and Resume', () => {
  let testDir: string;
  let epicId: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(process.cwd(), '.test-orchestration-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    // Initialize git repo (required for checkpoints)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@test.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });

    epicId = generateEpicId();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should create and load checkpoints', async () => {
    const config: SessionConfig = {
      epicId,
      resume: false,
      budget: 5.0,
      background: false,
      cwd: testDir,
    };

    // Start session
    const { session, context } = await startSession(config);

    expect(session).toBeDefined();
    expect(context.epicId).toBe(epicId);
    expect(context.sessionNumber).toBe(1);
    expect(context.budgetRemaining).toBe(5.0);

    // Pause session (creates checkpoint)
    const checkpoint = await pauseSession(
      session,
      context,
      'Test pause',
      testDir
    );

    expect(checkpoint).toBeDefined();
    expect(checkpoint.epicId).toBe(epicId);
    expect(session.status).toBe('paused');

    // Verify checkpoint exists
    const hasCheckpoint = await hasCheckpoints(epicId, testDir);
    expect(hasCheckpoint).toBe(true);
  });

  it('should resume from checkpoint', async () => {
    const config: SessionConfig = {
      epicId,
      resume: false,
      budget: 10.0,
      background: false,
      cwd: testDir,
    };

    // Start and pause first session
    const { session: session1, context: context1 } = await startSession(config);

    // Simulate some work
    context1.sessionCost = 2.5;
    context1.cumulativeCost = 2.5;
    context1.budgetRemaining = 7.5;

    await pauseSession(session1, context1, 'Mid-work pause', testDir);

    // Resume
    const resumed = await resumeSession(epicId, testDir);

    expect(resumed).not.toBeNull();
    expect(resumed!.session.epicId).toBe(epicId);
    expect(resumed!.context.sessionNumber).toBe(2); // Incremented
    expect(resumed!.context.cumulativeCost).toBe(2.5); // Preserved
    expect(resumed!.context.budgetRemaining).toBe(7.5); // Preserved
    expect(resumed!.context.sessionCost).toBe(0); // Reset for new session
    expect(resumed!.resumeBrief).toBeDefined();
  });

  it('should track budget warnings', async () => {
    const config: SessionConfig = {
      epicId,
      resume: false,
      budget: 1.0,
      background: false,
      cwd: testDir,
    };

    const { session, context } = await startSession(config);

    // Import updateSessionCost dynamically to avoid circular deps
    const { updateSessionCost } = await import('../src/session/context.js');

    // Consume 85% of budget (should trigger warning)
    const { context: updatedContext, warning } = updateSessionCost(context, 0.85);

    expect(warning).toContain('Budget warning');
    expect(updatedContext.budgetRemaining).toBeCloseTo(0.15, 10);
  });

  it('should resume with --resume flag', async () => {
    // First session with some work done
    const config1: SessionConfig = {
      epicId,
      resume: false,
      budget: 5.0,
      background: false,
      cwd: testDir,
    };

    const { session: session1, context: context1 } = await startSession(config1);

    // Simulate some meaningful work (so resume brief is generated)
    context1.agentNotes = 'Implemented authentication flow';
    context1.filesModified.push({
      path: 'src/auth.ts',
      summary: 'Added JWT validation',
      changeType: 'created',
      linesAdded: 50,
      linesRemoved: 0,
    });

    await pauseSession(session1, context1, 'End of day', testDir);

    // Second session with resume
    const config2: SessionConfig = {
      epicId,
      resume: true,
      budget: null, // Budget from checkpoint
      background: false,
      cwd: testDir,
    };

    const { session: session2, context: context2, resumeBrief } = await startSession(config2);

    expect(session2.parentSessionId).toBe(session1.id);
    expect(context2.sessionNumber).toBe(2);
    expect(resumeBrief).not.toBeNull();

    if (resumeBrief) {
      // Check for orchestration context
      expect(resumeBrief).toContain('Orchestration Context');
      // Check for file modifications
      expect(resumeBrief).toContain('auth.ts');
      // Check for agent notes
      expect(resumeBrief).toContain('Implemented authentication flow');
    }
  });
});
