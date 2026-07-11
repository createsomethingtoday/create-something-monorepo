import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  extractEmbeddedWorkflowReceiptCorpus,
  loadWorkflowReceiptCorpusFromDirectory,
} from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);
const reportUrl = new URL(
  'specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md',
  repoRoot,
);

test('extracts immutable case receipts with exact report provenance', async () => {
  const content = await readFile(reportUrl, 'utf8');
  const corpus = extractEmbeddedWorkflowReceiptCorpus({
    id: 'balanced-50-calibration',
    path: reportUrl.pathname,
    content,
  });

  assert.equal(corpus.source.path, reportUrl.pathname);
  assert.match(corpus.source.hash, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    corpus.receipts.map((receipt) => ({
      id: receipt.id,
      templateName: receipt.templateName,
      outcome: receipt.expectedReviewStatus,
      reviewer: receipt.reviewer,
      substantiveFindingCount: receipt.substantiveFindingCount,
      sourcePointer: receipt.sourcePointer,
    })),
    [
      {
        id: 'embedded-case:introx',
        templateName: 'Introx',
        outcome: 'approved',
        reviewer: 'Natalia Ledford',
        substantiveFindingCount: 2,
        sourcePointer: 'lines:139-153',
      },
      {
        id: 'embedded-case:automatia',
        templateName: 'Automatia',
        outcome: 'rejected',
        reviewer: 'Natalia Ledford',
        substantiveFindingCount: 0,
        sourcePointer: 'lines:154-165',
      },
    ],
  );
});

test('loads a joined raw artifact directory into case-level receipts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-receipt-corpus-'));
  const rows = [
    { case_id: 'case_001', asset_id: 'asset_1', version_id: 'version_1' },
    { case_id: 'case_002', asset_id: 'asset_2', version_id: 'version_2' },
  ];
  try {
    await writeFile(join(root, 'manifest.blind.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    await writeFile(join(root, 'outcomes.private.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    await writeFile(join(root, 'sandbox-results.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
    await writeFile(
      join(root, 'status-alignment.jsonl'),
      [
        {
          ...rows[0],
          template_name: 'First',
          selection_stratum: 'approved_good',
          expected_review_status: 'approved',
          expected_quality_rating: 'good',
          reviewer: 'Reviewer A',
          evidence_status: 'usable',
          finding_count: 1,
          substantive_finding_count: 0,
          finding_rule_ids: ['rule.minor'],
          alignment_label: 'sandbox_minor_signals_on_approved_case',
        },
        {
          ...rows[1],
          template_name: 'Second',
          selection_stratum: 'rejected_low_quality',
          expected_review_status: 'rejected',
          evidence_status: 'usable',
          finding_count: 0,
          substantive_finding_count: 0,
          finding_rule_ids: [],
          alignment_label: 'sandbox_did_not_explain_human_rejection',
        },
      ].map((row) => JSON.stringify(row)).join('\n') + '\n',
    );

    const corpus = await loadWorkflowReceiptCorpusFromDirectory(root);
    assert.equal(corpus.receipts.length, 2);
    assert.equal(corpus.source.files.length, 4);
    assert.equal(corpus.receipts[1].expectedQualityRating, undefined);
    assert.equal(corpus.receipts[1].reviewer, '(missing reviewer)');
    assert.match(corpus.source.hash, /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(
      corpus.receipts.map(({ id, templateName, sourcePointer }) => ({ id, templateName, sourcePointer })),
      [
        { id: 'receipt:case_001', templateName: 'First', sourcePointer: 'status-alignment.jsonl:line:1' },
        { id: 'receipt:case_002', templateName: 'Second', sourcePointer: 'status-alignment.jsonl:line:2' },
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
