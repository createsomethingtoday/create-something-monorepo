import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  createCustomCodeSurfaceHash,
  CUSTOM_CODE_POLICY_VERSION
} from '../../../../packages/webflow-template-validation/policy/custom-code-policy.js';
import { runValidatorAppSubmissionPreflight } from './validator-app';

const PUBLISHED_URL = 'https://current-template.webflow.io/';
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

function bridgeHtml(extraHead = '') {
  return `<!doctype html><html><head>
    <script>window.__WF_REVIEW_BRIDGE = {
      siteId: "site_current_template",
      version: "0.3.0",
      marker: "__wf_review_snippet_v1",
      bridgeToken: "wfbt_0123456789abcdef0123456789abcdef",
      reviewSurface: "published-review",
      reviewScriptUrl: "https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"
    };</script>
    <script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script>
    ${extraHead}
  </head><body></body></html>`;
}

function passingLatest(overrides: Record<string, unknown> = {}) {
  return {
    status: 'available',
    passed: true,
    submittedAt: new Date().toISOString(),
    siteUrl: PUBLISHED_URL,
    customCodePolicyVersion: CUSTOM_CODE_POLICY_VERSION,
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      passedCategories: 5,
      failedCategories: 0,
      totalCategories: 5,
      score: 100,
      passed: true
    },
    ...overrides
  };
}

function mockPublishedAndLatest(html: string, latest: Record<string, unknown>) {
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes('/app-validator/submission/latest')) {
      return new Response(JSON.stringify(latest), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
  };
  return () => calls;
}

test('rejects prohibited current HTML before trusting a persisted Validator pass', async () => {
  const html = bridgeHtml(
    '<script async type="module" src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js" fs-list></script>'
  );
  const calls = mockPublishedAndLatest(html, passingLatest());

  const result = await runValidatorAppSubmissionPreflight(PUBLISHED_URL, 'enforce');

  assert.equal(result.passed, false);
  assert.equal(result.status, 'result_failed');
  assert.match(result.issues.join(' '), /@finsweet\/attributes@2\/attributes\.js/);
  assert.equal(
    calls(),
    1,
    'the current prohibited surface should fail before latest-result lookup'
  );
});

test('accepts only a fresh result bound to the current URL, policy, and custom-code surface', async () => {
  const html = bridgeHtml();
  const customCodeSurfaceHash = await createCustomCodeSurfaceHash(html, PUBLISHED_URL);
  mockPublishedAndLatest(html, passingLatest({ customCodeSurfaceHash }));

  const result = await runValidatorAppSubmissionPreflight(PUBLISHED_URL, 'enforce');

  assert.equal(result.passed, true);
  assert.equal(result.status, 'passed');
  assert.equal(result.result?.customCodeSurfaceHash, customCodeSurfaceHash);
});

test('rejects a stale 100% Validator result', async () => {
  const html = bridgeHtml();
  const customCodeSurfaceHash = await createCustomCodeSurfaceHash(html, PUBLISHED_URL);
  mockPublishedAndLatest(
    html,
    passingLatest({
      customCodeSurfaceHash,
      submittedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString()
    })
  );

  const result = await runValidatorAppSubmissionPreflight(PUBLISHED_URL, 'enforce');

  assert.equal(result.passed, false);
  assert.equal(result.status, 'result_stale');
});

test('rejects a clean republish whose custom-code surface differs from the latest result', async () => {
  const html = bridgeHtml(
    '<script>WebFont.load({ google: { families: ["Inter:400"] } });</script>'
  );
  mockPublishedAndLatest(
    html,
    passingLatest({
      customCodeSurfaceHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    })
  );

  const result = await runValidatorAppSubmissionPreflight(PUBLISHED_URL, 'enforce');

  assert.equal(result.passed, false);
  assert.equal(result.status, 'result_content_mismatch');
});

test('rejects results created without the current versioned custom-code policy', async () => {
  const html = bridgeHtml();
  const customCodeSurfaceHash = await createCustomCodeSurfaceHash(html, PUBLISHED_URL);
  mockPublishedAndLatest(
    html,
    passingLatest({ customCodeSurfaceHash, customCodePolicyVersion: 'marketplace-custom-code.v0' })
  );

  const result = await runValidatorAppSubmissionPreflight(PUBLISHED_URL, 'enforce');

  assert.equal(result.passed, false);
  assert.equal(result.status, 'result_policy_outdated');
});
