import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadSanitizedHistoricalContextBundle } from '../dist/index.js';

test('joins historical context while redacting feedback text and reviewer identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-historical-context-'));
  try {
    await writeFile(
      join(root, 'outcomes.private.jsonl'),
      `${JSON.stringify({
        case_id: 'case_001',
        selection_stratum: 'rejected_low_quality',
        actual_review_status: 'Rejected',
        actual_improvement_areas: ['Template: Graphic design', 'Template: Technical requirements'],
        reviewer: 'Private Reviewer',
        review_feedback_snippet: 'private review feedback must never escape',
        rejection_reason: 'UI/UX Concerns',
        rejection_feedback_snippet: 'private rejection feedback must never escape',
        decision_date: '2026-01-01',
      })}\n`,
    );
    await writeFile(
      join(root, 'status-alignment.jsonl'),
      `${JSON.stringify({
        case_id: 'case_001',
        alignment_label: 'sandbox_did_not_explain_human_rejection',
      })}\n`,
    );

    const bundle = await loadSanitizedHistoricalContextBundle(root);
    assert.deepEqual(bundle.cases, [
      {
        id: 'historical-context:case_001',
        caseId: 'case_001',
        selectionStratum: 'rejected_low_quality',
        observedOutcome: 'rejected',
        alignmentLabel: 'sandbox_did_not_explain_human_rejection',
        rejectionCategory: 'UI/UX Concerns',
        improvementAreas: ['Template: Graphic design', 'Template: Technical requirements'],
        hasReviewFeedback: true,
        hasRejectionFeedback: true,
        hasDecisionDate: true,
        sourcePointers: {
          outcome: 'outcomes.private.jsonl:line:1',
          alignment: 'status-alignment.jsonl:line:1',
        },
      },
    ]);
    const serialized = JSON.stringify(bundle);
    assert.doesNotMatch(serialized, /Private Reviewer|private review feedback|private rejection feedback/);
    assert.match(bundle.source.hash, /^sha256:[a-f0-9]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
