import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  evaluateGroundCalibration,
  evaluateGroundGa,
  validateGroundGaConfig
} from '../ground-ga-policy.mjs';

const config = JSON.parse(
  await readFile(new URL('../../config/ground-ga.v1.json', import.meta.url), 'utf8')
);
const publicDistributionWorkflow = await readFile(
  new URL('../../.github/workflows/public-distribution-ga.yml', import.meta.url),
  'utf8'
);
const groundReleaseWorkflow = await readFile(
  new URL('../../.github/workflows/ground-release.yml', import.meta.url),
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
    recall: 1,
    recall_evidence: { expected: 10, detected: 10, missed: 0 },
    false_positive_rate: 1 / 11,
    promotion: { ready: true, reasons: [] },
    ...overrides
  };
}

function fixtureExecution(sourceSha, overrides = {}) {
  return {
    schema_version: config.calibration.fixtureExecution.receiptSchema,
    source_sha: sourceSha,
    manifest: config.calibration.fixtureExecution.manifest,
    test_target: config.calibration.fixtureExecution.testTarget,
    command:
      'cargo test --manifest-path packages/ground/Cargo.toml --test ga_calibration -- --nocapture',
    result: {
      completed: true,
      exit_code: 0,
      signal: null,
      summary_seen: true,
      passed: 12,
      failed: 0,
      ignored: 0,
      measured: 0,
      filtered_out: 0
    },
    ready: true,
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
        trust_contract: {
          invalid_policy_rejected: true,
          stale_evidence_rejected: true,
          inferred_fixes_review_only: true,
          workspace_discovery_verified: true,
          policy_digest_verified: true
        },
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
        config.calibration.releaseReceipt,
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
  assert.match(
    publicDistributionWorkflow,
    /cargo test --manifest-path packages\/ground\/Cargo\.toml/
  );
});

test('the exact-tag release fails closed on calibration and preserves its receipt', () => {
  assert.match(groundReleaseWorkflow, /verify-calibration:/);
  assert.match(groundReleaseWorkflow, /name:\s*Execute governed Ground calibration fixtures/);
  assert.match(groundReleaseWorkflow, /ground-calibration-execution-receipt\.mjs/);
  assert.match(
    groundReleaseWorkflow,
    /cargo test --manifest-path packages\/ground\/Cargo\.toml --test ga_calibration/
  );
  assert.match(groundReleaseWorkflow, /ground-calibration-execution-receipt\.json/);
  assert.match(groundReleaseWorkflow, /continue-on-error:\s*true/);
  assert.match(groundReleaseWorkflow, /ground-calibration-verify\.mjs/);
  assert.match(groundReleaseWorkflow, /--execution ground-calibration-execution-receipt\.json/);
  assert.match(
    groundReleaseWorkflow,
    /name:\s*Verify exact-source calibration gate\s*\n\s*if:\s*always\(\)/
  );
  assert.match(groundReleaseWorkflow, /needs:\s*verify-calibration/);
  assert.match(groundReleaseWorkflow, /needs\.verify-calibration\.result == 'success'/);
  assert.match(groundReleaseWorkflow, /ground-calibration-receipt\.json/);
});

test('the calibration-only evaluator recomputes configured thresholds', () => {
  const receipt = evaluateGroundCalibration(
    config,
    calibration({
      receipts: { total: 1, complete: 1, partial: 0, no_analyzable: 0 },
      promotion: { ready: true, reasons: [] }
    })
  );
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, ['calibration:insufficient_complete_receipts']);
});

test('the calibration CLI emits an exact-source release receipt', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ground-calibration-release-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const receiptPath = join(directory, 'ground-calibration-receipt.json');
  const executionPath = join(directory, 'ground-calibration-execution-receipt.json');
  const sourceSha = 'c'.repeat(40);
  await writeFile(executionPath, `${JSON.stringify(fixtureExecution(sourceSha))}\n`);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../ground-calibration-verify.mjs', import.meta.url)),
      '--config',
      fileURLToPath(new URL('../../config/ground-ga.v1.json', import.meta.url)),
      '--source-sha',
      sourceSha,
      '--release-tag',
      `ground-v${config.package.version}`,
      '--execution',
      executionPath,
      '--output',
      receiptPath
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  assert.equal(receipt.schema_version, 'ground-calibration-release-receipt.v1');
  assert.equal(receipt.source_sha, sourceSha);
  assert.equal(receipt.release_tag, `ground-v${config.package.version}`);
  assert.deepEqual(receipt.fixture_execution, fixtureExecution(sourceSha));
  assert.equal(receipt.promotion.ready, true);
});

test('the calibration CLI preserves a receipt and exits nonzero below policy', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ground-calibration-fail-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configDirectory = join(directory, 'config');
  const ledgerDirectory = join(directory, 'docs', 'internal');
  await Promise.all([
    mkdir(configDirectory, { recursive: true }),
    mkdir(ledgerDirectory, { recursive: true })
  ]);
  const configPath = join(configDirectory, 'ground-ga.v1.json');
  const ledgerPath = join(ledgerDirectory, 'ground-adjudication-ledger.v1.json');
  const receiptPath = join(directory, 'ground-calibration-receipt.json');
  const executionPath = join(directory, 'ground-calibration-execution-receipt.json');
  const weakConfig = {
    ...config,
    calibration: { ...config.calibration, minimumCompleteReceipts: 99 }
  };
  await Promise.all([
    writeFile(configPath, `${JSON.stringify(weakConfig)}\n`),
    writeFile(executionPath, `${JSON.stringify(fixtureExecution('d'.repeat(40)))}\n`),
    writeFile(
      ledgerPath,
      await readFile(
        new URL('../../docs/internal/ground-adjudication-ledger.v1.json', import.meta.url),
        'utf8'
      )
    )
  ]);

  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../ground-calibration-verify.mjs', import.meta.url)),
      '--config',
      configPath,
      '--source-sha',
      'd'.repeat(40),
      '--release-tag',
      `ground-v${config.package.version}`,
      '--execution',
      executionPath,
      '--output',
      receiptPath
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, ['calibration:insufficient_complete_receipts']);
});

test('the calibration CLI rejects a failed exact-source fixture execution even when the ledger is ready', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ground-calibration-execution-fail-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceSha = 'e'.repeat(40);
  const executionPath = join(directory, 'ground-calibration-execution-receipt.json');
  const receiptPath = join(directory, 'ground-calibration-receipt.json');
  await writeFile(
    executionPath,
    `${JSON.stringify(
      fixtureExecution(sourceSha, {
        result: {
          completed: true,
          exit_code: 101,
          signal: null,
          summary_seen: true,
          passed: 11,
          failed: 1,
          ignored: 0,
          measured: 0,
          filtered_out: 0
        },
        ready: false
      })
    )}\n`
  );

  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../ground-calibration-verify.mjs', import.meta.url)),
      '--config',
      fileURLToPath(new URL('../../config/ground-ga.v1.json', import.meta.url)),
      '--source-sha',
      sourceSha,
      '--release-tag',
      `ground-v${config.package.version}`,
      '--execution',
      executionPath,
      '--output',
      receiptPath
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  assert.equal(receipt.promotion.ready, false);
  assert.deepEqual(receipt.promotion.reasons, [
    'calibration:fixture_execution_exit_nonzero',
    'calibration:fixture_execution_insufficient_passed_tests',
    'calibration:fixture_execution_failed_tests',
    'calibration:fixture_execution_not_ready'
  ]);
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
