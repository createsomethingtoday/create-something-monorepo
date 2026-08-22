import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadCheckpoint, saveCheckpoint } from '../src/tools/checkpoint.js';
import type { AgentContext } from '../src/types.js';

function context(sessionId: string): AgentContext {
  return {
    sessionId,
    filesModified: [],
    issuesUpdated: [],
    decisions: [],
    agentNotes: 'checkpoint path security test',
    blockers: [],
    capturedAt: new Date(0).toISOString(),
  };
}

test('checkpoint APIs reject path traversal while preserving valid session IDs', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'harness-mcp-checkpoint-'));
  const originalCwd = process.cwd();
  mkdirSync(join(fixtureRoot, '.beads'));

  try {
    process.chdir(fixtureRoot);
    assert.throws(() => saveCheckpoint(context('../../outside')), /Invalid sessionId/);
    assert.throws(() => loadCheckpoint('latest', '../../outside'), /Invalid sessionId/);

    const checkpointId = saveCheckpoint(context('session-safe_123'));
    assert.equal(loadCheckpoint(checkpointId, 'session-safe_123').sessionId, 'session-safe_123');
  } finally {
    process.chdir(originalCwd);
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
