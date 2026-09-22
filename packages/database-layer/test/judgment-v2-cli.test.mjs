import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot, questionSet, response, trace, policy } from './fixtures/judgment-v2.mjs';
const cli = fileURLToPath(new URL('../scripts/judgment-v2.mjs', import.meta.url));
const call = (...args) =>
  execFileSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

test('fresh CLI processes retain raw primitives and recompose changed policy without inference', () => {
  const dir = mkdtempSync(join(tmpdir(), 'judgment-v2-'));
  const write = (name, value) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(value));
    return path;
  };
  try {
    const evidence = JSON.parse(call('snapshot', write('raw-evidence.json', snapshot), dir));
    const questions = JSON.parse(call('questions', write('raw-questions.json', questionSet), dir));
    const request = JSON.parse(call('compile', evidence.path, questions.path, 'jev-1.13.0'));
    assert.deepEqual(request.questions.detail.criteria, questionSet.questions[2].criteria);
    assert.equal(request.state.evidence.developer.entityId, snapshot.sources[0].entityId);
    const inference = JSON.parse(
      call(
        'record',
        evidence.path,
        questions.path,
        'jev-1.13.0',
        write('response.json', { response, trace, error: null }),
        dir
      )
    );
    const bytes = readFileSync(inference.path, 'utf8');
    assert.deepEqual(JSON.parse(bytes).payload.response, response);
    const original = policy(questions.digest);
    const first = JSON.parse(
      call(
        'decide',
        evidence.path,
        questions.path,
        inference.path,
        write('policy-1.json', original),
        dir
      )
    );
    const changed = structuredClone(original);
    changed.version = '2';
    changed.rules[1].threshold = 0.9;
    const second = JSON.parse(
      call(
        'decide',
        evidence.path,
        questions.path,
        inference.path,
        write('policy-2.json', changed),
        dir
      )
    );
    const replay = (p) =>
      call('replay', evidence.path, questions.path, inference.path, p.policy.path, p.decision.path);
    assert.equal(replay(first), replay(first));
    assert.equal(JSON.parse(replay(first)).result, 'prerequisites_supported');
    assert.equal(JSON.parse(replay(second)).result, 'needs_human');
    assert.equal(readFileSync(inference.path, 'utf8'), bytes);
    assert.equal(
      JSON.parse(replay(first)).inferenceDigest,
      JSON.parse(replay(second)).inferenceDigest
    );
    assert.throws(
      () =>
        call(
          'replay',
          evidence.path,
          questions.path,
          inference.path,
          second.policy.path,
          first.decision.path
        ),
      /replay mismatch/
    );
    const stored = JSON.parse(bytes);
    stored.payload.response.answers.ack.noul = 0.1;
    writeFileSync(inference.path, JSON.stringify(stored));
    assert.throws(() => replay(first), /integrity/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
