import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

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
    assert.deepEqual(blockedCase.missingEvidence, ['published_url', 'validation_result']);
    assert.equal(blockedCase.canExecute, false);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
