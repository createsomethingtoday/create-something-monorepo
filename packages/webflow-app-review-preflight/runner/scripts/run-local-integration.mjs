import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runRuntimeObservation } from '../dist/index.js';
import { runtimeSource } from '../fixtures/runtime-definition.mjs';

const apiBaseUrl = process.env.PREFLIGHT_API_BASE ?? 'http://127.0.0.1:8787';
const bundlePath = process.env.PREFLIGHT_BUNDLE_PATH;
const outputDir = process.env.RUNTIME_EVIDENCE_OUTPUT;
const expectedSecurityStatus = process.env.RUNTIME_EXPECT_SECURITY_STATUS ?? 'passed';
if (!bundlePath || !outputDir) {
  throw new Error('PREFLIGHT_BUNDLE_PATH and RUNTIME_EVIDENCE_OUTPUT are required.');
}

const runtimeSha256 = createHash('sha256').update(runtimeSource).digest('hex');
const integrity = `sha256-${createHash('sha256').update(runtimeSource).digest('base64')}`;
const ownerHeaders = { authorization: 'Bearer test-token' };
const bundle = await readFile(bundlePath);
const reviewForm = new FormData();
reviewForm.set('name', 'Owned runtime behavior fixture');
reviewForm.set('bundle', new Blob([bundle], { type: 'application/zip' }), 'runtime-fixture.zip');
const reviewResponse = await fetch(new URL('/v1/reviews', apiBaseUrl), {
  method: 'POST',
  headers: ownerHeaders,
  body: reviewForm
});
if (!reviewResponse.ok) throw new Error(`Review create failed: ${await reviewResponse.text()}`);
const { review } = await reviewResponse.json();

const packageResponse = await fetch(
  new URL(`/v1/reviews/${review.id}/runtime-test-packages`, apiBaseUrl),
  {
    method: 'POST',
    headers: { ...ownerHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      targetUrl: 'http://127.0.0.1:4173/runtime-fixture',
      sandboxInstallationId: 'local-webflow-site',
      sandboxOwnershipConfirmed: true,
      license: {
        mode: 'installation_allowlist',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      runtimeArtifacts: [
        {
          url: 'http://127.0.0.1:4173/runtime-v1.js',
          sha256: runtimeSha256,
          integrity
        }
      ],
      negativeProxyProbe: {
        method: 'GET',
        urlTemplate: 'http://127.0.0.1:4173/proxy?url={canaryUrl}'
      },
      lifecycle: {
        readySelector: '[data-runtime-ready]'
      }
    })
  }
);
if (!packageResponse.ok) throw new Error(`Test package failed: ${await packageResponse.text()}`);
const { testPackage } = await packageResponse.json();

const approvalResponse = await fetch(
  new URL(`/v1/runtime-test-packages/${testPackage.id}/observation-jobs`, apiBaseUrl),
  {
    method: 'POST',
    headers: {
      authorization: 'Bearer coordinator-test-token',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ approved: true, sandboxOwnershipVerified: true })
  }
);
if (!approvalResponse.ok)
  throw new Error(`Observation approval failed: ${await approvalResponse.text()}`);
const { observationJob } = await approvalResponse.json();

const result = await runRuntimeObservation({
  apiBaseUrl,
  observationJobId: observationJob.id,
  capability: observationJob.capability,
  outputDir
});

const listResponse = await fetch(
  new URL(`/v1/reviews/${review.id}/runtime-test-packages`, apiBaseUrl),
  { headers: ownerHeaders }
);
if (!listResponse.ok) throw new Error(`Evidence readback failed: ${await listResponse.text()}`);
const { testPackages } = await listResponse.json();
const canaryState = await fetch('http://127.0.0.1:4174/state').then((response) => response.json());
const securityStatus = testPackages[0]?.observation?.evidence?.securityStatus;
if (securityStatus !== expectedSecurityStatus) {
  throw new Error(
    `Expected runtime security ${expectedSecurityStatus}, received ${securityStatus ?? 'no result'}.`
  );
}

const receipt = {
  reviewId: review.id,
  reviewVersionId: review.latestVersion.id,
  bundleSha256: review.latestVersion.result.artifact.sha256,
  testPackageId: testPackage.id,
  observationJobId: observationJob.id,
  result,
  expectedSecurityStatus,
  readback: testPackages[0],
  canaryState
};
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
