import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertWorkflowPilotAmbiguityPreserved,
  assertWorkflowPilotPrivacy,
  runWorkflowShadowPilot,
} from '../dist/index.js';

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(packageDir, '../..');

function jsonl(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

async function writeTestCorpus(directory) {
  const caseIds = ['case-alpha', 'case-beta'];
  await writeFile(
    path.join(directory, 'manifest.blind.jsonl'),
    jsonl(caseIds.map((case_id) => ({ case_id }))),
  );
  await writeFile(
    path.join(directory, 'outcomes.private.jsonl'),
    jsonl([
      {
        case_id: 'case-alpha',
        selection_stratum: 'approved_good',
        actual_review_status: 'Approved',
        actual_improvement_areas: [],
        decision_date: '2026-07-01',
        review_feedback_snippet: 'Private feedback alpha',
      },
      {
        case_id: 'case-beta',
        selection_stratum: 'rejected_low_quality',
        actual_review_status: 'Rejected',
        actual_improvement_areas: [],
        rejection_reason: 'Other',
        decision_date: '2026-07-02',
        rejection_feedback_snippet: 'Private feedback beta',
      },
    ]),
  );
  await writeFile(
    path.join(directory, 'sandbox-results.jsonl'),
    jsonl(caseIds.map((case_id) => ({ case_id }))),
  );
  await writeFile(
    path.join(directory, 'status-alignment.jsonl'),
    jsonl([
      {
        case_id: 'case-alpha',
        template_name: 'Private Template Alpha',
        selection_stratum: 'approved_good',
        expected_review_status: 'Approved',
        reviewer: 'Private Reviewer Alpha',
        evidence_status: 'complete',
        finding_count: 0,
        substantive_finding_count: 0,
        finding_rule_ids: [],
        alignment_label: 'sandbox_consistent_with_approved_clean_evidence',
      },
      {
        case_id: 'case-beta',
        template_name: 'Private Template Beta',
        selection_stratum: 'rejected_low_quality',
        expected_review_status: 'Rejected',
        reviewer: 'Private Reviewer Beta',
        evidence_status: 'complete',
        finding_count: 1,
        substantive_finding_count: 1,
        finding_rule_ids: ['quality-issue'],
        alignment_label: 'sandbox_did_not_explain_human_rejection',
      },
    ]),
  );
}

test('joins the receipt and historical-context inputs into a sanitized corpus summary', async () => {
  const corpusDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-shadow-corpus-'));

  try {
    await writeTestCorpus(corpusDir);
    const outputDir = path.join(corpusDir, 'pilot-output');
    const liveAdapterReceiptPath = path.join(corpusDir, 'live-adapter-receipt.json');
    const liveAdapterReceipt = {
      schemaVersion: 'workflow_live_adapter_receipt.v0.1',
      mode: 'shadow',
      adapterId: 'review',
      owner: 'Webflow Template Review MCP',
      authBoundary: 'create-something-identity',
      serviceName: 'webflow-template-review-mcp',
      toolName: 'template_review_list_queue',
      requestedLimit: 2,
      observedItemCount: 2,
      rawResponseSha256: `sha256:${'a'.repeat(64)}`,
      discoveryVerified: true,
      readScopeVerified: true,
      mutationsPerformed: 0,
      invokedTools: ['template_review_list_queue'],
    };
    await writeFile(liveAdapterReceiptPath, `${JSON.stringify(liveAdapterReceipt)}\n`);
    const result = await runWorkflowShadowPilot({
      repoRoot,
      corpusDir,
      outputDir,
      measurementStartedAt: '2026-07-12T03:02:56Z',
      liveAdapterReceiptPath,
    });

    assert.equal(result.corpusSummary.schemaVersion, 'workflow_shadow_corpus_summary.v0.1');
    assert.equal(result.corpusSummary.caseCount, 2);
    assert.equal(result.corpusSummary.reviewerCount, 2);
    assert.equal(result.corpusSummary.maximumReviewerShare, 0.5);
    assert.deepEqual(result.corpusSummary.strataCounts, {
      approved_good: 1,
      rejected_low_quality: 1,
    });
    assert.match(result.corpusSummary.receiptCorpusSha256, /^sha256:[0-9a-f]{64}$/);
    assert.match(result.corpusSummary.historicalContextSha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(result.reconciliationSummary.samplingGateStatus, 'blocked');
    assert.equal(result.reconciliationSummary.discrepancyCount, 1);
    assert.equal(result.reconciliationSummary.contextSupportedCount, 1);
    assert.equal(result.reconciliationSummary.ambiguousCount, 0);
    assert.equal(result.reconciliationSummary.proposalApplied, false);
    assert.match(result.reconciliationSummary.receiptProposalSha256, /^sha256:[0-9a-f]{64}$/);
    assert.match(
      result.reconciliationSummary.historicalContextProposalSha256,
      /^sha256:[0-9a-f]{64}$/,
    );
    assert.equal(result.reconciliationSummary.cases.length, 1);
    assert.match(
      result.reconciliationSummary.cases[0].caseFingerprint,
      /^sha256:[0-9a-f]{64}$/,
    );
    assert.equal(result.reconciliationSummary.cases[0].status, 'context_supported');
    assert.equal(result.reconciliationSummary.cases[0].classification, 'manual_quality_context');
    assert.deepEqual(result.reconciliationSummary.cases[0].missingEvidence, []);
    assert.equal(result.privacySummary.status, 'pass');
    assert.equal(result.privacySummary.exactLeakCount, 0);
    assert.equal(result.privacySummary.forbiddenKeyCount, 0);
    assert.ok(result.privacySummary.sensitiveValuesChecked >= 8);
    assert.equal(result.compiledRuntime.artifactCount, 10);
    assert.match(result.compiledRuntime.definitionSha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(result.scorecard.status, 'blocked');
    assert.equal(result.scorecard.mutationsPerformed, 0);
    assert.equal(result.scorecard.proposalApplied, false);
    assert.equal(result.scorecard.langfuseUsed, false);
    assert.equal(result.measurementReceipt.startedAt, '2026-07-12T03:02:56Z');
    assert.ok(Date.parse(result.measurementReceipt.finishedAt) >= Date.parse(result.measurementReceipt.startedAt));
    assert.ok(result.measurementReceipt.elapsedMilliseconds >= 0);
    assert.equal(result.measurementReceipt.deterministicArtifactCount, 19);
    assert.equal(result.measurementReceipt.mutationsPerformed, 0);

    const compiledWorkflow = JSON.parse(
      await readFile(path.join(outputDir, 'compiled-runtime', 'compiled-workflow.json'), 'utf8'),
    );
    assert.equal(compiledWorkflow.definitionHash, result.compiledRuntime.definitionSha256);
    const compiledManifest = JSON.parse(
      await readFile(path.join(outputDir, 'compiled-runtime', 'manifest.json'), 'utf8'),
    );
    assert.equal(compiledManifest.files.length, 10);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'measurement-receipt.json'), 'utf8')),
      result.measurementReceipt,
    );

    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'discovery-pack.json'), 'utf8')),
      result.discoveryPack,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'corpus-summary.json'), 'utf8')),
      result.corpusSummary,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'reconciliation-summary.json'), 'utf8')),
      result.reconciliationSummary,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'privacy-summary.json'), 'utf8')),
      result.privacySummary,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'compiled-runtime-summary.json'), 'utf8')),
      result.compiledRuntime,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'shadow-scorecard.json'), 'utf8')),
      result.scorecard,
    );
    const manifest = JSON.parse(
      await readFile(path.join(outputDir, 'shadow-manifest.json'), 'utf8'),
    );
    assert.equal(manifest.files.length, 9);
    assert.ok(manifest.files.every((entry) => /^sha256:[0-9a-f]{64}$/.test(entry.sha256)));

    const operatorData = JSON.parse(
      await readFile(path.join(outputDir, 'operator-console', 'data.json'), 'utf8'),
    );
    assert.equal(operatorData.schemaVersion, 'workflow_shadow_operator_console.v0.1');
    assert.deepEqual(operatorData.boundaries, {
      mode: 'shadow',
      readOnly: true,
      mutationsPerformed: 0,
      proposalApplied: false,
      prohibitedActions: ['approve', 'execute', 'publish', 'resolve'],
    });
    assert.deepEqual(operatorData.scorecard, result.scorecard);
    assert.deepEqual(operatorData.discovery, result.discoveryPack);
    assert.deepEqual(operatorData.cases, result.reconciliationSummary.cases);
    assert.deepEqual(operatorData.compiledRuntime, result.compiledRuntime);
    assert.deepEqual(operatorData.liveAdapter, liveAdapterReceipt);
    assert.deepEqual(result.liveAdapterReceipt, liveAdapterReceipt);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDir, 'live-adapter-receipt.json'), 'utf8')),
      liveAdapterReceipt,
    );

    const operatorHtml = await readFile(
      path.join(outputDir, 'operator-console', 'index.html'),
      'utf8',
    );
    assert.match(operatorHtml, /Workflow Compiler Shadow Pilot/);
    assert.equal(operatorHtml.includes('<button'), false);
    assert.equal(/\b(?:approve|execute|publish|resolve)\b/i.test(operatorHtml), false);

    const serialized = JSON.stringify(result);
    for (const privateValue of [
      'Private Template Alpha',
      'Private Template Beta',
      'Private Reviewer Alpha',
      'Private Reviewer Beta',
      'Private feedback alpha',
      'Private feedback beta',
      'case-alpha',
      'case-beta',
    ]) {
      assert.equal(serialized.includes(privateValue), false);
      assert.equal(JSON.stringify(operatorData).includes(privateValue), false);
      assert.equal(operatorHtml.includes(privateValue), false);
    }
  } finally {
    await rm(corpusDir, { recursive: true, force: true });
  }
});

test('fails closed when a generated artifact contains a private corpus value', async () => {
  const corpusDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-shadow-privacy-leak-'));

  try {
    await writeTestCorpus(corpusDir);
    await assert.rejects(
      assertWorkflowPilotPrivacy(corpusDir, { accidentalLeak: 'Private Template Alpha' }),
      (error) => {
        assert.equal(error.code, 'PRIVATE_VALUE_LEAK');
        assert.equal(error.exactLeakCount, 1);
        assert.equal('leakedValue' in error, false);
        return true;
      },
    );
  } finally {
    await rm(corpusDir, { recursive: true, force: true });
  }
});

test('fails closed when a pilot attempts to erase a required historical ambiguity', () => {
  assert.throws(
    () =>
      assertWorkflowPilotAmbiguityPreserved({
        expectedAmbiguousCount: 1,
        actualAmbiguousCount: 0,
        proposalApplied: false,
      }),
    (error) => {
      assert.equal(error.code, 'AMBIGUITY_RESOLUTION_ATTEMPTED');
      assert.equal(error.expectedAmbiguousCount, 1);
      assert.equal(error.actualAmbiguousCount, 0);
      return true;
    },
  );
});
