import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  selectMapBurnIn,
  validateBrowserEvidence,
  validateCodeowners,
  validateGaConfig,
  validatePackageReadback,
  validatePricingReadbacks,
  validateRepositoryReadback
} from '../public-ga-policy.mjs';

const config = JSON.parse(
  await readFile(new URL('../../config/public-ga.v1.json', import.meta.url), 'utf8')
);
const gaCommit = 'a'.repeat(40);

function repositoryReadback() {
  return {
    repository: { visibility: 'public', default_branch: 'main' },
    main: { commit: { sha: gaCommit } },
    ruleset: {
      id: config.repository.rulesetId,
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'] } },
      rules: [
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: config.repository.minimumApprovingReviews,
            require_code_owner_review: config.repository.requireCodeOwnerReview,
            required_review_thread_resolution: config.repository.requireReviewThreadResolution,
            require_last_push_approval: config.repository.requireLastPushApproval
          }
        },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: config.repository.requiredChecks.map((context) => ({ context }))
          }
        }
      ]
    },
    collaborators: [{ login: config.repository.soleOperator, permissions: { admin: true } }],
    secretAlerts: [],
    dependabotAlerts: [],
    workflowPermissions: {
      default_workflow_permissions: 'read',
      can_approve_pull_request_reviews: false
    }
  };
}

function provenancePayload(packagePolicy, commit = gaCommit) {
  return Buffer.from(
    JSON.stringify({
      _type: 'https://in-toto.io/Statement/v1',
      subject: [
        { name: `pkg:npm/${packagePolicy.name.replace(/^@/, '%40')}@${packagePolicy.version}` }
      ],
      predicateType: 'https://slsa.dev/provenance/v1',
      predicate: {
        buildDefinition: {
          externalParameters: {
            workflow: {
              ref: 'refs/heads/main',
              repository: `https://github.com/${config.npm.repository}`,
              path: `.github/workflows/${config.npm.workflowFile}`
            }
          },
          resolvedDependencies: [{ digest: { gitCommit: commit } }]
        },
        runDetails: { builder: { id: 'https://github.com/actions/runner/github-hosted' } }
      }
    })
  ).toString('base64');
}

test('GA config keeps the public boundary, governed sole-operator gate, two packages, and seven days explicit', () => {
  assert.deepEqual(validateGaConfig(config), []);
  assert.deepEqual(config.repository.requiredChecks, [
    'Require immutable action references',
    'Public Distribution GA'
  ]);
  assert.equal(config.repository.governanceMode, 'sole-operator');
  assert.equal(config.repository.soleOperator, 'createsomethingtoday');
  assert.equal(config.repository.minimumApprovingReviews, 0);
  assert.equal(config.repository.requireCodeOwnerReview, false);
  assert.equal(config.repository.requireReviewThreadResolution, true);
  assert.equal(config.repository.requireLastPushApproval, false);
  assert.equal(config.repository.minimumMaintainers, 1);
  assert.equal(config.repository.minimumCodeOwners, 1);
  assert.equal(config.packages.length, 2);
  assert.equal(config.npm.trustedPublisherMode, 'stage-only');
  assert.equal(config.map.requiredConsecutiveDays, 7);
  assert.equal(config.map.receiptSource.alertTable, 'map_production_monitor_alerts');
});

test('required repository policy checks run on every pull request', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/github-actions-policy.yml', import.meta.url),
    'utf8'
  );

  assert.match(workflow, /on:\n  pull_request:\n  push:/);
});

test('GA package policy versions stay synchronized with public package manifests', async () => {
  for (const packagePolicy of config.packages) {
    const manifest = JSON.parse(
      await readFile(new URL(`../../${packagePolicy.path}/package.json`, import.meta.url), 'utf8')
    );
    assert.equal(manifest.name, packagePolicy.name);
    assert.equal(manifest.version, packagePolicy.version);
  }
});

test('Pi trusted publishing stages releases for explicit 2FA approval', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/pi-public-release.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /npm stage publish --access public/);
  assert.doesNotMatch(workflow, /run: npm publish --access public/);
});

test('the legacy GitHub Map synthetic remains a manual diagnostic, not the scheduled receipt lane', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/agency-map-production-monitor.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /manual diagnostic/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  schedule:/);
});

test('Pi discovery proofs explicitly approve only their isolated temporary project', async () => {
  const [workflow, verifier] = await Promise.all([
    readFile(new URL('../../.github/workflows/pi-public-release.yml', import.meta.url), 'utf8'),
    readFile(new URL('../public-ga-verify.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(workflow, /pi" install .* -l --approve/);
  assert.match(workflow, /pi" list --approve/);
  assert.match(verifier, /\['install', packageDirectory, '-l', '--approve'\]/);
  assert.match(verifier, /command\(pi, \['list', '--approve'\]/);
});

test('sole-operator CODEOWNERS requires the named write-capable operator', () => {
  assert.deepEqual(validateCodeowners('* @one\n', ['one'], 1), {
    issues: [],
    owners: ['one']
  });
  assert.match(
    validateCodeowners('* @unknown\n', ['one'], 1).issues[0],
    /1 write-capable individual owner/
  );
});

test('sole-operator repository readback fails closed on missing thread resolution, named operator, secret, and runtime ownership', () => {
  const passing = repositoryReadback();
  assert.deepEqual(validateRepositoryReadback(passing, config, gaCommit).issues, []);

  const failing = repositoryReadback();
  failing.ruleset.rules[0].parameters.required_review_thread_resolution = false;
  failing.collaborators[0].login = 'unapproved-operator';
  failing.secretAlerts.push({ number: 9 });
  failing.dependabotAlerts.push({
    number: 10,
    state: 'open',
    dependency: { scope: 'runtime' },
    security_advisory: { severity: 'critical', ghsa_id: 'GHSA-unowned' }
  });
  const issues = validateRepositoryReadback(failing, config, gaCommit).issues.join('\n');
  assert.match(issues, /review-thread resolution/);
  assert.match(issues, /sole operator/);
  assert.match(issues, /secret-scanning/);
  assert.match(issues, /GHSA-unowned/);
});

test('sole-operator repository readback rejects reintroduced unavailable peer-review settings', () => {
  const failing = repositoryReadback();
  Object.assign(failing.ruleset.rules[0].parameters, {
    required_approving_review_count: 1,
    require_code_owner_review: true,
    require_last_push_approval: true
  });
  const issues = validateRepositoryReadback(failing, config, gaCommit).issues.join('\n');
  assert.match(issues, /sole-operator.*approving reviews/i);
  assert.match(issues, /sole-operator.*code-owner review/i);
  assert.match(issues, /sole-operator.*last-push approval/i);
});

test('npm readback requires exact metadata, trusted publisher, provenance commit, files, and Pi load', () => {
  const packagePolicy = config.packages[0];
  const packedFiles = [
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'package.json',
    'prompts/three-tier-debug.md',
    'prompts/three-tier-design.md',
    'skills/three-tier/SKILL.md',
    'skills/three-tier/references/debugging.md',
    'skills/three-tier/references/design.md'
  ];
  const version = {
    name: packagePolicy.name,
    version: packagePolicy.version,
    license: 'MIT',
    repository: {
      url: `git+https://github.com/${config.npm.repository}.git`
    },
    dist: {
      integrity: 'sha512-fixture',
      tarball: 'https://registry.npmjs.org/fixture.tgz',
      attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } }
    }
  };
  const readback = {
    metadata: { versions: { [packagePolicy.version]: version } },
    attestations: {
      attestations: [
        {
          predicateType: 'https://slsa.dev/provenance/v1',
          bundle: { dsseEnvelope: { payload: provenancePayload(packagePolicy) } }
        }
      ]
    },
    trust: {
      provider: 'github',
      repository: config.npm.repository,
      workflowFile: config.npm.workflowFile,
      environment: config.npm.environment,
      permissions: ['create staged package']
    },
    packedFiles,
    cleanInstall: { installed: true, piLoaded: true }
  };
  assert.deepEqual(validatePackageReadback(readback, packagePolicy, config, gaCommit).issues, []);

  const directPublish = structuredClone(readback);
  directPublish.trust.permissions = ['publish package'];
  assert.match(
    validatePackageReadback(directPublish, packagePolicy, config, gaCommit).issues.join('\n'),
    /restricted create staged package authority/
  );

  readback.cleanInstall.piLoaded = false;
  readback.trust = {};
  readback.attestations.attestations[0].bundle.dsseEnvelope.payload = provenancePayload(
    packagePolicy,
    'b'.repeat(40)
  );
  const issues = validatePackageReadback(readback, packagePolicy, config, gaCommit).issues.join(
    '\n'
  );
  assert.match(issues, /trusted publisher/);
  assert.match(issues, /provenance/);
  assert.match(issues, /did not load in Pi/);
});

test('pricing and browser evidence require every declared route and viewport', () => {
  const pricing = config.pricing.routes.map((route) => ({
    path: route.path,
    status: 200,
    text: route.requiredText.join(' | ')
  }));
  assert.deepEqual(validatePricingReadbacks(pricing, config), []);

  const browser = {
    schemaVersion: 1,
    gaCommit,
    capturedAt: '2026-08-21T20:00:00Z',
    captures: config.pricing.routes.flatMap((route) =>
      config.pricing.browserWidths.map((width) => ({
        path: route.path,
        viewport: { width, height: width === 390 ? 844 : 720 },
        httpStatus: 200,
        screenshotVerified: true,
        consoleErrors: [],
        requestFailures: [],
        requiredTextPass: true,
        horizontalOverflowPixels: 0
      }))
    )
  };
  assert.deepEqual(
    validateBrowserEvidence(browser, config, gaCommit, {
      now: '2026-08-21T21:00:00Z',
      minimumCapturedAt: '2026-08-21T19:00:00Z'
    }),
    []
  );
  browser.captures.pop();
  assert.match(
    validateBrowserEvidence(browser, config, gaCommit, { now: '2026-08-21T21:00:00Z' }).join('\n'),
    /390px/
  );
});

test('Map burn-in accepts only Cloudflare D1 scheduled receipts and never revives a red day', () => {
  assert.deepEqual(config.map.receiptSource, {
    kind: 'cloudflare-d1',
    workerName: 'map-production-monitor',
    workerHealthUrl: 'https://map-production-monitor.createsomething.workers.dev/health',
    databaseName: 'create-something-db',
    wranglerConfig: 'packages/agency/wrangler.jsonc',
    table: 'map_production_monitor_receipts',
    alertTable: 'map_production_monitor_alerts',
    receiptRetentionDays: 30
  });

  const requiredCheckIds = ['desktop', 'mobile'].flatMap((viewport) => [
    `${viewport}_route_and_responsive_render`,
    `${viewport}_starter_booking_context`,
    `${viewport}_edit_booking_context`,
    `${viewport}_restore_booking_context`,
    `${viewport}_reset_booking_context`,
    `${viewport}_mapping_agent_non_mutating_boundary`,
    `${viewport}_map_health`,
    `${viewport}_console_health`
  ]);
  const passingChecks = requiredCheckIds.map((id, index) => ({
    id,
    ok: true,
    durationMs: index + 1
  }));
  const receipt = (day, status = 'passed', overrides = {}) => ({
    receiptId: `receipt-${day}-${status}`,
    schemaVersion: 1,
    trigger: 'scheduled',
    scheduledAt: `2026-08-${String(day).padStart(2, '0')}T18:00:00Z`,
    completedAt: `2026-08-${String(day).padStart(2, '0')}T18:01:00Z`,
    status,
    complete: true,
    sourceSha: gaCommit,
    workerVersion: `version-${day}`,
    baseUrl: 'https://createsomething.agency',
    customerDataUsed: false,
    agentMutationUsed: false,
    bookingSubmitted: false,
    checks: passingChecks,
    ...overrides
  });
  const receipts = [
    receipt(20),
    receipt(21),
    receipt(22, 'failed'),
    receipt(22),
    ...[23, 24, 25, 26, 27, 28].map((day) => receipt(day))
  ];
  const short = selectMapBurnIn(
    receipts,
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-28T18:30:00.000Z')
  );
  assert.match(short.issues.join('\n'), /current streak is 6/);
  assert.deepEqual(
    short.days.map((entry) => entry.date),
    ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']
  );

  const complete = selectMapBurnIn(
    [...receipts, receipt(29)],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-29T18:30:00.000Z')
  );
  assert.deepEqual(complete.issues, []);
  assert.deepEqual(
    complete.days.map((entry) => entry.date),
    ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29']
  );

  const invalid = selectMapBurnIn(
    [receipt(30, 'passed', { sourceSha: 'b'.repeat(40) })],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-30T18:30:00.000Z')
  );
  assert.match(invalid.issues.join('\n'), /source SHA does not match/);

  const unsafe = selectMapBurnIn(
    [receipt(30, 'passed', { customerDataUsed: true })],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-30T18:30:00.000Z')
  );
  assert.match(unsafe.issues.join('\n'), /not a complete passing scheduled receipt/);

  const missingChecks = selectMapBurnIn(
    [receipt(30, 'passed', { checks: [] })],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-30T18:30:00.000Z')
  );
  assert.match(missingChecks.issues.join('\n'), /complete passing synthetic checks/);

  const duplicateCheck = selectMapBurnIn(
    [receipt(30, 'passed', { checks: [...passingChecks, passingChecks[0]] })],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-30T18:30:00.000Z')
  );
  assert.match(duplicateCheck.issues.join('\n'), /complete passing synthetic checks/);

  const stale = selectMapBurnIn(
    [...receipts, receipt(29)],
    config.map,
    '2026-08-20T00:00:00Z',
    gaCommit,
    new Date('2026-08-31T18:30:00.000Z')
  );
  assert.match(stale.issues.join('\n'), /must end on the current America\/Chicago calendar day/);
});
