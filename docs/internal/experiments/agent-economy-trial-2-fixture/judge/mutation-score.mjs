import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const subjectRoot = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('subject root argument is required');

const judgeRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const agentTest = join(subjectRoot, 'test/canonical-tool-name.test.mjs');
const correctSource = join(subjectRoot, 'src/canonical-tool-name.mjs');
const mutants = [
  'no-trim.mjs',
  'no-lowercase.mjs',
  'leading-digit.mjs',
  'no-length-limit.mjs',
  'wrong-nonstring.mjs',
];

async function runVariant(sourcePath, name) {
  const scratch = await mkdtemp(join(tmpdir(), 'agent-economy-mutation-'));
  try {
    await mkdir(join(scratch, 'src'));
    await mkdir(join(scratch, 'test'));
    await cp(sourcePath, join(scratch, 'src/canonical-tool-name.mjs'));
    await cp(agentTest, join(scratch, 'test/canonical-tool-name.test.mjs'));
    const result = spawnSync(
      process.execPath,
      ['--test', 'test/canonical-tool-name.test.mjs'],
      { cwd: scratch, encoding: 'utf8' },
    );
    return {
      name,
      exitCode: result.status,
      passed: result.status === 0,
      output: `${result.stdout}${result.stderr}`.trim(),
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

const baseline = await runVariant(correctSource, 'baseline');
const results = [];
for (const mutant of mutants) {
  results.push(await runVariant(join(judgeRoot, 'mutants', mutant), basename(mutant, '.mjs')));
}

const killed = results.filter((result) => !result.passed).length;
process.stdout.write(
  `${JSON.stringify(
    {
      ok: baseline.passed && killed === mutants.length,
      baselinePassed: baseline.passed,
      killed,
      totalMutants: mutants.length,
      mutants: results.map(({ name, passed, exitCode }) => ({ name, killed: !passed, exitCode })),
    },
    null,
    2,
  )}\n`,
);
process.exitCode = baseline.passed && killed === mutants.length ? 0 : 1;
