import assert from 'node:assert/strict';
import test from 'node:test';

import type { ValidatorAppPreflight } from '../intake/validator-app';
import {
  revalidateCachedPublishedValidation,
  type CachedPublishedValidation
} from './published-validation-cache';

const cachedEntry: CachedPublishedValidation = {
  normalizedUrl: 'https://changed-template.webflow.io/',
  summary: {
    passed: true,
    gsapDetected: false,
    legacyIx2Detected: false,
    unicornStudioDetected: false,
    siteResults: {
      pageCount: 1,
      analyzedCount: 1,
      passedCount: 1,
      failedCount: 0,
      requestFailureCount: 0,
      validationFailureCount: 0,
      incomplete: false
    }
  },
  validatorPreflight: null,
  cachedAt: new Date().toISOString()
};

test('a cached crawl is not accepted when the lightweight current-publish recheck fails', async () => {
  let inspectedUrl: string | undefined;
  const changedSurfaceFailure: ValidatorAppPreflight = {
    required: true,
    policy: 'enforce',
    passed: false,
    status: 'result_content_mismatch',
    message: 'The published custom-code surface changed after the latest Validator run.',
    issues: ['Rerun validation after the latest publish.'],
    installUrl: 'https://webflow.com',
    bridge: {
      configObjectPresent: true,
      markerPresent: true,
      allowedScriptPresent: true,
      siteIdPresent: true,
      bridgeTokenPresent: true,
      rawBridgeTokenStored: false
    }
  };

  const result = await revalidateCachedPublishedValidation(cachedEntry, async (url) => {
    inspectedUrl = url;
    return changedSurfaceFailure;
  });

  assert.equal(inspectedUrl, cachedEntry.normalizedUrl);
  assert.equal(result.accepted, false);
  assert.equal(result.validatorPreflight.status, 'result_content_mismatch');
});

test('a cached crawl keeps the fast path only after a current-publish recheck passes', async () => {
  const currentPass: ValidatorAppPreflight = {
    required: true,
    policy: 'enforce',
    passed: true,
    status: 'passed',
    message: 'Current publish confirmed.',
    issues: [],
    installUrl: 'https://webflow.com',
    bridge: {
      configObjectPresent: true,
      markerPresent: true,
      allowedScriptPresent: true,
      siteIdPresent: true,
      bridgeTokenPresent: true,
      rawBridgeTokenStored: false
    }
  };

  const result = await revalidateCachedPublishedValidation(cachedEntry, async () => currentPass);

  assert.equal(result.accepted, true);
});
