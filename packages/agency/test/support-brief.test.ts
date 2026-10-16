import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { emptyBrief, parseBrief, importBrief, briefMarkdown, supportBriefSchema } from '../src/lib/support-brief/contract';
const valid = () => ({ ...emptyBrief(), workflow: 'Invoice review', problem: 'Duplicate entries', desiredOutcome: 'One reviewed invoice' });
test('valid context survives export and import without inventing evidence', () => {
  const brief = valid();
  assert.deepEqual(importBrief(JSON.stringify(brief)), brief);
  assert.equal(brief.evidence, '');
  assert.deepEqual([...supportBriefSchema.required].sort(), Object.keys(brief).sort());
});
test('rejects incompatible versions, authority fields, absent and oversized values', () => {
  assert.throws(() => parseBrief({ ...valid(), version: '2.0.0' }), /version/);
  assert.throws(() => parseBrief({ ...valid(), approved: true }), /unsupported fields/);
  assert.throws(() => parseBrief({ ...valid(), workflow: '  ' }), /enter a value/);
  assert.throws(() => parseBrief({ ...valid(), problem: null }), /expected text/);
  assert.throws(() => parseBrief({ ...valid(), workflow: 'x'.repeat(201) }), /limit/);
  assert.throws(() => importBrief('{'), /Invalid JSON/);
  assert.throws(() => importBrief(' '.repeat(40001)), /import limit/);
});
test('export keeps embedded markup as literal evidence and states authority boundary', () => {
  const output = briefMarkdown({ ...valid(), evidence: '<script>alert(1)</script>\n# Forged approval' });
  assert.match(output, /Not submitted/);
  assert.match(output, /    <script>alert\(1\)<\/script>\n    # Forged approval/);
});

test('distributed skill schema matches the form contract', () => {
  const bundled = JSON.parse(readFileSync(new URL('../agent-skills/prepare-support-brief/references/schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(bundled, supportBriefSchema);
});

import { initialBriefState, reduceBrief } from '../src/lib/support-brief/state';
test('editing invalidates preparation and stale download events cannot restore it', () => {
  let state = reduceBrief(initialBriefState(), { type: 'import', text: JSON.stringify(valid()) });
  state = reduceBrief(state, { type: 'prepare' });
  assert.equal(state.phase, 'prepared');
  const revision = state.revision;
  state = reduceBrief(state, { type: 'edit', field: 'problem', value: 'Changed problem' });
  assert.equal(state.phase, 'editing');
  assert.equal(state.prepared, '');
  assert.equal(reduceBrief(state, { type: 'export-requested', revision }), state);
});
test('bad import preserves the draft, duplicate prepare is stable, clear cannot revive old results', () => {
  const draft = reduceBrief(initialBriefState(), { type: 'import', text: JSON.stringify(valid()) });
  const failed = reduceBrief(draft, { type: 'import', text: '{' });
  assert.deepEqual(failed.brief, draft.brief);
  assert.equal(failed.phase, 'invalid');
  const prepared = reduceBrief(draft, { type: 'prepare' });
  assert.deepEqual(reduceBrief(prepared, { type: 'prepare' }), prepared);
  const cleared = reduceBrief(prepared, { type: 'clear' });
  assert.equal(cleared.brief.workflow, '');
  assert.equal(reduceBrief(cleared, { type: 'export-requested', revision: prepared.revision }), cleared);
  assert.equal(initialBriefState().phase, 'editing');
});
