import test from 'node:test';
import assert from 'node:assert/strict';
import { editTypes } from '../scripts/lib/type-edits.mjs';

const types = () => [
  { id: 'type-customer', name: 'Customer', description: 'A customer.', color: 'blue' },
  { id: 'type-order', name: 'Order', description: 'An order.' }
];

test('rename <name> to <new name> preserves ids, metadata, and input', () => {
  const before = types();
  const after = editTypes(before, 'Rename Customer to Client');
  assert.deepEqual(after[0], { ...before[0], name: 'Client' });
  assert.equal(before[0].name, 'Customer');
  assert.notEqual(after, before);
});

test('quoted names, ids, casing, and final punctuation are supported', () => {
  assert.equal(editTypes(types(), 'rename "CUSTOMER" to "Client account".')[0].name, 'Client account');
  assert.equal(editTypes(types(), 'Rename type-order to Purchase.')[1].name, 'Purchase');
});

test('describe <name> as <text> and set the description of <name> to <text>', () => {
  assert.equal(editTypes(types(), 'Describe Customer as A person who buys our services.')[0].description, 'A person who buys our services.');
  assert.equal(editTypes(types(), 'Set the description of Order to "A confirmed purchase."')[1].description, 'A confirmed purchase.');
  assert.equal(editTypes(types(), 'Set description of type-order to A purchase.')[1].description, 'A purchase.');
});

test('rejects unknown types and ambiguous duplicate names', () => {
  assert.throws(() => editTypes(types(), 'Rename Invoice to Bill'), /No type.*Invoice/);
  assert.throws(() => editTypes([...types(), { id: 'another', name: 'customer' }], 'Rename Customer to Client'), /ambiguous.*id/i);
});

test('rejects collisions and empty or unsupported edits without mutating input', () => {
  const before = types();
  assert.throws(() => editTypes(before, 'Rename Customer to order'), /Order.*already/i);
  for (const instruction of ['Delete Customer', 'Rename Customer to ', 'Describe Customer as ', '', 'Rename Customer to ""']) {
    assert.throws(() => editTypes(before, instruction), /supported|empty/i);
  }
  assert.deepEqual(before, types());
});

test('names containing grammar separators are resolved against existing types', () => {
  const input = [{ id: 'a', name: 'Path to Purchase', description: '' }];
  assert.equal(editTypes(input, 'Rename Path to Purchase to Journey')[0].name, 'Journey');
});

test('does not interpret description text as additional commands', () => {
  const text = 'A buyer; rename Order to Purchase.';
  const after = editTypes(types(), `Describe Customer as ${text}`);
  assert.equal(after[0].description, text);
  assert.equal(after[1].name, 'Order');
});
