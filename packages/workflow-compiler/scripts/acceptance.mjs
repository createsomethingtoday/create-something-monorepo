import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(packageRoot, 'fixtures', 'marketplace', 'workflow.json');
const casesPath = join(packageRoot, 'fixtures', 'marketplace', 'cases.json');
const stableOutput = resolve(
  process.env.WORKFLOW_COMPILER_ACCEPTANCE_OUT ??
    join(tmpdir(), 'cre-1191-workflow-compiler-acceptance'),
);

async function filesUnder(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, relative)));
    else files.push(relative);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function compile(outDir) {
  const result = spawnSync(
    process.execPath,
    [
      'dist/cli.js',
      'compile',
      '--workflow',
      workflowPath,
      '--cases',
      casesPath,
      '--out',
      outDir,
    ],
    { cwd: packageRoot, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

const scratch = await mkdtemp(join(tmpdir(), 'workflow-compiler-acceptance-'));
const first = join(scratch, 'first');
const second = join(scratch, 'second');

try {
  compile(first);
  compile(second);
  const firstFiles = await filesUnder(first);
  const secondFiles = await filesUnder(second);
  assert.deepEqual(firstFiles, secondFiles);
  for (const file of firstFiles) {
    assert.equal(
      await readFile(join(first, file), 'utf8'),
      await readFile(join(second, file), 'utf8'),
      `${file} was not deterministic`,
    );
  }

  const summary = JSON.parse(await readFile(join(first, 'acceptance-summary.json'), 'utf8'));
  assert.equal(summary.allExpectationsMatched, true);
  assert.equal(summary.governanceComplete, true);
  assert.equal(summary.caseCount, 5);
  assert.deepEqual(summary.counts, { pass: 1, approval_required: 1, blocked: 3 });
  assert.ok(Object.values(summary.requiredCoverage).every(Boolean));

  const manifest = JSON.parse(await readFile(join(first, 'manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 18);
  assert.ok(manifest.files.some((entry) => entry.path === 'governed-interaction.json'));
  assert.ok(
    manifest.files.every(
      (entry) => typeof entry.path === 'string' && /^sha256:[a-f0-9]{64}$/.test(entry.hash),
    ),
  );

  await rm(stableOutput, { recursive: true, force: true });
  await cp(first, stableOutput, { recursive: true });
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        deterministic: true,
        outputDir: stableOutput,
        consoleDir: join(stableOutput, 'operator-console'),
        artifactCount: manifest.files.length,
        summary,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
