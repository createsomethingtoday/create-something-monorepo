import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, linkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { receiptDestination, writeReceipt } from '../ground-adoption-output.mjs';
import { verifyAdjudicatedExports, verifyCheckout, verifyScanCoverage } from '../ground-adoption-contract.mjs';

const sourceSha = 'a'.repeat(40);

test('receipt destinations preserve source across direct paths, symlinks and hard links', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'ground-output-test-'));
  try {
    const root = join(temporary, 'repo');
    mkdirSync(root);
    const source = join(root, 'source.ts');
    writeFileSync(source, 'original source');
    assert.throws(() => receiptDestination(root, source), /outside/);
    assert.throws(() => receiptDestination(root, join(root, 'new.json')), /outside/);
    const alias = join(temporary, 'alias');
    symlinkSync(root, alias);
    assert.throws(() => receiptDestination(root, join(alias, 'new.json')), /outside/);
    for (const [name, target] of [['linked.json', source], ['dangling.json', join(root, 'missing')]]) {
      const output = join(temporary, name);
      symlinkSync(target, output);
      assert.throws(() => writeReceipt(root, output, 'receipt'), /symbolic link/);
    }
    const hardLink = join(temporary, 'hard.json');
    linkSync(source, hardLink);
    writeReceipt(root, hardLink, 'receipt');
    assert.equal(readFileSync(source, 'utf8'), 'original source');
    assert.equal(readFileSync(hardLink, 'utf8'), 'receipt');
    const sibling = join(temporary, 'repo-receipts');
    mkdirSync(sibling);
    const safe = join(sibling, 'receipt.json');
    writeReceipt(root, safe, 'first');
    writeReceipt(root, safe, 'second');
    assert.equal(readFileSync(safe, 'utf8'), 'second');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

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
      symbols: ['createScopedServer', 'jsonContent'],
      export_kinds: { createScopedServer: 'value', jsonContent: 'value' } }] },
    publicIndex: "export { createScopedServer, jsonContent } from './server.js';",
    packageExports: { '.': { default: './dist/index.js' } }
  };
}

test('complete reviewed export evidence and clean source produce a ready contract', () => {
  assert.equal(verifyAdjudicatedExports(evidence()), 2);
  assert.deepEqual(verifyCheckout({ sourceSha, status: '' }), { source_sha: sourceSha, dirty: false });
});

for (const publicIndex of [
  "export type { createScopedServer, jsonContent } from './server.js';",
  "export { type createScopedServer, jsonContent } from './server.js';",
  "// export { createScopedServer, jsonContent } from './server.js';",
  "export { createScopedServer as renamed, jsonContent } from './server.js';"
]) {
  test('runtime API cannot be retained through type-only, commented or aliased exports: ' + publicIndex, () => {
    assert.throws(() => verifyAdjudicatedExports({ ...evidence(), publicIndex }));
  });
}

test('reviewed type exports are retained as types', () => {
  const input = evidence();
  input.adjudication.modules[0].export_kinds.createScopedServer = 'type';
  input.publicIndex = "export { type createScopedServer, jsonContent } from './server.js';";
  assert.equal(verifyAdjudicatedExports(input), 2);
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
