import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const valueAfter = (argv, flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

export async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

export async function reconcileSubmissionArtifacts({
  apiBase,
  submissionId,
  receiptId,
  bundlePath,
  sourceMapsPath,
  token,
  fetchImpl = fetch
}) {
  if (!token) throw new Error('SUBMISSION_RECONCILIATION_TOKEN is required.');
  if (!submissionId) throw new Error('--submission-id is required.');
  if (!bundlePath) throw new Error('--bundle is required.');

  const endpoint = new URL('/v1/submission-artifacts/reconcile', apiBase);
  if (endpoint.protocol !== 'https:' && endpoint.hostname !== 'localhost') {
    throw new Error('--api-base must use HTTPS outside localhost.');
  }

  const requestBody = {
    submissionId,
    ...(receiptId ? { receiptId } : {}),
    bundleSha256: await sha256File(bundlePath),
    sourceMapArtifactSha256: sourceMapsPath ? await sha256File(sourceMapsPath) : null
  };
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof responseBody.error === 'string' ? responseBody.error : 'request_failed';
    throw new Error(`Submission reconciliation failed (${response.status} ${code}).`);
  }

  return {
    schema: 'preflight_primary_verifier_reconciliation.v1',
    checkedAt: new Date().toISOString(),
    apiOrigin: endpoint.origin,
    request: requestBody,
    reconciliation: responseBody.reconciliation
  };
}

async function main(argv = process.argv.slice(2)) {
  const result = await reconcileSubmissionArtifacts({
    apiBase: valueAfter(argv, '--api-base'),
    submissionId: valueAfter(argv, '--submission-id'),
    receiptId: valueAfter(argv, '--receipt-id'),
    bundlePath: valueAfter(argv, '--bundle'),
    sourceMapsPath: valueAfter(argv, '--source-maps'),
    token: process.env.SUBMISSION_RECONCILIATION_TOKEN
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) await main();

