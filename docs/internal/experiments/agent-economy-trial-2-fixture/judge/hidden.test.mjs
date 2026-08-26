import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const subjectRoot = process.env.SUBJECT_ROOT;
if (!subjectRoot) throw new Error('SUBJECT_ROOT is required');

const retryUrl = pathToFileURL(resolve(subjectRoot, 'src/retry-after.mjs')).href;
const gateUrl = pathToFileURL(resolve(subjectRoot, 'src/approval-gate.mjs')).href;
const { parseRetryAfter } = await import(`${retryUrl}?hidden=1`);
const { evaluateApprovalGate } = await import(`${gateUrl}?hidden=1`);

test('retry parser handles hidden boundary cases', () => {
  assert.equal(parseRetryAfter(' 15 ', 0), 15_000);
  assert.equal(parseRetryAfter('1.5', 0), null);
  assert.equal(parseRetryAfter('.5', 0), null);
  assert.equal(parseRetryAfter('2026-08-26', 0), null);
  assert.equal(parseRetryAfter('08/26/2026', 0), null);
  assert.equal(parseRetryAfter('Sunday, 06-Nov-94 08:49:37 GMT', 0), 784_111_777_000);
  const startOf2026 = Date.UTC(2026, 0, 1);
  assert.equal(
    parseRetryAfter('Wednesday, 06-Nov-75 08:49:37 GMT', startOf2026),
    Date.UTC(2075, 10, 6, 8, 49, 37) - startOf2026
  );
  const august2026 = Date.UTC(2026, 7, 26);
  assert.equal(parseRetryAfter('Friday, 27-Aug-76 00:00:00 GMT', august2026), 0);
  assert.equal(parseRetryAfter('Sun Nov  6 08:49:37 1994', 0), 784_111_777_000);
  assert.equal(parseRetryAfter('Mon, 30 Feb 2026 00:00:00 GMT', 0), null);
  assert.equal(parseRetryAfter('Sat, 31 Dec 2016 23:59:60 GMT', 0), 1_483_228_800_000);
  assert.equal(parseRetryAfter('Sat Dec 31 23:59:60 2016', 0), 1_483_228_800_000);
  assert.equal(parseRetryAfter('+2', 0), null);
  assert.equal(parseRetryAfter(null, 0), null);
  assert.equal(parseRetryAfter('not-a-date', 0), null);
  assert.equal(parseRetryAfter('9007199254740992', 0), null);
  assert.throws(() => parseRetryAfter('1', Number.NaN), TypeError);
});

const base = {
  autonomy: 'auto_allow',
  evidenceComplete: true,
  approved: false,
  toolDeclared: true
};

test('approval gate honors fail-closed precedence', () => {
  assert.deepEqual(
    evaluateApprovalGate({ ...base, autonomy: 'blocked', evidenceComplete: false }),
    { disposition: 'stop', reason: 'BLOCKED', canInvoke: false }
  );
  assert.deepEqual(
    evaluateApprovalGate({ ...base, autonomy: 'manual_only', evidenceComplete: false }),
    { disposition: 'stop', reason: 'MISSING_EVIDENCE', canInvoke: false }
  );
  assert.deepEqual(evaluateApprovalGate({ ...base, autonomy: 'manual_only', approved: true }), {
    disposition: 'wait',
    reason: 'MANUAL_EXECUTION',
    canInvoke: false
  });
  assert.deepEqual(evaluateApprovalGate({ ...base, toolDeclared: false }), {
    disposition: 'stop',
    reason: 'MISSING_TOOL',
    canInvoke: false
  });
  assert.deepEqual(
    evaluateApprovalGate({
      ...base,
      autonomy: 'approval_required',
      approved: true,
      toolDeclared: false
    }),
    { disposition: 'stop', reason: 'MISSING_TOOL', canInvoke: false }
  );
});

test('approval gate validates every input field without mutation', () => {
  assert.throws(() => evaluateApprovalGate(), TypeError);
  assert.throws(() => evaluateApprovalGate({ ...base, autonomy: 'unknown' }), TypeError);
  assert.throws(() => evaluateApprovalGate({ ...base, approved: 1 }), TypeError);

  const input = { ...base };
  const snapshot = structuredClone(input);
  evaluateApprovalGate(input);
  assert.deepEqual(input, snapshot);
});
