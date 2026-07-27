import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import {
  ClientWorkspacePackageError,
  createClientWorkspacePackage,
  verifyClientWorkspacePackage
} from '../src/client-workspace-package.js';

test('a pinned trust root verifies signed workspace content and rejects modification', () => {
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
      'workspace/index.html': '<h1>Trusted delivery</h1>',
      'release/build-release.json': '{"synthetic":true}'
    },
    privateKey
  });

  const verified = verifyClientWorkspacePackage(
    packageJson,
    publicKey.export({ type: 'spki', format: 'pem' }).toString()
  );
  assert.equal(verified.manifest.workspace.id, 'acme-homepage');
  assert.equal(verified.files.get('workspace/index.html')?.toString(), '<h1>Trusted delivery</h1>');

  const modified = JSON.parse(packageJson) as {
    files: Array<{ path: string; contentBase64: string }>;
  };
  modified.files[0].contentBase64 = Buffer.from('<h1>Modified</h1>').toString('base64');
  assert.throws(
    () =>
      verifyClientWorkspacePackage(
        JSON.stringify(modified),
        publicKey.export({ type: 'spki', format: 'pem' }).toString()
      ),
    (error) => error instanceof ClientWorkspacePackageError && error.code === 'file_hash_mismatch'
  );
});

test('workspace packages reject untrusted signers, unsafe paths, and resource overflow', () => {
  const trusted = generateKeyPairSync('ed25519');
  const untrusted = generateKeyPairSync('ed25519');
  const manifest = {
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
      preview: { kind: 'static' as const, root: '.', entry: 'index.html' }
    }
  };
  const packageJson = createClientWorkspacePackage({
    manifest,
    files: { 'workspace/index.html': '<h1>Trusted delivery</h1>' },
    privateKey: untrusted.privateKey
  });
  assert.throws(
    () => verifyClientWorkspacePackage(packageJson, trusted.publicKey),
    (error) => error instanceof ClientWorkspacePackageError && error.code === 'invalid_signature'
  );
  assert.throws(
    () =>
      createClientWorkspacePackage({
        manifest,
        files: { '../outside.txt': 'escape' },
        privateKey: trusted.privateKey
      }),
    (error) => error instanceof ClientWorkspacePackageError && error.code === 'invalid_path'
  );
  assert.throws(
    () =>
      createClientWorkspacePackage({
        manifest,
        files: Object.fromEntries(
          Array.from({ length: 501 }, (_, index) => [`workspace/${index}.txt`, 'x'])
        ),
        privateKey: trusted.privateKey
      }),
    (error) =>
      error instanceof ClientWorkspacePackageError && error.code === 'package_limit_exceeded'
  );
});
