import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createClientWorkspacePackageV2 } from '@create-something/delivery-schema/client-workspace-package';

import {
  ManagedDeliveryError,
  ManagedDeliveryRuntime
} from '../src/lib/server/deliveries/managed-delivery-runtime.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function releaseFiles(): Record<string, Buffer> {
  const root = join(REPO_ROOT, 'config/delivery/build-releases/example-non-production');
  const files: Record<string, Buffer> = {};
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else files[`release/${relative(root, path)}`] = readFileSync(path);
    }
  };
  walk(root);
  return files;
}

test('managed delivery preserves client work through update, checkpoint, undo, and rollback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'managed-delivery-runtime-'));
  const managedRoot = join(root, 'workspaces');
  const stateRoot = join(root, 'state');
  const keys = generateKeyPairSync('ed25519');
  const trustPolicy = {
    issuer: 'CREATE SOMETHING',
    appVersion: '0.2.0',
    keys: { 'release-test': keys.publicKey },
    now: () => new Date('2026-07-28T00:00:00.000Z')
  };
  const runtime = new ManagedDeliveryRuntime({ managedRoot, stateRoot, trustPolicy });
  const createPackage = (version: string, files: Record<string, string>) =>
    createClientWorkspacePackageV2({
      manifest: {
        packageId: `northstar-${version.replaceAll('.', '-')}`,
        createdAt: '2026-07-27T18:20:00.000Z',
        expiresAt: '2026-08-27T18:20:00.000Z',
        issuer: 'CREATE SOMETHING',
        keyId: 'release-test',
        releaseVersion: version,
        minimumAppVersion: '0.2.0',
        releaseManifestPath: 'release/build-release.json',
        workspace: {
          id: 'northstar',
          label: 'Northstar',
          sourcePrefix: 'workspace',
          editableRoots: ['.'],
          preview: { kind: 'static', root: '.', entry: 'index.html' }
        }
      },
      files: {
        ...releaseFiles(),
        ...Object.fromEntries(
          Object.entries(files).map(([path, content]) => [`workspace/${path}`, content])
        )
      },
      privateKey: keys.privateKey
    });

  try {
    await runtime.install(
      createPackage('1.0.0', {
        'index.html': '<h1>Version one</h1>\n',
        'styles.css': 'color: black;\n'
      })
    );
    const workspaceRoot = join(managedRoot, 'northstar');
    const indexPath = join(workspaceRoot, 'index.html');
    await writeFile(indexPath, '<h1>Client-owned edit</h1>\n', 'utf8');
    const beforeUpdate = await readFile(indexPath, 'utf8');

    const checkpointId = await runtime.checkpoint('northstar');
    await writeFile(indexPath, '<h1>Temporary edit</h1>\n', 'utf8');
    await runtime.undo('northstar', checkpointId);
    assert.equal(await readFile(indexPath, 'utf8'), beforeUpdate);

    const plan = await runtime.planUpdate(
      createPackage('2.0.0', {
        'index.html': '<h1>Version one</h1>\n',
        'styles.css': 'color: navy;\n',
        'proof.txt': 'release two\n'
      })
    );
    assert.deepEqual(plan.changed, ['styles.css']);
    assert.deepEqual(plan.added, ['proof.txt']);
    assert.deepEqual(plan.conflicts, []);
    assert.deepEqual(plan.preservedClientPaths, ['index.html']);

    await runtime.applyUpdate(plan.planId);
    assert.equal(await readFile(indexPath, 'utf8'), beforeUpdate);
    assert.equal(await readFile(join(workspaceRoot, 'styles.css'), 'utf8'), 'color: navy;\n');
    assert.equal(await readFile(join(workspaceRoot, 'proof.txt'), 'utf8'), 'release two\n');

    await runtime.rollback('northstar');
    assert.equal(await readFile(indexPath, 'utf8'), beforeUpdate);
    assert.equal(await readFile(join(workspaceRoot, 'styles.css'), 'utf8'), 'color: black;\n');
    await assert.rejects(readFile(join(workspaceRoot, 'proof.txt'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('managed delivery blocks conflicts and stale update plans before mutation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'managed-delivery-conflict-'));
  const managedRoot = join(root, 'workspaces');
  const stateRoot = join(root, 'state');
  const keys = generateKeyPairSync('ed25519');
  const runtime = new ManagedDeliveryRuntime({
    managedRoot,
    stateRoot,
    trustPolicy: {
      issuer: 'CREATE SOMETHING',
      appVersion: '0.2.0',
      keys: { 'release-test': keys.publicKey },
      now: () => new Date('2026-07-28T00:00:00.000Z')
    }
  });
  const createPackage = (version: string, content: string) =>
    createClientWorkspacePackageV2({
      manifest: {
        packageId: `conflict-${version.replaceAll('.', '-')}`,
        createdAt: '2026-07-27T18:20:00.000Z',
        expiresAt: '2026-08-27T18:20:00.000Z',
        issuer: 'CREATE SOMETHING',
        keyId: 'release-test',
        releaseVersion: version,
        minimumAppVersion: '0.2.0',
        releaseManifestPath: 'release/build-release.json',
        workspace: {
          id: 'conflict',
          label: 'Conflict',
          sourcePrefix: 'workspace',
          editableRoots: ['.'],
          preview: { kind: 'static', root: '.', entry: 'index.html' }
        }
      },
      files: { ...releaseFiles(), 'workspace/index.html': content },
      privateKey: keys.privateKey
    });

  try {
    await runtime.install(createPackage('1.0.0', 'base\n'));
    const indexPath = join(managedRoot, 'conflict', 'index.html');
    await writeFile(indexPath, 'client\n', 'utf8');
    const conflict = await runtime.planUpdate(createPackage('2.0.0', 'upstream\n'));
    assert.deepEqual(conflict.conflicts, ['index.html']);
    await assert.rejects(
      runtime.applyUpdate(conflict.planId),
      (error: unknown) => error instanceof ManagedDeliveryError && error.code === 'update_conflict'
    );
    assert.equal(await readFile(indexPath, 'utf8'), 'client\n');

    await writeFile(indexPath, 'base\n', 'utf8');
    const stale = await runtime.planUpdate(createPackage('2.0.0', 'upstream\n'));
    await writeFile(indexPath, 'changed-after-preview\n', 'utf8');
    await assert.rejects(
      runtime.applyUpdate(stale.planId),
      (error: unknown) =>
        error instanceof ManagedDeliveryError && error.code === 'update_plan_stale'
    );
    assert.equal(await readFile(indexPath, 'utf8'), 'changed-after-preview\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
