import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findDirectPackageImports,
  validateSecurityAdvisoryPolicy
} from '../security-advisory-exceptions.mjs';

function validPolicy() {
  return {
    schemaVersion: 1,
    policy:
      'Exceptions keep scanner findings visible and expire unless a named owner renews the evidence.',
    exceptions: [
      {
        advisoryId: 'GHSA-jmr9-qjv8-65gv',
        alertNumber: 1586,
        package: 'extract-zip',
        severity: 'high',
        affectedRange: '<= 2.0.1',
        firstPatchedVersion: null,
        owner: 'createsomethingtoday',
        trackingIssue: 'CRE-1634',
        acceptedOn: '2026-08-21',
        reviewBy: '2026-09-21',
        state: 'open-upstream-unpatched',
        suppressesScanner: false,
        runtimeExposure: 'tooling-only',
        exploitPreconditions: ['An attacker-controlled ZIP reaches the affected extraction function.'],
        compensatingControls: [
          'Application source does not import the vulnerable package.',
          'Browser binaries come only from pinned upstream tooling or Cloudflare Browser Rendering.'
        ],
        evidence: ['pnpm why extract-zip -r'],
        removalTrigger: 'Upgrade immediately when an upstream fixed release is available.'
      }
    ]
  };
}

test('accepts a visible, owned, time-bounded exception', () => {
  assert.deepEqual(validateSecurityAdvisoryPolicy(validPolicy(), new Date('2026-08-22T00:00:00Z')), []);
});

test('rejects suppression, expiry, weak controls, and duplicate advisories', () => {
  const policy = validPolicy();
  const duplicate = structuredClone(policy.exceptions[0]);
  policy.exceptions[0].suppressesScanner = true;
  policy.exceptions[0].reviewBy = '2026-08-20';
  policy.exceptions[0].compensatingControls = ['Only one control'];
  policy.exceptions.push(duplicate);

  const findings = validateSecurityAdvisoryPolicy(policy, new Date('2026-08-22T00:00:00Z'));
  assert.ok(findings.some((finding) => finding.includes('must remain false')));
  assert.ok(findings.some((finding) => finding.includes('expired')));
  assert.ok(findings.some((finding) => finding.includes('at least two compensating controls')));
  assert.ok(findings.some((finding) => finding.includes('duplicate advisory')));
});

test('finds direct imports but ignores lockfile and prose mentions', () => {
  const files = new Map([
    ['src/browser.ts', "import extract from 'extract-zip';\n"],
    ['pnpm-lock.yaml', 'extract-zip: 2.0.1\n'],
    ['README.md', 'extract-zip is tracked upstream.\n']
  ]);

  assert.deepEqual(findDirectPackageImports(files, 'extract-zip'), ['src/browser.ts']);
});
