import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const packageRoot = new URL('..', import.meta.url);

function run(...args) {
  return spawnSync(process.execPath, ['dist/cli.js', ...args], {
    cwd: packageRoot,
    encoding: 'utf8'
  });
}

test('the public CLI scaffolds and proves a local-only paired-agent runbook without overwriting content', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'workflow-compiler-builder-'));
  const starterDir = join(scratch, 'daily-brief');

  try {
    const initialized = run('init', '--template', 'local-runbook', '--dir', starterDir);
    assert.equal(initialized.status, 0, initialized.stderr || initialized.stdout);
    assert.deepEqual(JSON.parse(initialized.stdout), {
      ok: true,
      command: 'init',
      template: 'local-runbook',
      dir: starterDir,
      files: ['PLAYBOOK.md', 'README.md', 'RUNBOOK.md', 'cases.json', 'workflow.json'],
      next: [
        'workflow-compiler validate --workflow workflow.json',
        'workflow-compiler simulate --workflow workflow.json --cases cases.json',
        'workflow-compiler explain --workflow workflow.json --cases cases.json'
      ]
    });
    assert.deepEqual((await readdir(starterDir)).sort(), [
      'PLAYBOOK.md',
      'README.md',
      'RUNBOOK.md',
      'cases.json',
      'workflow.json'
    ]);

    const [playbook, runbook, readme] = await Promise.all([
      readFile(join(starterDir, 'PLAYBOOK.md'), 'utf8'),
      readFile(join(starterDir, 'RUNBOOK.md'), 'utf8'),
      readFile(join(starterDir, 'README.md'), 'utf8')
    ]);
    assert.match(playbook, /paired Codex agent/i);
    assert.match(runbook, /does not execute live actions/i);
    assert.match(readme, /local-only/i);

    const validated = run('validate', '--workflow', join(starterDir, 'workflow.json'));
    assert.equal(validated.status, 0, validated.stderr || validated.stdout);
    const validation = JSON.parse(validated.stdout);
    assert.deepEqual(
      {
        ok: validation.ok,
        command: validation.command,
        workflowId: validation.workflowId,
        decisionCount: validation.decisionCount,
        externalMutations: validation.externalMutations
      },
      {
        ok: true,
        command: 'validate',
        workflowId: 'operations.local.runbook',
        decisionCount: 3,
        externalMutations: false
      }
    );
    assert.match(validation.definitionHash, /^sha256:[a-f0-9]{64}$/);

    const simulated = run(
      'simulate',
      '--workflow',
      join(starterDir, 'workflow.json'),
      '--cases',
      join(starterDir, 'cases.json')
    );
    assert.equal(simulated.status, 0, simulated.stderr || simulated.stdout);
    assert.deepEqual(JSON.parse(simulated.stdout).outcomes, {
      pass: 1,
      approval_required: 1,
      blocked: 1
    });

    const explained = run(
      'explain',
      '--workflow',
      join(starterDir, 'workflow.json'),
      '--cases',
      join(starterDir, 'cases.json')
    );
    assert.equal(explained.status, 0, explained.stderr || explained.stdout);
    assert.match(explained.stdout, /# Local operating runbook/);
    assert.match(explained.stdout, /## Run/);
    assert.match(explained.stdout, /## Wait/);
    assert.match(explained.stdout, /## Stop/);
    assert.match(explained.stdout, /No live action is executed/);

    const refused = run('init', '--template', 'local-runbook', '--dir', starterDir);
    assert.equal(refused.status, 2, refused.stderr || refused.stdout);
    assert.match(refused.stderr, /already exists/i);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
