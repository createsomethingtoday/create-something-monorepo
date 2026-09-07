import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyAdjudicatedExports, verifyCheckout, verifyScanCoverage } from '../ground-adoption-contract.mjs';

const sourceSha = 'a'.repeat(40);

test('scan coverage must retain its reviewed denominator', () => {
  const expected = { files_discovered: 19, files_checked: 19 };
  verifyScanCoverage({ ...expected, status: 'PASS' }, expected);
  assert.throws(() => verifyScanCoverage({ files_discovered: 0, files_checked: 0 }, expected));
  assert.throws(() => verifyScanCoverage({ files_discovered: 19, files_checked: 18 }, expected));
});

test('missing orphan scan counts cannot produce readiness', () => {
  assert.throws(() => verifyScanCoverage({ status: 'PASS' }, { files_scanned: 18 }));
});
function evidence() {
  return {
    modules: [{ module: 'packages/mcp-core/src/server.ts', total_exports: 2,
      dead_exports: [{ name: 'createScopedServer' }, { name: 'jsonContent' }] },
      { module: 'packages/mcp-core/src/auth.ts', total_exports: 1, dead_exports: [] }],
    adjudication: { inventory: [
      { module: 'packages/mcp-core/src/server.ts', total_exports: 2 },
      { module: 'packages/mcp-core/src/auth.ts', total_exports: 1 }
    ], modules: [{ module: 'packages/mcp-core/src/server.ts',
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

test('removing a zero-candidate module must fail the inventory contract', () => {
  const input = evidence();
  input.modules.pop();
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('an extra zero-candidate module also requires baseline review', () => {
  const input = evidence();
  input.modules.push({ module: 'packages/mcp-core/src/new.ts', total_exports: 0, dead_exports: [] });
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('zero parsed exports cannot pass for a known exporting module', () => {
  const input = evidence();
  input.modules[1].total_exports = 0;
  assert.throws(() => verifyAdjudicatedExports(input));
});

test('changed export totals require explicit re-adjudication', () => {
  const input = evidence();
  input.modules[1].total_exports = 2;
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
