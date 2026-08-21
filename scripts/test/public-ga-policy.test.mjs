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
            required_approving_review_count: 1,
            require_code_owner_review: true,
            required_review_thread_resolution: true,
            require_last_push_approval: true
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
    collaborators: [
      { login: 'one', permissions: { admin: true } },
      { login: 'two', permissions: { push: true } }
    ],
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

test('GA config keeps the public boundary, review gate, two packages, and seven days explicit', () => {
  assert.deepEqual(validateGaConfig(config), []);
  assert.deepEqual(config.repository.requiredChecks, [
    'Philosophical Code Review',
    'Public Distribution GA'
  ]);
  assert.equal(config.repository.minimumMaintainers, 2);
  assert.equal(config.repository.minimumCodeOwners, 2);
  assert.equal(config.packages.length, 2);
  assert.equal(config.map.requiredConsecutiveDays, 7);
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

test('CODEOWNERS requires two write-capable individual recovery owners', () => {
  assert.deepEqual(validateCodeowners('* @one @two\n', ['one', 'two'], 2), {
    issues: [],
    owners: ['one', 'two']
  });
  assert.match(
    validateCodeowners('* @one @unknown\n', ['one', 'two'], 2).issues[0],
    /2 write-capable individual owners/
  );
});

test('repository readback fails closed on missing review, maintainer, secret, and runtime ownership', () => {
  const passing = repositoryReadback();
  assert.deepEqual(validateRepositoryReadback(passing, config, gaCommit).issues, []);

  const failing = repositoryReadback();
  failing.ruleset.rules[0].parameters.required_approving_review_count = 0;
  failing.collaborators.pop();
  failing.secretAlerts.push({ number: 9 });
  failing.dependabotAlerts.push({
    number: 10,
    state: 'open',
    dependency: { scope: 'runtime' },
    security_advisory: { severity: 'critical', ghsa_id: 'GHSA-unowned' }
  });
  const issues = validateRepositoryReadback(failing, config, gaCommit).issues.join('\n');
  assert.match(issues, /approving reviews/);
  assert.match(issues, /2 write-capable maintainers/);
  assert.match(issues, /secret-scanning/);
  assert.match(issues, /GHSA-unowned/);
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
      permissions: ['publish']
    },
    packedFiles,
    cleanInstall: { installed: true, piLoaded: true }
  };
  assert.deepEqual(validatePackageReadback(readback, packagePolicy, config, gaCommit).issues, []);

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

test('Map burn-in resets on red and accepts only seven distinct consecutive calendar days', () => {
  const run = (day, conclusion = 'success', event = 'schedule') => ({
    id: day,
    status: 'completed',
    conclusion,
    event,
    created_at: `2026-08-${String(day).padStart(2, '0')}T18:00:00Z`,
    html_url: `https://github.com/example/actions/runs/${day}`,
    head_sha: gaCommit
  });
  const runs = [
    run(20),
    run(21),
    run(22, 'failure'),
    ...[22, 23, 24, 25, 26, 27, 28].map((day) => run(day))
  ];
  const result = selectMapBurnIn(runs, config.map, '2026-08-20T00:00:00Z');
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.days.map((entry) => entry.date),
    [
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28'
    ]
  );

  const short = selectMapBurnIn(runs.slice(0, -1), config.map, '2026-08-20T00:00:00Z');
  assert.match(short.issues[0], /current streak is 6/);
});
