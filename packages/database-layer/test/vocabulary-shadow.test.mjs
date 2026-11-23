import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncVocabulary, editVocabulary } from '../scripts/lib/vocabulary-store.mjs';
import { shadowReview } from '../scripts/lib/vocabulary-shadow.mjs';

test('read-only suggestion previews bounded evidence and detects concurrent operator edits', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shadow-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const dir = path.join(root, 'docs');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'private-filename.md'), 'Acme is a supplier. Example is a vendor.');
  const file = path.join(root, 'state.json');
  syncVocabulary(dir, file);
  const args = [file, 'type:vendor', ['type:supplier']];
  const preview = await shadowReview(...args);
  assert.equal(preview.status, 'preview');
  assert.ok(!JSON.stringify(preview).includes('private-filename'));
  const before = fs.readFileSync(file);
  const report = await shadowReview(...args, 'jev', async () => ({choice: 'type:supplier', model: 'fixture'}));
  assert.equal(report.hash, preview.hash);
  assert.deepEqual(fs.readFileSync(file), before);
  await assert.rejects(shadowReview(...args, 'jev', async () => {
    editVocabulary(file, 'Describe vendor as An independent seller');
    return {choice:'type:supplier', model:'fixture'};
  }), /changed/);
});

test('benchmark excludes labels and distinguishes erroneous suggestions from provider failures', async () => {
  const { evaluateRanker } = await import('../scripts/evaluate-vocabulary-shadow.mjs');
  const cases = ['first', 'second', 'third'].map(id => ({
    id, subject: {id:'new'}, candidates: [{id:'correct'}, {id:'wrong'}], expected:'correct'
  }));
  let count = 0;
  const report = await evaluateRanker(cases, async packet => {
    assert.deepEqual(Object.keys(packet), ['subject', 'candidates']);
    if (++count === 3) throw new Error('unavailable');
    return {choice: count === 1 ? 'wrong' : 'no_match'};
  });
  assert.equal(report.incorrectMerges, 1);
  assert.equal(report.missedDuplicates, 2);
  assert.equal(report.providerErrors, 1);
  assert.equal(report.scoredCases, 2);
});
