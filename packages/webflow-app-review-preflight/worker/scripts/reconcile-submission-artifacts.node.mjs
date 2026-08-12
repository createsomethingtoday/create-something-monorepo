import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  reconcileSubmissionArtifacts,
  sha256File
} from './reconcile-submission-artifacts.mjs';

test('hashes exact artifact containers and submits only their identities', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preflight-reconcile-'));
  const bundlePath = path.join(directory, 'bundle.zip');
  const sourceMapsPath = path.join(directory, 'source-maps.zip');
  await writeFile(bundlePath, 'exact-bundle-container');
  await writeFile(sourceMapsPath, 'exact-source-map-container');
  let captured;
  const request = async (url, init) => {
    captured = { url, init };
    return Response.json({
      reconciliation: {
        status: 'matched',
        receiptValid: true,
        enforcement: 'verified',
        mismatches: []
      }
    });
  };

  const result = await reconcileSubmissionArtifacts({
    apiBase: 'https://preflight.example.test',
    submissionId: 'canonical-form-123',
    receiptId: 'receipt-123',
    bundlePath,
    sourceMapsPath,
    token: 'server-only-token',
    fetchImpl: request
  });

  assert.equal(
    String(captured.url),
    'https://preflight.example.test/v1/submission-artifacts/reconcile'
  );
  assert.deepEqual(captured.init.headers, {
    authorization: 'Bearer server-only-token',
    'content-type': 'application/json'
  });
  assert.deepEqual(JSON.parse(String(captured.init.body)), {
    submissionId: 'canonical-form-123',
    receiptId: 'receipt-123',
    bundleSha256: await sha256File(bundlePath),
    sourceMapArtifactSha256: await sha256File(sourceMapsPath)
  });
  assert.equal(JSON.stringify(result).includes('server-only-token'), false);
  assert.deepEqual(result.reconciliation, {
    status: 'matched',
    receiptValid: true,
    enforcement: 'verified',
    mismatches: []
  });
});
