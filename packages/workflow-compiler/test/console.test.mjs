import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createOperatorConsoleData,
  replayWorkflow,
} from '../dist/index.js';

const packageRoot = new URL('..', import.meta.url);
const workflowPath = new URL('../fixtures/marketplace/workflow.json', import.meta.url);
const casesPath = new URL('../fixtures/marketplace/cases.json', import.meta.url);

test('generates an operator console from compiled bundle and replay artifacts', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'workflow-compiler-console-'));

  try {
    const result = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'compile',
        '--workflow',
        workflowPath.pathname,
        '--cases',
        casesPath.pathname,
        '--out',
        outDir,
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const html = await readFile(join(outDir, 'operator-console', 'index.html'), 'utf8');
    const javascript = await readFile(join(outDir, 'operator-console', 'app.js'), 'utf8');
    const css = await readFile(join(outDir, 'operator-console', 'app.css'), 'utf8');
    const data = JSON.parse(
      await readFile(join(outDir, 'operator-console', 'data.json'), 'utf8'),
    );

    assert.match(html, /<link rel="stylesheet" href="\.\/app\.css" \/>/);
    assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
    assert.doesNotMatch(html, /<style>|<script type="module">/);
    assert.match(javascript, /fetch\('\.\/data\.json'\)/);
    assert.doesNotMatch(`${html}\n${javascript}`, /\beval\s*\(|new Function\b/);
    assert.match(css, /color-scheme: dark/);
    assert.doesNotMatch(html, /complete-validation-passes/);
    assert.equal(data.definitionHash, data.acceptanceSummary.definitionHash);
    assert.deepEqual(data.acceptanceSummary.counts, {
      pass: 1,
      approval_required: 1,
      blocked: 3,
    });

    const approvalCase = data.replayReport.cases.find(
      (entry) => entry.caseId === 'approval-waits-for-reviewer',
    );
    assert.equal(approvalCase.owner, 'marketplace-reviewer');
    assert.equal(approvalCase.canExecute, false);

    const blockedCase = data.replayReport.cases.find(
      (entry) => entry.caseId === 'missing-validation-evidence-blocks',
    );
    assert.equal(data.schemaVersion, 'workflow_operator_console.v0.1');
    assert.deepEqual(blockedCase.missingEvidence, ['published_url', 'validation_result']);
    assert.equal(blockedCase.canExecute, false);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('versions operator console data with the v0.2 artifacts it embeds', async () => {
  const definition = JSON.parse(await readFile(workflowPath, 'utf8'));
  const cases = JSON.parse(await readFile(casesPath, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const requestChanges = definition.actions.find((action) => action.id === 'request_changes');
  assert.ok(requestChanges);
  requestChanges.requiredEvidenceValues = { version_id: 'version-fixture-001' };
  requestChanges.requiredEvidenceMatchers = {
    review_feedback: { kind: 'contains_case_insensitive', values: ['changes'] },
  };

  const bundle = compileWorkflowDefinition(definition);
  const replay = replayWorkflow(bundle, cases);
  const data = createOperatorConsoleData(bundle, replay);

  assert.equal(data.schemaVersion, 'workflow_operator_console.v0.2');
  assert.equal(data.decisionInventory.schemaVersion, 'decision_inventory.v0.2');
  assert.equal(data.replayReport.schemaVersion, 'workflow_replay_report.v0.2');
  assert.equal(data.approvalSurfaces.schemaVersion, 'approval_surfaces.v0.2');
  const approvalSurface = data.approvalSurfaces.actions.find(
    (action) => action.actionId === 'request_changes',
  );
  assert.deepEqual(approvalSurface?.requiredEvidenceValues, {
    version_id: 'version-fixture-001',
  });
  assert.deepEqual(approvalSurface?.requiredEvidenceMatchers, {
    review_feedback: { kind: 'contains_case_insensitive', values: ['changes'] },
  });
});

test('rejects a console that would combine v0.2 bundle data with a v0.1 replay report', async () => {
  const definition = JSON.parse(await readFile(workflowPath, 'utf8'));
  const cases = JSON.parse(await readFile(casesPath, 'utf8'));
  const legacyBundle = compileWorkflowDefinition(definition);
  const legacyReplay = replayWorkflow(legacyBundle, cases);
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  const constrainedBundle = compileWorkflowDefinition(definition);

  assert.throws(
    () => createOperatorConsoleData(constrainedBundle, legacyReplay),
    /matching compiled bundle and replay report schema versions/,
  );
});
