import type { RuntimeObservationJobContract } from '@create-something/webflow-app-review-preflight';
import { describe, expect, test } from 'vitest';
import {
  redactText,
  sanitizeUrl,
  validateObservationContract
} from '../src/index.js';

function contract(): RuntimeObservationJobContract {
  return {
    schemaVersion: 'runtime_observation_job.v1',
    purpose: 'webflow_observation',
    testPackageId: 'package-1',
    reviewId: 'review-1',
    reviewVersionId: 'version-1',
    bundleSha256: 'b'.repeat(64),
    nonce: 'nonce-1',
    target: { url: 'http://127.0.0.1:4173/runtime-fixture', host: '127.0.0.1' },
    sandboxInstallationId: 'sandbox-1',
    runtimeArtifacts: [
      {
        url: 'http://127.0.0.1:4173/runtime-v1.js',
        sha256: 'a'.repeat(64),
        integrity: 'sha256-fixture'
      }
    ],
    negativeProxyProbe: {
      method: 'GET',
      url: 'http://127.0.0.1:4173/proxy?url=http%3A%2F%2F127.0.0.1%3A4174%2Fcanary'
    },
    lifecycle: {
      readySelector: '[data-runtime-ready]',
      cleanupTrigger: { type: 'click', selector: '[data-runtime-uninstall]' }
    },
    controls: {
      allowedHosts: ['127.0.0.1'],
      maxRequests: 100,
      requestTimeoutMs: 10_000,
      totalTimeoutMs: 90_000,
      networkMode: 'exact_host_allowlist',
      evidenceTrust: 'webflow_observed',
      negativeProxyCanaryUrl: 'http://127.0.0.1:4174/canary'
    },
    boundaries: {
      partnerCanSubmitEvidence: false,
      officialDecision: null,
      canWriteGovernance: false,
      acceptsAccountCredentials: false
    },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  };
}

describe('runtime observation runner boundaries', () => {
  test('redacts secrets and query values from evidence text', () => {
    expect(redactText('Bearer abcdefghijkl user@example.com')).toBe(
      '[redacted-secret] [redacted-email]'
    );
    expect(sanitizeUrl('https://example.com/path?token=secret&email=user@example.com')).toBe(
      'https://example.com/path?token=%5Bredacted%5D&email=%5Bredacted%5D'
    );
  });

  test('rejects a contract that broadens the server host allowlist', () => {
    const safe = contract();
    expect(() => validateObservationContract('job-1', safe)).not.toThrow();
    expect(() =>
      validateObservationContract('job-1', {
        ...safe,
        target: { url: 'https://attacker.example', host: 'attacker.example' }
      })
    ).toThrow('attempts to broaden its host boundary');
  });
});
