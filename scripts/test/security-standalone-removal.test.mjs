import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateRemovalDocuments,
  verifyStandaloneRemoval,
} from '../security-standalone-removal.mjs';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'standalone-removal-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const manifest = {
    dependencies: { 'puppeteer-core': '25.15.0' },
    engines: { node: '>=22.12.0' },
  };
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { ...manifest.dependencies } },
      'node_modules/puppeteer-core': { version: '25.15.0' },
      'node_modules/@puppeteer/browsers': { version: '3.2.5' },
    },
  };
  const write = (file, obj) =>
    writeFileSync(join(root, file), JSON.stringify(obj));
  const pkg = (name, metadata) => {
    mkdirSync(join(root, 'node_modules', name), { recursive: true });
    write('node_modules/' + name + '/package.json', metadata);
  };
  const save = () => {
    write('package.json', manifest);
    write('package-lock.json', lock);
  };
  pkg('puppeteer-core', {
    name: 'puppeteer-core',
    version: '25.15.0',
    dependencies: { '@puppeteer/browsers': '3.2.5' },
  });
  pkg('@puppeteer/browsers', { name: '@puppeteer/browsers', version: '3.2.5' });
  save();
  return { root, manifest, lock, write, pkg, save };
}
test('complete isolated removed-dependency closure passes', (t) => {
  const f = fixture(t);
  assert.equal(verifyStandaloneRemoval(f.root).packagesChecked, 2);
});
test('manifest dependency and npm alias reintroduction fail', (t) => {
  const f = fixture(t);
  for (const deps of [
    { 'extract-zip': '2.0.1' },
    { alias: 'npm:extract-zip@2.0.1' },
  ]) {
    const m = structuredClone(f.manifest),
      l = structuredClone(f.lock);
    Object.assign(m.dependencies, deps);
    l.packages[''].dependencies = m.dependencies;
    assert.throws(() => validateRemovalDocuments(m, l), /reintroduced|alias/);
  }
});
test('transitive lock identity, path and alias fail', (t) => {
  const f = fixture(t);
  for (const [key, value] of [
    ['node_modules/a/node_modules/extract-zip', { version: '2.0.1' }],
    ['node_modules/alias', { name: 'extract-zip', version: '2.0.1' }],
    ['node_modules/a', { dependencies: { alias: 'npm:extract-zip@2.0.1' } }],
  ]) {
    const l = structuredClone(f.lock);
    l.packages[key] = value;
    assert.throws(() => validateRemovalDocuments(f.manifest, l), /Removed/);
  }
});
test('installed reintroduction cannot hide behind unchanged lockfile', (t) => {
  const f = fixture(t);
  f.pkg('alias', { name: 'extract-zip', version: '2.0.1' });
  assert.throws(() => verifyStandaloneRemoval(f.root), /Removed installed/);
});
test('missing installed dependencies and forged versions fail', (t) => {
  const f = fixture(t);
  f.pkg('puppeteer-core', {
    name: 'puppeteer-core',
    version: '25.15.0',
    dependencies: { missing: '1.0.0' },
  });
  assert.throws(() => verifyStandaloneRemoval(f.root), /Missing resolved/);
  f.pkg('puppeteer-core', { name: 'puppeteer-core', version: '0.0.0' });
  assert.throws(() => verifyStandaloneRemoval(f.root), /mismatched/);
});
test('missing manifest, lock or installed closure fail', (t) => {
  for (const file of ['package.json', 'package-lock.json', 'node_modules']) {
    const f = fixture(t);
    rmSync(join(f.root, file), { recursive: true, force: true });
    assert.throws(() => verifyStandaloneRemoval(f.root));
  }
});
test('manifest and lock mismatch fails', (t) => {
  const f = fixture(t);
  f.lock.packages[''].dependencies = {};
  assert.throws(() => validateRemovalDocuments(f.manifest, f.lock), /mismatch/);
});
test('installed dependency cannot escape the isolated tree', (t) => {
  const f = fixture(t),
    other = fixture(t);
  rmSync(join(f.root, 'node_modules/puppeteer-core'), { recursive: true });
  symlinkSync(
    join(other.root, 'node_modules/puppeteer-core'),
    join(f.root, 'node_modules/puppeteer-core'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  assert.throws(() => verifyStandaloneRemoval(f.root), /escapes/);
});

test('upstream-only development declarations are not installed dependencies', (t) => {
  const f = fixture(t);
  f.pkg('@puppeteer/browsers', {
    name: '@puppeteer/browsers',
    version: '3.2.5',
    devDependencies: { puppeteer: '25.15.0' },
  });
  assert.equal(verifyStandaloneRemoval(f.root).packagesChecked, 2);
  f.pkg('puppeteer', { name: 'puppeteer', version: '25.15.0' });
  assert.throws(() => verifyStandaloneRemoval(f.root), /Removed installed/);
});
