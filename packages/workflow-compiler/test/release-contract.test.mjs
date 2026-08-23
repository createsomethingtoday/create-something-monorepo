import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertExactPackageInventory,
  assertSafePackageSourceInventory,
  validateReleaseManifest
} from '../scripts/release-contract.mjs';

const packageJsonUrl = new URL('../package.json', import.meta.url);
const repositoryRoot = new URL('../../../', import.meta.url);

test('the public manifest declares the complete release and support boundary', async () => {
  const manifest = JSON.parse(await readFile(packageJsonUrl, 'utf8'));

  assert.deepEqual(validateReleaseManifest(manifest), []);
  assert.equal(manifest.version, '0.1.0-beta.0');
  assert.deepEqual(manifest.engines, { node: '^22.0.0 || ^24.0.0' });
  assert.equal(manifest.publishConfig.access, 'public');
  assert.equal(manifest.publishConfig.provenance, true);
  assert.deepEqual(manifest.dependencies, undefined);
});

test('release manifest validation fails closed on metadata and runtime dependency drift', async () => {
  const manifest = JSON.parse(await readFile(packageJsonUrl, 'utf8'));
  delete manifest.repository;
  manifest.engines.node = '>=20';
  manifest.publishConfig.provenance = false;
  manifest.dependencies = { ambient: '^1.0.0' };

  assert.deepEqual(validateReleaseManifest(manifest), [
    'repository must target the workflow-compiler directory in the public monorepo.',
    'engines.node must equal ^22.0.0 || ^24.0.0.',
    'publishConfig.provenance must be true.',
    'The public package must have zero runtime dependencies.'
  ]);
});

test('the package inventory requires exact path equality', () => {
  assert.doesNotThrow(() =>
    assertExactPackageInventory(
      ['LICENSE', 'README.md', 'package.json'],
      ['LICENSE', 'README.md', 'package.json']
    )
  );
  assert.throws(
    () =>
      assertExactPackageInventory(
        ['README.md', 'package.json', 'src/private.ts'],
        ['README.md', 'package.json']
      ),
    /Packed files do not match the committed inventory/
  );
});

test('the package inventory rejects unsafe paths and symbolic-link traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-package-inventory-'));
  try {
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'dist', 'index.js'), 'export {};\n');
    await symlink(join(root, 'dist'), join(root, 'linked-dist'));

    await assert.doesNotReject(() => assertSafePackageSourceInventory(root, ['dist/index.js']));
    await assert.rejects(
      () => assertSafePackageSourceInventory(root, ['../private-key.pem']),
      /Unsafe package inventory path/
    );
    await assert.rejects(
      () => assertSafePackageSourceInventory(root, ['linked-dist/index.js']),
      /may not traverse a symbolic link/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the trusted workflow validates supported LTS nodes and stages from protected main', async () => {
  const workflow = await readFile(
    new URL('.github/workflows/workflow-compiler-public-release.yml', repositoryRoot),
    'utf8'
  );

  assert.match(workflow, /node: \['22', '24'\]/);
  assert.match(workflow, /environment: npm-public/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /npm@11\.15\.0/);
  assert.match(workflow, /npm stage publish --access public/);
  assert.doesNotMatch(workflow, /run: npm publish --access public/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\(git rev-parse origin\/main\)"/);
});
