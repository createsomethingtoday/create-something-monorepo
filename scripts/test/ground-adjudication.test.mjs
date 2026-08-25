import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = fileURLToPath(new URL('../ground-adjudication.mjs', import.meta.url));
const repositoryLedgerPath = fileURLToPath(
  new URL('../../docs/internal/ground-adjudication-ledger.v1.json', import.meta.url)
);
const { formatMarkdown, summarizeLedger, validateLedger } = await import(
  new URL('../ground-adjudication.mjs', import.meta.url)
);

function fixture(overrides = {}) {
  return {
    schema_version: 'ground-adjudication-ledger.v1',
    mode: 'advisory',
    thresholds: {
      minimum_complete_receipts: 2,
      minimum_adjudicated_findings: 3,
      minimum_precision: 0.8,
      maximum_false_positive_rate: 0.2
    },
    records: [
      {
        receipt: {
          id: 'pr-1',
          source: 'https://example.test/pr/1',
          completion: 'complete',
          observed_findings: 2
        },
        verdicts: [
          {
            finding_id: 'duplicate-a',
            check: 'duplicates',
            verdict: 'confirmed',
            rationale: 'The changed helper duplicates the existing parser.'
          },
          {
            finding_id: 'duplicate-b',
            check: 'duplicates',
            verdict: 'false_positive',
            rationale: 'The similar code differs in authorization behavior.'
          }
        ]
      },
      {
        receipt: {
          id: 'pr-2',
          source: 'https://example.test/pr/2',
          completion: 'partial',
          observed_findings: 1
        },
        verdicts: [
          {
            finding_id: 'orphan-a',
            check: 'orphans',
            verdict: 'confirmed',
            rationale: 'The new module has no entry-point or import path.'
          }
        ]
      }
    ],
    ...overrides
  };
}

test('summarizes adjudicated Ground findings and keeps insufficient evidence advisory', () => {
  const summary = summarizeLedger(fixture());

  assert.equal(summary.mode, 'advisory');
  assert.deepEqual(summary.receipts, { total: 2, complete: 1, partial: 1, no_analyzable: 0 });
  assert.deepEqual(summary.findings, {
    observed: 3,
    classified: 3,
    adjudicated: 3,
    unclassified: 0,
    confirmed: 2,
    false_positive: 1,
    out_of_scope: 0
  });
  assert.equal(summary.precision, 2 / 3);
  assert.equal(summary.false_positive_rate, 1 / 3);
  assert.equal(summary.promotion.ready, false);
  assert.deepEqual(summary.promotion.reasons, [
    'insufficient_complete_receipts',
    'precision_below_threshold',
    'false_positive_rate_above_threshold'
  ]);
  assert.match(formatMarkdown(summary), /Promotion readiness: not ready/);
  assert.match(formatMarkdown(summary), /Advisory only/);
});

test('rejects missing rationale, unknown verdicts, duplicate receipt ids, and verdicts beyond observed findings', () => {
  const invalid = fixture({
    records: [
      {
        receipt: { id: 'same', source: 'one', completion: 'complete', observed_findings: 0 },
        verdicts: [
          { finding_id: 'finding', check: 'duplicates', verdict: 'unknown', rationale: '' }
        ]
      },
      {
        receipt: { id: 'same', source: 'two', completion: 'complete', observed_findings: 0 },
        verdicts: []
      }
    ]
  });

  assert.throws(
    () => validateLedger(invalid),
    /duplicate receipt id|unknown verdict|rationale|more verdicts/i
  );
});

test('CLI emits a deterministic JSON summary from a repo-owned ledger', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ground-adjudication-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const ledgerPath = join(directory, 'ledger.json');
  writeFileSync(ledgerPath, `${JSON.stringify(fixture())}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--ledger', ledgerPath, '--format', 'json'],
    {
      encoding: 'utf8'
    }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.schema_version, 'ground-adjudication-summary.v1');
  assert.equal(summary.promotion.ready, false);
  assert.equal(summary.findings.confirmed, 2);
});

test('CLI can preserve the calibration summary as a new evidence artifact', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ground-adjudication-output-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const ledgerPath = join(directory, 'ledger.json');
  const outputPath = join(directory, 'summary.json');
  writeFileSync(ledgerPath, `${JSON.stringify(fixture())}\n`);

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--ledger', ledgerPath, '--format', 'json', '--output', outputPath],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), JSON.parse(result.stdout));
  const secondResult = spawnSync(
    process.execPath,
    [scriptPath, '--ledger', ledgerPath, '--format', 'json', '--output', outputPath],
    { encoding: 'utf8' }
  );
  assert.notEqual(secondResult.status, 0, 'evidence output must fail closed instead of overwriting');
});

test('out-of-scope classifications remain auditable but do not satisfy the calibration gate', () => {
  const ledger = fixture({
    records: [
      {
        receipt: {
          id: 'preexisting-pairs',
          source: 'https://example.test/pr/preexisting',
          completion: 'complete',
          observed_findings: 2
        },
        verdicts: [
          {
            finding_id: 'pair-a',
            check: 'duplicates',
            verdict: 'out_of_scope',
            rationale: 'The duplicate was present in the base revision.'
          },
          {
            finding_id: 'pair-b',
            check: 'duplicates',
            verdict: 'out_of_scope',
            rationale: 'The duplicate was present in the base revision.'
          }
        ]
      }
    ]
  });

  const summary = summarizeLedger(ledger);
  assert.deepEqual(summary.findings, {
    observed: 2,
    classified: 2,
    adjudicated: 0,
    unclassified: 0,
    confirmed: 0,
    false_positive: 0,
    out_of_scope: 2
  });
  assert.equal(summary.precision, null);
  assert.match(summary.promotion.reasons.join(','), /insufficient_adjudicated_findings/);
  assert.doesNotMatch(summary.promotion.reasons.join(','), /unclassified_findings/);
});

test('calibration can require evidence by check and zero execution failures', () => {
  const ledger = fixture();
  ledger.thresholds = {
    ...ledger.thresholds,
    minimum_complete_receipts: 1,
    minimum_precision: 0.6,
    maximum_false_positive_rate: 0.4,
    minimum_adjudicated_by_check: {
      duplicates: 2,
      orphans: 1
    },
    maximum_execution_failures: 0
  };
  ledger.records[0].receipt.execution_failures = 1;

  const summary = summarizeLedger(ledger);
  assert.deepEqual(summary.checks, {
    duplicates: { adjudicated: 2, confirmed: 1, false_positive: 1, out_of_scope: 0 },
    orphans: { adjudicated: 1, confirmed: 1, false_positive: 0, out_of_scope: 0 }
  });
  assert.deepEqual(summary.execution, { failures: 1 });
  assert.deepEqual(summary.promotion.reasons, ['execution_failures_above_threshold']);

  ledger.records[0].receipt.execution_failures = 0;
  assert.equal(summarizeLedger(ledger).promotion.ready, true);
});

test('the repository ledger meets the advisory calibration policy without counting out-of-scope observations', () => {
  const ledger = JSON.parse(readFileSync(repositoryLedgerPath, 'utf8'));
  const summary = summarizeLedger(ledger);

  assert.deepEqual(summary.receipts, { total: 33, complete: 14, partial: 12, no_analyzable: 7 });
  assert.deepEqual(summary.findings, {
    observed: 25,
    classified: 25,
    adjudicated: 11,
    unclassified: 0,
    confirmed: 10,
    false_positive: 1,
    out_of_scope: 14
  });
  assert.deepEqual(summary.checks, {
    orphans: { adjudicated: 4, confirmed: 3, false_positive: 1, out_of_scope: 0 },
    duplicates: { adjudicated: 4, confirmed: 4, false_positive: 0, out_of_scope: 14 },
    dead_exports: { adjudicated: 3, confirmed: 3, false_positive: 0, out_of_scope: 0 }
  });
  assert.deepEqual(summary.execution, { failures: 0 });
  assert.equal(summary.precision, 10 / 11);
  assert.equal(summary.false_positive_rate, 1 / 11);
  assert.equal(summary.promotion.ready, true);
  assert.deepEqual(summary.promotion.reasons, []);
});
