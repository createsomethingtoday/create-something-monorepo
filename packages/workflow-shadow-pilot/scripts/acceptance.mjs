import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertWorkflowPilotAmbiguityPreserved,
  runWorkflowShadowPilot,
} from '../dist/index.js';

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(packageDir, '../..');
const corpusDir = process.env.WORKFLOW_PILOT_CORPUS_DIR;
if (!corpusDir) throw new Error('WORKFLOW_PILOT_CORPUS_DIR is required');
const liveAdapterReceiptPath = process.env.WORKFLOW_PILOT_LIVE_RECEIPT?.trim();

const startedAt = process.env.WORKFLOW_PILOT_STARTED_AT ?? '2026-07-12T03:02:56Z';
const stableOutput = path.resolve(
  process.env.WORKFLOW_PILOT_ACCEPTANCE_OUT ??
    path.join(os.tmpdir(), 'cre-1219-workflow-shadow-pilot'),
);

async function filesUnder(root, prefix = '') {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, relative)));
    else files.push(relative);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

const scratch = await mkdtemp(path.join(os.tmpdir(), 'workflow-shadow-pilot-acceptance-'));
const firstDir = path.join(scratch, 'first');
const secondDir = path.join(scratch, 'second');

try {
  const first = await runWorkflowShadowPilot({
    repoRoot,
    corpusDir,
    outputDir: firstDir,
    measurementStartedAt: startedAt,
    ...(liveAdapterReceiptPath ? { liveAdapterReceiptPath } : {}),
  });
  const second = await runWorkflowShadowPilot({
    repoRoot,
    corpusDir,
    outputDir: secondDir,
    measurementStartedAt: startedAt,
    ...(liveAdapterReceiptPath ? { liveAdapterReceiptPath } : {}),
  });

  const firstFiles = (await filesUnder(firstDir)).filter(
    (file) => file !== 'measurement-receipt.json',
  );
  const secondFiles = (await filesUnder(secondDir)).filter(
    (file) => file !== 'measurement-receipt.json',
  );
  assert.deepEqual(firstFiles, secondFiles);
  for (const file of firstFiles) {
    assert.equal(
      await readFile(path.join(firstDir, file), 'utf8'),
      await readFile(path.join(secondDir, file), 'utf8'),
      `${file} was not deterministic`,
    );
  }

  assert.equal(first.scorecard.status, 'pass');
  assert.equal(first.corpusSummary.caseCount, 20);
  assert.equal(first.corpusSummary.reviewerCount, 7);
  assert.equal(first.corpusSummary.maximumReviewerShare, 0.25);
  assert.deepEqual(first.corpusSummary.strataCounts, {
    approved_exceptional: 4,
    approved_good: 4,
    iterative_review: 4,
    policy_or_duplicate: 4,
    rejected_low_quality: 4,
  });
  assert.equal(first.reconciliationSummary.samplingGateStatus, 'pass');
  assert.equal(first.reconciliationSummary.discrepancyCount, 13);
  assert.equal(first.reconciliationSummary.contextSupportedCount, 12);
  assert.equal(first.reconciliationSummary.ambiguousCount, 1);
  assert.equal(first.reconciliationSummary.cases.length, 13);
  assert.equal(
    first.reconciliationSummary.cases.filter((item) => item.status === 'context_supported').length,
    12,
  );
  const ambiguousCase = first.reconciliationSummary.cases.find(
    (item) => item.status === 'ambiguous',
  );
  assert.ok(ambiguousCase);
  assert.match(ambiguousCase.caseFingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(ambiguousCase.missingEvidence, [
    'decision_time_snapshot',
    'historical_decision_receipt',
    'override_or_exception_record',
  ]);
  assert.equal(first.reconciliationSummary.proposalApplied, false);
  assertWorkflowPilotAmbiguityPreserved({
    expectedAmbiguousCount: 1,
    actualAmbiguousCount: first.reconciliationSummary.ambiguousCount,
    proposalApplied: first.reconciliationSummary.proposalApplied,
  });
  assert.equal(first.privacySummary.status, 'pass');
  assert.equal(first.privacySummary.exactLeakCount, 0);
  assert.equal(first.privacySummary.forbiddenKeyCount, 0);
  assert.equal(first.discoveryPack.sources.length, 6);
  assert.equal(first.discoveryPack.adapters.length, 6);
  assert.equal(first.compiledRuntime.artifactCount, 10);
  assert.equal(first.artifactManifest.files.length, liveAdapterReceiptPath ? 9 : 8);
  assert.equal(first.measurementReceipt.deterministicArtifactCount, liveAdapterReceiptPath ? 19 : 18);
  assert.equal(first.measurementReceipt.mutationsPerformed, 0);
  assert.equal(first.scorecard.langfuseUsed, false);
  if (liveAdapterReceiptPath) {
    assert.ok(first.liveAdapterReceipt);
    assert.equal(first.liveAdapterReceipt.mutationsPerformed, 0);
    assert.deepEqual(first.liveAdapterReceipt.invokedTools, [
      'template_review_list_queue',
    ]);
  }

  const operatorData = JSON.parse(
    await readFile(path.join(firstDir, 'operator-console', 'data.json'), 'utf8'),
  );
  assert.equal(operatorData.boundaries.readOnly, true);
  assert.equal(operatorData.boundaries.mutationsPerformed, 0);
  assert.equal(operatorData.cases.length, 13);
  assert.equal(operatorData.cases.filter((item) => item.status === 'ambiguous').length, 1);
  const operatorHtml = await readFile(
    path.join(firstDir, 'operator-console', 'index.html'),
    'utf8',
  );
  assert.equal(operatorHtml.includes('<button'), false);

  await rm(stableOutput, { recursive: true, force: true });
  await cp(secondDir, stableOutput, { recursive: true });
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        deterministic: true,
        outputDir: stableOutput,
        deterministicFileCount: firstFiles.length,
        scorecard: first.scorecard,
        measurementReceipt: second.measurementReceipt,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
