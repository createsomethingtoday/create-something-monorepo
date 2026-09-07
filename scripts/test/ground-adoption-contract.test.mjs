import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyAdjudicatedExports, verifyCheckout } from '../ground-adoption-contract.mjs';

const sourceSha = 'a'.repeat(40);
function evidence() {
  return {
    modules: [{ module: 'packages/mcp-core/src/server.ts',
      dead_exports: [{ name: 'createScopedServer' }, { name: 'jsonContent' }] }],
    adjudication: { modules: [{ module: 'packages/mcp-core/src/server.ts',
      symbols: ['createScopedServer', 'jsonContent'] }] },
    publicIndex: "export { createScopedServer, jsonContent } from './server.js';",
    packageExports: { '.': { default: './dist/index.js' } }
  };
}

test('complete reviewed export evidence and clean source produce a ready contract', () => {
  assert.equal(verifyAdjudicatedExports(evidence()), 2);
  assert.deepEqual(verifyCheckout({ sourceSha, status: '' }), { source_sha: sourceSha, dirty: false });
});

test('a detector omission cannot silently shrink the reviewed candidate set', () => {
  const input = evidence();
  input.modules[0].dead_exports.pop();
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('a removed module cannot disappear from adjudication', () => {
  const input = evidence();
  input.modules = [];
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('an API removal cannot pass when the detector also stops reporting it', () => {
  const input = evidence();
  input.modules[0].dead_exports.pop();
  input.publicIndex = "export { createScopedServer } from './server.js';";
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('a retained candidate must still be publicly exported', () => {
  const input = evidence();
  input.publicIndex = "export { createScopedServer } from './server.js';";
  assert.throws(() => verifyAdjudicatedExports(input), /no longer in the reviewed public API/);
});

test('new or duplicated candidates require review', () => {
  const input = evidence();
  input.modules[0].dead_exports.push({ name: 'newApi' });
  assert.throws(() => verifyAdjudicatedExports(input));
  input.modules[0].dead_exports[2] = { name: 'jsonContent' };
  assert.throws(() => verifyAdjudicatedExports(input));
});

for (const status of [' M packages/mcp-core/src/server.ts\n', 'M  .ground.yml\n', '?? packages/mcp-core/src/new.ts\n']) {
  test('dirty source cannot be bound only to HEAD: ' + status.trim(), () => {
    assert.throws(() => verifyCheckout({ sourceSha, status }), /clean checkout/);
  });
}
