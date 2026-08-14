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

test('the repository ledger records current observations without treating out-of-scope classifications as calibration evidence', () => {
  const ledger = JSON.parse(readFileSync(repositoryLedgerPath, 'utf8'));
  const summary = summarizeLedger(ledger);

  assert.deepEqual(summary.receipts, { total: 21, complete: 3, partial: 11, no_analyzable: 7 });
  assert.deepEqual(summary.findings, {
    observed: 14,
    classified: 14,
    adjudicated: 0,
    unclassified: 0,
    confirmed: 0,
    false_positive: 0,
    out_of_scope: 14
  });
  assert.equal(summary.precision, null);
  assert.equal(summary.promotion.ready, false);
  assert.deepEqual(summary.promotion.reasons, [
    'complete_receipt_threshold_not_configured',
    'insufficient_adjudicated_findings',
    'precision_threshold_not_configured',
    'false_positive_rate_threshold_not_configured'
  ]);
});
