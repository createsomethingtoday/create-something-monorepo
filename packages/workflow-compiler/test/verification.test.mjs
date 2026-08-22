import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  truncate,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  createWorkflowArtifactAttestation,
  parseWorkflowArtifactAttestation,
  verifyWorkflowArtifactBundle,
  WorkflowArtifactAttestationError,
  WorkflowArtifactVerificationError
} from '../dist/index.js';

const packageRoot = new URL('..', import.meta.url);
const fixturePath = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('the public verifier returns a deterministic integrity receipt and rejects tampering', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-verification-'));
  const outDir = join(root, 'output');

  try {
    const compile = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);

    const first = await verifyWorkflowArtifactBundle(outDir);
    const second = await verifyWorkflowArtifactBundle(outDir);
    assert.deepEqual(second, first);
    assert.deepEqual(first, {
      schemaVersion: 'workflow_artifact_verification_receipt.v0.1',
      status: 'integrity_verified',
      workflowId: 'webflow.marketplace.template-lifecycle',
      workflowVersion: '0.1.0',
      definitionHash: JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'))
        .definitionHash,
      compilerVersion: 'workflow-compiler-v0.1',
      manifestHash: first.manifestHash,
      fileCount: 11,
      attestation: { status: 'unsigned' }
    });
    assert.match(first.manifestHash, /^sha256:[a-f0-9]{64}$/);

    const artifactPath = join(outDir, 'workflow-map.json');
    await writeFile(artifactPath, `${await readFile(artifactPath, 'utf8')} `, 'utf8');
    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir),
      (error) =>
        error instanceof WorkflowArtifactVerificationError &&
        error.code === 'ARTIFACT_HASH_MISMATCH' &&
        error.path === 'workflow-map.json'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the attestation parser fails closed across malformed property families', () => {
  const validShape = {
    schemaVersion: 'workflow_artifact_attestation.v0.1',
    algorithm: 'Ed25519',
    keyId: 'local-test-key',
    publicKeyFingerprint: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    manifestHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    signature: `${'A'.repeat(86)}==`
  };
  const malformed = [
    null,
    [],
    {},
    { ...validShape, schemaVersion: 'workflow_artifact_attestation.v9' },
    { ...validShape, algorithm: 'RSA' },
    { ...validShape, keyId: '' },
    { ...validShape, keyId: '../key' },
    { ...validShape, publicKeyFingerprint: 'sha256:short' },
    { ...validShape, manifestHash: 'sha256:short' },
    { ...validShape, signature: 'not-base64' },
    { ...validShape, extra: true },
    ...Array.from({ length: 64 }, (_, index) => ({
      ...validShape,
      signature: `${'A'.repeat(index)}==`
    }))
  ];
  for (const value of malformed) {
    assert.throws(
      () => parseWorkflowArtifactAttestation(value),
      (error) =>
        error instanceof WorkflowArtifactAttestationError && error.code === 'INVALID_ATTESTATION'
    );
  }
});

test('the public signing API rejects non-string key identifiers without coercion', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const manifest = {
    schemaVersion: 'workflow_artifact_manifest.v0.1',
    workflowId: 'test.workflow',
    workflowVersion: '0.1.0',
    definitionHash: `sha256:${'0'.repeat(64)}`,
    compilerVersion: 'workflow-compiler-v0.1',
    files: []
  };
  for (const keyId of [undefined, null, 42, true]) {
    assert.throws(
      () => createWorkflowArtifactAttestation(manifest, { privateKey, keyId }),
      (error) =>
        error instanceof WorkflowArtifactAttestationError && error.code === 'INVALID_KEY_ID'
    );
  }
});

test('verification stays within the declared local CI performance and dependency bounds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-verification-performance-'));
  const outDir = join(root, 'output');
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );

  try {
    assert.deepEqual(packageJson.dependencies ?? {}, {});
    const compile = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);

    const startedAt = performance.now();
    const receipts = [];
    for (let index = 0; index < 100; index += 1) {
      receipts.push(await verifyWorkflowArtifactBundle(outDir));
    }
    const elapsedMilliseconds = performance.now() - startedAt;
    assert.ok(elapsedMilliseconds < 5000, `100 verifications took ${elapsedMilliseconds}ms`);
    assert.ok(receipts.every((receipt) => receipt.manifestHash === receipts[0].manifestHash));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the CLI creates and independently verifies a deterministic Ed25519 attestation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-attestation-'));
  const firstOut = join(root, 'first');
  const secondOut = join(root, 'second');
  const privateKeyPath = join(root, 'private.pem');
  const publicKeyPath = join(root, 'public.pem');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  try {
    await writeFile(privateKeyPath, privateKeyPem, { mode: 0o600 });
    await writeFile(publicKeyPath, publicKeyPem, 'utf8');
    for (const outDir of [firstOut, secondOut]) {
      const compile = spawnSync(
        process.execPath,
        [
          'dist/cli.js',
          'compile',
          '--workflow',
          fixturePath.pathname,
          '--out',
          outDir,
          '--signing-key',
          privateKeyPath,
          '--key-id',
          'local-test-key'
        ],
        { cwd: packageRoot, encoding: 'utf8' }
      );
      assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    }

    assert.equal(
      await readFile(join(firstOut, 'attestation.json'), 'utf8'),
      await readFile(join(secondOut, 'attestation.json'), 'utf8')
    );
    assert.equal(
      (await readdir(firstOut)).some((name) => /private|\.pem$/i.test(name)),
      false
    );

    const untrustedReceipt = await verifyWorkflowArtifactBundle(firstOut);
    assert.equal(untrustedReceipt.status, 'integrity_verified');
    assert.equal(untrustedReceipt.attestation.status, 'present_unverified');
    const trustedReceipt = await verifyWorkflowArtifactBundle(firstOut, {
      publicKey: publicKeyPem
    });
    assert.equal(trustedReceipt.status, 'verified');
    assert.deepEqual(trustedReceipt.attestation, {
      status: 'verified',
      algorithm: 'Ed25519',
      keyId: 'local-test-key',
      publicKeyFingerprint: trustedReceipt.attestation.publicKeyFingerprint
    });
    assert.match(trustedReceipt.attestation.publicKeyFingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(
      await verifyWorkflowArtifactBundle(secondOut, { publicKey: publicKeyPem }),
      trustedReceipt
    );

    const verify = spawnSync(
      process.execPath,
      ['dist/cli.js', 'verify', '--dir', firstOut, '--public-key', publicKeyPath],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(verify.status, 0, verify.stderr || verify.stdout);
    assert.deepEqual(JSON.parse(verify.stdout), { ok: true, receipt: trustedReceipt });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('attestation verification fails closed for an untrusted signer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-untrusted-attestation-'));
  const outDir = join(root, 'output');
  const signer = generateKeyPairSync('ed25519');
  const other = generateKeyPairSync('ed25519');
  const privateKeyPath = join(root, 'private.pem');

  try {
    await writeFile(
      privateKeyPath,
      signer.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      { mode: 0o600 }
    );
    const compile = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'compile',
        '--workflow',
        fixturePath.pathname,
        '--out',
        outDir,
        '--signing-key',
        privateKeyPath,
        '--key-id',
        'local-test-key'
      ],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);

    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir, {
        publicKey: other.publicKey.export({ type: 'spki', format: 'pem' }).toString()
      }),
      (error) =>
        error instanceof WorkflowArtifactAttestationError &&
        error.code === 'KEY_FINGERPRINT_MISMATCH'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('bundle verification rejects undeclared files and internal symbolic links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-bundle-inventory-'));
  const outDir = join(root, 'output');

  try {
    const compile = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    await writeFile(join(outDir, 'undeclared.json'), '{}\n', 'utf8');
    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir),
      (error) =>
        error instanceof WorkflowArtifactVerificationError &&
        error.code === 'UNDECLARED_ARTIFACT' &&
        error.path === 'undeclared.json'
    );
    await rm(join(outDir, 'undeclared.json'));

    await symlink('workflow-map.json', join(outDir, 'unexpected-link.json'));
    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir),
      (error) =>
        error instanceof WorkflowArtifactVerificationError &&
        error.code === 'INVALID_ARTIFACT_TYPE' &&
        error.path === 'unexpected-link.json'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('manifest verification rejects adversarial paths and bounded-resource overflow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-adversarial-manifest-'));
  const outDir = join(root, 'output');

  try {
    const compile = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    const manifestPath = join(outDir, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const originalPath = manifest.files[0].path;
    for (const adversarialPath of [
      '../escape.json',
      '/absolute.json',
      'C:\\absolute.json',
      'nested\\windows.json',
      './relative.json',
      'nested//empty.json',
      'nested/../escape.json',
      `nul\0byte.json`
    ]) {
      manifest.files[0].path = adversarialPath;
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      await assert.rejects(
        verifyWorkflowArtifactBundle(outDir),
        (error) =>
          error instanceof WorkflowArtifactVerificationError &&
          error.code === 'UNSAFE_ARTIFACT_PATH',
        adversarialPath
      );
    }

    manifest.files[0].path = originalPath;
    manifest.files = Array.from({ length: 513 }, (_, index) => ({
      path: `overflow/${String(index).padStart(3, '0')}.json`,
      hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
    }));
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir),
      (error) =>
        error instanceof WorkflowArtifactVerificationError &&
        error.code === 'RESOURCE_LIMIT_EXCEEDED'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('oversized artifacts stop on metadata before content allocation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-oversized-artifact-'));
  const outDir = join(root, 'output');

  try {
    const compile = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    const artifactPath = join(outDir, 'workflow-map.json');
    await truncate(artifactPath, 25 * 1024 * 1024 + 1);
    await chmod(artifactPath, 0o000);

    await assert.rejects(
      verifyWorkflowArtifactBundle(outDir),
      (error) =>
        error instanceof WorkflowArtifactVerificationError &&
        error.code === 'RESOURCE_LIMIT_EXCEEDED' &&
        error.path === 'workflow-map.json'
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the CLI distinguishes unsigned bundles and invalid signatures as verification stops', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-verification-stops-'));
  const unsignedOut = join(root, 'unsigned');
  const signedOut = join(root, 'signed');
  const signer = generateKeyPairSync('ed25519');
  const privateKeyPath = join(root, 'private.pem');
  const publicKeyPath = join(root, 'public.pem');
  await writeFile(
    privateKeyPath,
    signer.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    { mode: 0o600 }
  );
  await writeFile(
    publicKeyPath,
    signer.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    'utf8'
  );

  try {
    const unsigned = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', unsignedOut],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(unsigned.status, 0, unsigned.stderr || unsigned.stdout);
    const requireSignature = spawnSync(
      process.execPath,
      ['dist/cli.js', 'verify', '--dir', unsignedOut, '--public-key', publicKeyPath],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(requireSignature.status, 3, requireSignature.stderr || requireSignature.stdout);
    assert.equal(JSON.parse(requireSignature.stderr).code, 'ATTESTATION_MISSING');

    const signed = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'compile',
        '--workflow',
        fixturePath.pathname,
        '--out',
        signedOut,
        '--signing-key',
        privateKeyPath,
        '--key-id',
        'local-test-key'
      ],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(signed.status, 0, signed.stderr || signed.stdout);
    const attestationPath = join(signedOut, 'attestation.json');
    const attestation = JSON.parse(await readFile(attestationPath, 'utf8'));
    const originalKeyId = attestation.keyId;
    attestation.keyId = 'spoofed-key-id';
    await writeFile(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
    const spoofedIdentity = spawnSync(
      process.execPath,
      ['dist/cli.js', 'verify', '--dir', signedOut, '--public-key', publicKeyPath],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(spoofedIdentity.status, 3, spoofedIdentity.stderr || spoofedIdentity.stdout);
    assert.equal(JSON.parse(spoofedIdentity.stderr).code, 'SIGNATURE_INVALID');

    attestation.keyId = originalKeyId;
    attestation.signature = `${attestation.signature[0] === 'A' ? 'B' : 'A'}${attestation.signature.slice(1)}`;
    await writeFile(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
    const invalidSignature = spawnSync(
      process.execPath,
      ['dist/cli.js', 'verify', '--dir', signedOut, '--public-key', publicKeyPath],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(invalidSignature.status, 3, invalidSignature.stderr || invalidSignature.stdout);
    assert.equal(JSON.parse(invalidSignature.stderr).code, 'SIGNATURE_INVALID');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
