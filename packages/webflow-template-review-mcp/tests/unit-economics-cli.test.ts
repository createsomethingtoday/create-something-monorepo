import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const packageRoot = path.resolve(import.meta.dirname, '..');
const fixtureRoot = path.join(import.meta.dirname, 'fixtures', 'unit-economics');

function runReport(
  outDir: string,
  overrides: Partial<{ collector: string; reviewer: string; rateCard: string; scenario: string }> = {},
) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/report-template-review-unit-economics.ts',
      '--collector',
      overrides.collector ?? path.join(fixtureRoot, 'collector-receipt.json'),
      '--reviewer',
      overrides.reviewer ?? path.join(fixtureRoot, 'reviewer-receipt.json'),
      '--rate-card',
      overrides.rateCard ?? path.join(fixtureRoot, 'rate-card.json'),
      '--scenario',
      overrides.scenario ?? path.join(fixtureRoot, 'scenario.json'),
      '--out',
      outDir,
    ],
    { cwd: packageRoot, encoding: 'utf8' },
  );
}

test('public CLI separates operating cost, capacity value, and unmeasured cash savings', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'template-review-unit-economics-'));
  const result = runReport(outDir);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(await readFile(path.join(outDir, 'template-review-unit-economics.json'), 'utf8'));
  const markdown = await readFile(path.join(outDir, 'template-review-unit-economics.md'), 'utf8');

  assert.equal(report.packet.packet_id, 'synthetic-packet-001');
  assert.deepEqual(report.packet.collector.tokens, {
    status: 'not_applicable',
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
  });
  assert.deepEqual(report.packet.reviewer.tokens, {
    status: 'observed_successful_response',
    input_tokens: 1000,
    cached_input_tokens: 400,
    output_tokens: 200,
    reasoning_tokens: 50,
    total_tokens: 1200,
  });
  assert.equal(report.packet.costs.collector_provider_usd, 0.00252);
  assert.equal(report.packet.costs.reviewer_provider_usd, 0.003);
  assert.equal(report.packet.costs.other_usd, 0.0014);
  assert.deepEqual(report.packet.costs.other_cost_measurement, {
    collector_storage: 'synthetic',
    collector_tools: 'synthetic',
    reviewer_storage: 'synthetic',
    reviewer_tools: 'synthetic',
  });
  assert.equal(report.packet.costs.total_usd, 0.00692);

  assert.equal(report.annual.capacity.eligible_reviews, 500);
  assert.equal(report.annual.capacity.hours_low, 33.333333333333);
  assert.equal(report.annual.capacity.hours_high, 183.333333333333);
  assert.equal(report.annual.operating_cost.provider_and_tool_usd, 3.46);
  assert.equal(report.annual.operating_cost.maintenance_usd, 100);
  assert.equal(report.annual.operating_cost.total_usd, 103.46);
  assert.equal(report.annual.capacity_value.gross_low_usd, 2000);
  assert.equal(report.annual.capacity_value.gross_high_usd, 11000);
  assert.equal(report.annual.capacity_value.net_low_usd, 1896.54);
  assert.equal(report.annual.capacity_value.net_high_usd, 10896.54);
  assert.equal(report.annual.cash_savings.status, 'unmeasured');
  assert.match(markdown, /Capacity value is not realized cash savings/i);
  assert.match(markdown, /synthetic_not_finance_actual/);
  assert.match(markdown, /Other-cost measurement: collector storage=synthetic/);
  assert.match(markdown, /Actual time-on-task per human review/);
});

test('public CLI rejects collector token attribution and incomplete packet joins', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'template-review-unit-economics-invalid-'));
  const collector = JSON.parse(await readFile(path.join(fixtureRoot, 'collector-receipt.json'), 'utf8'));
  collector.tokens.status = 'observed_successful_response';
  collector.tokens.input_tokens = 1;
  collector.tokens.total_tokens = 1;
  const invalidCollectorPath = path.join(tempDir, 'invalid-collector.json');
  await writeFile(invalidCollectorPath, `${JSON.stringify(collector, null, 2)}\n`);

  const tokenResult = runReport(path.join(tempDir, 'token-out'), { collector: invalidCollectorPath });
  assert.equal(tokenResult.status, 1);
  assert.match(tokenResult.stderr, /Evidence collection does not call a model/);

  const reviewer = JSON.parse(await readFile(path.join(fixtureRoot, 'reviewer-receipt.json'), 'utf8'));
  reviewer.packet_id = 'different-packet';
  const mismatchedReviewerPath = path.join(tempDir, 'mismatched-reviewer.json');
  await writeFile(mismatchedReviewerPath, `${JSON.stringify(reviewer, null, 2)}\n`);

  const mismatchResult = runReport(path.join(tempDir, 'mismatch-out'), { reviewer: mismatchedReviewerPath });
  assert.equal(mismatchResult.status, 1);
  assert.match(mismatchResult.stderr, /Packet mismatch/);
});

test('public CLI output is deterministic for fixed receipts and scenario inputs', async () => {
  const firstOut = await mkdtemp(path.join(tmpdir(), 'template-review-unit-economics-a-'));
  const secondOut = await mkdtemp(path.join(tmpdir(), 'template-review-unit-economics-b-'));

  const first = runReport(firstOut);
  const second = runReport(secondOut);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);

  assert.equal(
    await readFile(path.join(firstOut, 'template-review-unit-economics.json'), 'utf8'),
    await readFile(path.join(secondOut, 'template-review-unit-economics.json'), 'utf8'),
  );
  assert.equal(
    await readFile(path.join(firstOut, 'template-review-unit-economics.md'), 'utf8'),
    await readFile(path.join(secondOut, 'template-review-unit-economics.md'), 'utf8'),
  );
});
