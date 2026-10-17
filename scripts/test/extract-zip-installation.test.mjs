import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const security = path.join(root, 'packages/huggingface-spaces/motion-ontology/security');
const { apply, applyTree } = createRequire(import.meta.url)(path.join(security, 'apply-extract-zip-patch.cjs'));
const hashes = JSON.parse(await readFile(path.join(security, 'extract-zip-hashes.json')));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.ok(process.env.EXTRACT_ZIP_ORIGINAL, 'Set EXTRACT_ZIP_ORIGINAL to pristine 2.0.1 index.js');
const original = await readFile(process.env.EXTRACT_ZIP_ORIGINAL);
assert.equal(digest(original), hashes.upstream);

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'extract-zip-install-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  async function pkg(relative = 'node_modules/extract-zip', version = '2.0.1') {
    const target = path.join(dir, relative);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'package.json'), JSON.stringify({ name: 'extract-zip', version }));
    await writeFile(path.join(target, 'index.js'), original);
    return target;
  }
  return { dir, pkg };
}

test('standalone patch verifies exact bytes and is idempotent', async (t) => {
  const f = await fixture(t), pkg = await f.pkg();
  apply(pkg);
  assert.equal(digest(await readFile(path.join(pkg, 'index.js'))), hashes.patched);
  apply(pkg);
});

test('standalone patch covers hoisted and scoped nested npm copies', async (t) => {
  const f = await fixture(t);
  const targets = [await f.pkg(), await f.pkg('node_modules/@scope/browser/node_modules/extract-zip'), await f.pkg('node_modules/consumer/node_modules/nested/node_modules/extract-zip')];
  await mkdir(path.join(f.dir, 'node_modules/.bin'));
  await symlink('../extract-zip/index.js', path.join(f.dir, 'node_modules/.bin/extract-zip'));
  assert.equal(applyTree(path.join(f.dir, 'node_modules')), 3);
  for (const target of targets) assert.equal(digest(await readFile(path.join(target, 'index.js'))), hashes.patched);
});

test('standalone patch rejects unknown versions without modifying source', async (t) => {
  const f = await fixture(t), pkg = await f.pkg(undefined, '2.0.2');
  assert.throws(() => apply(pkg), /Unreviewed extractor version/);
  assert.equal(digest(await readFile(path.join(pkg, 'index.js'))), hashes.upstream);
});

test('standalone patch rejects changed source bytes', async (t) => {
  const f = await fixture(t), pkg = await f.pkg();
  await writeFile(path.join(pkg, 'index.js'), Buffer.concat([original, Buffer.from('\n// drift\n')]));
  assert.throws(() => apply(pkg), /Unreviewed extractor content/);
});

test('standalone patch refuses linked source or missing extractor', async (t) => {
  const f = await fixture(t), pkg = await f.pkg();
  await copyFile(path.join(pkg, 'index.js'), path.join(f.dir, 'original.js'));
  await rm(path.join(pkg, 'index.js'));
  await symlink(path.join(f.dir, 'original.js'), path.join(pkg, 'index.js'));
  assert.throws(() => apply(pkg), /Linked extractor source/);
  const empty = path.join(f.dir, 'empty');
  await mkdir(empty);
  assert.throws(() => applyTree(empty), /No extractor found/);
});

test('Docker patches before any lifecycle scripts and root pnpm covers all six routes', async () => {
  const docker = await readFile(path.join(root, 'packages/huggingface-spaces/motion-ontology/Dockerfile'), 'utf8');
  assert.match(docker, /RUN npm install --ignore-scripts && node security\/apply-extract-zip-patch.cjs/);
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json')));
  assert.equal(manifest.pnpm.patchedDependencies['extract-zip@2.0.1'], 'packages/huggingface-spaces/motion-ontology/security/extract-zip@2.0.1.patch');
  const lock = await readFile(path.join(root, 'pnpm-lock.yaml'), 'utf8');
  assert.equal([...lock.matchAll(/      extract-zip: 2\.0\.1\(patch_hash=[a-z0-9]+\)/g)].length, 6);
  assert.doesNotMatch(lock, /      extract-zip: 2\.0\.1\n/);
});
