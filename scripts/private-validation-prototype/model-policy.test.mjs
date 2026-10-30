import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeProposal, requestFor, MODEL_POLICY } from './model-policy.mjs';

test('model proposals cannot authorize undeclared actions', () => {
  for (const tool of ['delete_file', 'send_email', 'read_secret', '__proto__']) {
    assert.throws(() => executeProposal({ tool, values: [] }), /denied/);
  }
});
test('arguments and extra fields are validated outside the model', () => {
  for (const values of [[Infinity, 2], [1001, 0], [1], ['7', 11], null]) {
    assert.throws(() => executeProposal({ tool: 'sum', values }));
  }
  assert.throws(() => executeProposal({ tool: 'sum', values: [7, 11], permission: 'admin' }));
  assert.deepEqual(executeProposal({ tool: 'sum', values: [7, 11] }), { tool: 'sum', result: 18, externalMutations: 0 });
});
test('input and output budgets and model are fixed by trusted code', () => {
  assert.throws(() => requestFor('x'.repeat(9000), 'test'), /budget/);
  const r = requestFor('owned instructions', 'test');
  assert.equal(r.model, MODEL_POLICY.model);
  assert.equal(r.max_output_tokens, 1024);
  assert.equal(r.store, false);
  assert.equal(r.tools, undefined);
});
