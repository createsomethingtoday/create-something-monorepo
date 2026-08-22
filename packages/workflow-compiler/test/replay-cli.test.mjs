import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const packageRoot = new URL('..', import.meta.url);
const workflowPath = new URL('../fixtures/marketplace/workflow.json', import.meta.url);
const casesPath = new URL('../fixtures/marketplace/cases.json', import.meta.url);

test('the public CLI writes replay, ledger, and acceptance artifacts when cases are supplied', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'workflow-compiler-replay-'));

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
        outDir
      ],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const files = await readdir(outDir);
    assert.ok(files.includes('replay-report.json'));
    assert.ok(files.includes('evidence-ledger.json'));
    assert.ok(files.includes('acceptance-summary.json'));

    const summary = JSON.parse(await readFile(join(outDir, 'acceptance-summary.json'), 'utf8'));
    assert.deepEqual(
      {
        caseCount: summary.caseCount,
        counts: summary.counts,
        allExpectationsMatched: summary.allExpectationsMatched,
        insufficientEvidenceCovered: summary.requiredCoverage.insufficientEvidence,
        unknownActionCovered: summary.requiredCoverage.unknownAction
      },
      {
        caseCount: 5,
        counts: { pass: 1, approval_required: 1, blocked: 3 },
        allExpectationsMatched: true,
        insufficientEvidenceCovered: true,
        unknownActionCovered: true
      }
    );

    const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.files.length, 18);
    assert.ok(manifest.files.some((entry) => entry.path === 'governed-interaction.json'));
    assert.ok(manifest.files.some((entry) => entry.path === 'evidence-ledger.json'));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('the public CLI fails closed with structured diagnostics for malformed replay cases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-invalid-replay-'));
  const malformedCasesPath = join(root, 'cases.json');
  const outDir = join(root, 'output');

  try {
    await writeFile(
      malformedCasesPath,
      `${JSON.stringify({ schemaVersion: 'workflow_replay_manifest.v0.1', workflowId: 'invalid' })}\n`,
      'utf8'
    );
    const result = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'compile',
        '--workflow',
        workflowPath.pathname,
        '--cases',
        malformedCasesPath,
        '--out',
        outDir
      ],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      error: 'ReplayInputValidationError',
      code: 'INVALID_REPLAY_MANIFEST',
      diagnostics: [
        {
          code: 'REQUIRED_FIELD',
          path: '$.cases',
          message: 'Expected an array.'
        }
      ]
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
