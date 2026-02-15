import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { appendAndon } from '../dist/andon/log.js';

test('appendAndon writes a JSONL record under .judgment/andon.jsonl', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const record = {
      id: 'andon_test_1',
      createdAt: '2026-01-01T00:00:00.000Z',
      policyId: 'safe',
      kind: 'commandExecution',
      phase: 'approval',
      threadId: 'thr_test',
      turnId: 'turn_test',
      itemId: 'item_test',
      summary: 'command approval: echo hi',
      details: { command: 'echo hi' },
      decision: 'decline',
      status: 'declined',
    };

    const path = appendAndon(cwd, record);
    assert.equal(path, join(cwd, '.judgment', 'andon.jsonl'));

    const raw = readFileSync(path, 'utf-8');
    const lines = raw.trim().split('\n');
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]), record);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

