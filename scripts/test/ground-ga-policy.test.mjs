import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { evaluateGroundGa, validateGroundGaConfig } from '../ground-ga-policy.mjs';

const config = JSON.parse(
  await readFile(new URL('../../config/ground-ga.v1.json', import.meta.url), 'utf8')
);
const publicDistributionWorkflow = await readFile(
  new URL('../../.github/workflows/public-distribution-ga.yml', import.meta.url),
  'utf8'
);

function calibration(overrides = {}) {
  return {
    schema_version: 'ground-adjudication-summary.v1',
    receipts: { total: 33, complete: 14, partial: 12, no_analyzable: 7 },
    findings: {
      observed: 25,
      classified: 25,
      adjudicated: 11,
      unclassified: 0,
      confirmed: 10,
      false_positive: 1,
      out_of_scope: 14
    },
    checks: {
      duplicates: { adjudicated: 4, confirmed: 4, false_positive: 0, out_of_scope: 14 },
      orphans: { adjudicated: 4, confirmed: 3, false_positive: 1, out_of_scope: 0 },
      dead_exports: { adjudicated: 3, confirmed: 3, false_positive: 0, out_of_scope: 0 }
    },
    execution: { failures: 0 },
    precision: 10 / 11,
    false_positive_rate: 1 / 11,
    promotion: { ready: true, reasons: [] },
    ...overrides
  };
}

function evidence(overrides = {}) {
  const sourceSha = 'a'.repeat(40);
  const version = config.package.version;
  const platformSmokes = Object.fromEntries(
    config.platforms.map((platform) => [
      platform.id,
      {
        schema_version: 'ground-published-consumer-smoke.v1',
        platform: platform.id,
        version,
        source_sha: sourceSha,
        package: {
          name: config.package.name,
          integrity: `sha512-${platform.id}`,
          fresh_directory: true,
          lifecycle_scripts_enabled: true
        },
        mcp: { initialized: true, tool_count: 21 },
        language_smokes: Object.fromEntries(
          config.languages.map((language) => [
            language.id,
            { verification_status: 'FAIL', finding: `fixture-${language.id}` }
          ])
        ),
        ready: true
      }
    ])
  );
  return {
    schema_version: 'ground-ga-evidence.v1',
    source_sha: sourceSha,
    version,
    tests: {
      rust: true,
      npm_pilot: true,
      public_surface: true,
      agency: true,
      io: true,
      performance_pages: true
    },
    release: {
      tag: `ground-v${version}`,
      source_sha: sourceSha,
      checksums_verified: true,
      consumer_checksums_verified: true,
      provenance_verified: true,
      assets: [
        ...config.platforms.map((platform) => platform.asset),
        ...config.platforms.map((platform) => `ground-${platform.id}-consumer-smoke.json`),
        'CONSUMER-SHA256SUMS'
      ]
    },
    npm: {
      name: config.package.name,
      version,
      source_sha: sourceSha,
      provenance_verified: true,
      tool_count: 21,
      platform_smokes: platformSmokes
    },
    clients: Object.fromEntries(config.clients.map((client) => [client.id, true])),
    language_smokes: Object.fromEntries(config.languages.map((language) => [language.id, true])),
    browser: {
      source_sha: sourceSha,
      captured_at: new Date().toISOString(),
      routes: Object.fromEntries(
        config.surfaces.routes.map((route) => [
          route,
          {
            widths: config.surfaces.widths,
            reload: true,
            keyboard: true,
            copy: true,
            reduced_motion: true,
            no_javascript_meaning: true,
            no_console_errors: true,
            no_request_errors: true
          }
        ])
      )
    },
    ...overrides
  };
}

test('Ground GA config names the product support and proof boundary', () => {
  assert.deepEqual(validateGroundGaConfig(config), []);
  assert.deepEqual(
    config.languages.map((language) => language.id),
    ['typescript', 'javascript', 'svelte']
  );
  assert.deepEqual(
    config.platforms.map((platform) => platform.id),
    ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64']
  );
});

test('the protected public-distribution check runs Ground policy and Rust suites', () => {
  assert.match(publicDistributionWorkflow, /Verify Ground product and calibration contracts/);
  assert.match(publicDistributionWorkflow, /ground-ga-policy\.test\.mjs/);
  assert.match(publicDistributionWorkflow, /ground-public-surface\.test\.mjs/);
  assert.match(publicDistributionWorkflow, /cargo test --manifest-path packages\/ground\/Cargo\.toml/);
});

test('Ground GA is ready only when every independent receipt agrees', () => {
  const receipt = evaluateGroundGa(config, calibration(), evidence());
  assert.equal(receipt.promotion.ready, true, JSON.stringify(receipt, null, 2));
  assert.deepEqual(receipt.promotion.reasons, []);
});

test('Ground GA fails closed with actionable reasons for missing proof', () => {
  const badCalibration = calibration({
    promotion: { ready: false, reasons: ['precision_below_threshold'] }
  });
  const badEvidence = evidence();
  badEvidence.release.assets = badEvidence.release.assets.filter(
    (asset) => asset !== 'ground-darwin-x64.tar.gz'
  );
  badEvidence.npm.platform_smokes['darwin-x64'].source_sha = 'b'.repeat(40);
  badEvidence.clients.codex = false;
  badEvidence.language_smokes.svelte = false;
  badEvidence.browser.routes['https://createsomething.agency/products/ground'].no_console_errors =
    false;

  const receipt = evaluateGroundGa(config, badCalibration, badEvidence);
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, [
    'calibration:precision_below_threshold',
    'calibration:not_ready',
    'release_asset_missing:ground-darwin-x64.tar.gz',
    'platform_smoke_missing:darwin-x64',
    'client_smoke_missing:codex',
    'language_smoke_missing:svelte',
    'browser_check_failed:https://createsomething.agency/products/ground:no_console_errors'
  ]);
});

test('Ground GA rejects a boolean or source-mismatched platform assertion without a consumer receipt', () => {
  const badEvidence = evidence();
  badEvidence.npm.platform_smokes['darwin-arm64'] = true;
  badEvidence.npm.platform_smokes['linux-arm64'].source_sha = 'b'.repeat(40);

  const receipt = evaluateGroundGa(config, calibration(), badEvidence);
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, [
    'platform_smoke_missing:darwin-arm64',
    'platform_smoke_missing:linux-arm64'
  ]);
});

test('Ground GA recomputes the calibration gate instead of trusting a ready boolean', () => {
  const weakCalibration = calibration({
    receipts: { total: 1, complete: 1, partial: 0, no_analyzable: 0 },
    findings: {
      observed: 1,
      classified: 1,
      adjudicated: 1,
      unclassified: 0,
      confirmed: 1,
      false_positive: 0,
      out_of_scope: 0
    },
    checks: {
      duplicates: { adjudicated: 1, confirmed: 1, false_positive: 0, out_of_scope: 0 }
    },
    execution: { failures: 1 },
    precision: 0.5,
    false_positive_rate: 0.5,
    promotion: { ready: true, reasons: [] }
  });

  const receipt = evaluateGroundGa(config, weakCalibration, evidence());
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, [
    'calibration:insufficient_complete_receipts',
    'calibration:insufficient_adjudicated_findings',
    'calibration:precision_below_threshold',
    'calibration:false_positive_rate_above_threshold',
    'calibration:execution_failures_above_threshold',
    'calibration:insufficient_adjudicated_findings:duplicates',
    'calibration:insufficient_adjudicated_findings:orphans',
    'calibration:insufficient_adjudicated_findings:dead_exports'
  ]);
});

test('Ground GA CLI writes the machine-readable promotion receipt', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ground-ga-policy-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calibrationPath = join(directory, 'calibration.json');
  const evidencePath = join(directory, 'evidence.json');
  const receiptPath = join(directory, 'receipt.json');
  await Promise.all([
    writeFile(calibrationPath, `${JSON.stringify(calibration())}\n`),
    writeFile(evidencePath, `${JSON.stringify(evidence())}\n`)
  ]);

  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../ground-ga-verify.mjs', import.meta.url)),
      '--config',
      fileURLToPath(new URL('../../config/ground-ga.v1.json', import.meta.url)),
      '--calibration',
      calibrationPath,
      '--evidence',
      evidencePath,
      '--output',
      receiptPath
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  assert.equal(receipt.schema_version, 'ground-ga-receipt.v1');
  assert.equal(receipt.promotion.ready, true);
});
