import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createClientWorkspacePackage } from '@create-something/delivery-schema/client-workspace-package';

import {
  ClientWorkspaceDeliveryError,
  importClientWorkspaceDelivery,
  loadImportedWorkspaceDefinitions
} from '../src/lib/server/deliveries/importer.js';

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

test('a trusted READY delivery imports atomically and survives registry reload', async () => {
  const root = mkdtempSync(join(tmpdir(), 'client-workspace-delivery-'));
  const managedRoot = join(root, 'workspaces');
  const stateRoot = join(root, 'state');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const packageJson = createClientWorkspacePackage({
    manifest: {
      packageId: 'delivery-acme-homepage-v1',
      createdAt: '2026-07-27T18:20:00.000Z',
      issuer: 'CREATE SOMETHING',
      keyId: 'local-verifier',
      releaseManifestPath: 'release/build-release.json',
      workspace: {
        id: 'acme-homepage',
        label: 'Acme homepage',
        sourcePrefix: 'workspace',
        editableRoots: ['.'],
        preview: { kind: 'static', root: '.', entry: 'index.html' }
      }
    },
    files: {
      ...releaseFiles(),
      'workspace/index.html': '<!doctype html><h1>Trusted delivery</h1>'
    },
    privateKey
  });

  const imported = await importClientWorkspaceDelivery({
    packageJson,
    trustedPublicKey: publicKey,
    managedRoot,
    stateRoot
  });
  assert.equal(imported.id, 'acme-homepage');
  assert.equal(
    readFileSync(join(managedRoot, 'acme-homepage', 'index.html'), 'utf8'),
    '<!doctype html><h1>Trusted delivery</h1>'
  );
  assert.deepEqual(loadImportedWorkspaceDefinitions({ managedRoot, stateRoot }), [imported]);

  const tampered = JSON.parse(packageJson) as {
    files: Array<{ path: string; contentBase64: string }>;
  };
  tampered.files.find((file) => file.path === 'workspace/index.html')!.contentBase64 =
    Buffer.from('tampered').toString('base64');
  await assert.rejects(
    importClientWorkspaceDelivery({
      packageJson: JSON.stringify(tampered),
      trustedPublicKey: publicKey,
      managedRoot,
      stateRoot: join(root, 'tampered-state')
    }),
    (error) => error instanceof ClientWorkspaceDeliveryError && error.code === 'package_untrusted'
  );
  assert.equal(existsSync(join(managedRoot, 'tampered')), false);
});
