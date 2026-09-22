import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../scripts/judgment-replay.mjs', import.meta.url));
const example = fileURLToPath(
  new URL('../contracts/judgment-data/v1/synthetic-example.json', import.meta.url)
);
const call = (...args) =>
  execFileSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

test('fresh-process capture, record and replay preserve exact inputs and reject overwritten artifacts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'judgment-replay-'));
  try {
    const snapshot = JSON.parse(call('snapshot', example, directory));
    assert.equal(call('snapshot', example, directory), JSON.stringify(snapshot) + '\n');
    const request = JSON.parse(call('request', snapshot.path));
    assert.deepEqual(
      request.questions.map((q) => q.id),
      ['acknowledgment']
    );
    assert.equal(request.evidence.length, 1);
    const response = join(directory, 'response.json');
    writeFileSync(
      response,
      JSON.stringify({
        providerStatus: 'ok',
        answers: [{ constraintId: 'acknowledgment', value: 'yes', probability: 0.95 }],
        provider: {
          provider: 'synthetic',
          model: 'fixture',
          requestId: 'fixture-only',
          completedAt: '2026-09-01T12:01:00Z',
          latencyMs: 0
        }
      })
    );
    const receipt = JSON.parse(call('record', snapshot.path, response, directory));
    const first = call('replay', snapshot.path, receipt.path);
    assert.equal(call('replay', snapshot.path, receipt.path), first);
    assert.equal(JSON.parse(first).authority, 'advisory_only');
    const stored = JSON.parse(readFileSync(receipt.path));
    stored.payload.result = 'needs_human';
    writeFileSync(receipt.path, JSON.stringify(stored));
    assert.throws(() => call('replay', snapshot.path, receipt.path), /integrity/);
    assert.throws(() => call('record', snapshot.path, response, directory), /integrity conflict/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
