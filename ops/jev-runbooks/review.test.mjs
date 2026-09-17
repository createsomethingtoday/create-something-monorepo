import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileBudget, review } from './review.mjs';
test('durable ledger caps cumulative spend and cannot be raised by later invocation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jev-ledger-'));
  try {
    const path = join(dir, 'budget.json');
    assert.equal(await fileBudget(path, 0.01)({ maximumUsd: 0.01 }), true);
    assert.equal(await fileBudget(path, 5)({ maximumUsd: 0.01 }), false);
    assert.equal(JSON.parse(await readFile(path)).reservedCents, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('concurrent reservations cannot overspend', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jev-race-'));
  try {
    const reserve = fileBudget(join(dir, 'budget.json'), 0.01);
    const results = await Promise.allSettled([
      reserve({ maximumUsd: 0.01 }),
      reserve({ maximumUsd: 0.01 })
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled' && r.value === true).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('corrupt ledger never grants a reservation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jev-corrupt-'));
  try {
    const path = join(dir, 'budget.json');
    await writeFile(path, '{"limitCents":100,"reservedCents":-1}');
    await assert.rejects(fileBudget(path, 1)({ maximumUsd: 0.01 }), /Invalid ledger/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('failure route executes shared transport and returns non-executable guidance', async () => {
  const result = await review(
    'failure',
    { log: 'TypeScript executable missing' },
    {
      apiKey: 'test',
      reserve: async () => true,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          model: 'jev-test',
          answers: {
            failure: {
              type: 'choice',
              choice: 'dependency',
              confidence: 1,
              probabilities: {
                dependency: 1,
                typecheck: 0,
                assertion: 0,
                environment: 0,
                unknown: 0
              }
            }
          }
        })
      })
    }
  );
  assert.equal(result.runbook, 'dependency');
  assert.equal(result.canExecute, false);
});
