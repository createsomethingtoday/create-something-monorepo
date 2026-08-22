import assert from 'node:assert/strict';
import {
  chmod,
  chown,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const packageRoot = new URL('..', import.meta.url);
const fixturePath = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('the public CLI writes a deterministic linked artifact inventory', async () => {
  const first = await mkdtemp(join(tmpdir(), 'workflow-compiler-first-'));
  const second = await mkdtemp(join(tmpdir(), 'workflow-compiler-second-'));

  try {
    for (const outDir of [first, second]) {
      const result = spawnSync(
        process.execPath,
        ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
        { cwd: packageRoot, encoding: 'utf8' }
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }

    const expectedFiles = [
      'agent-contracts.json',
      'approval-surfaces.json',
      'compiled-workflow.json',
      'decision-inventory.json',
      'evaluation-manifest.json',
      'event-schemas.json',
      'governed-interaction.json',
      'manifest.json',
      'object-schemas.json',
      'runtime-targets.json',
      'tool-contracts.json',
      'workflow-map.json'
    ];
    assert.deepEqual((await readdir(first)).sort(), expectedFiles);
    assert.deepEqual((await readdir(second)).sort(), expectedFiles);

    for (const file of expectedFiles) {
      assert.equal(
        await readFile(join(first, file), 'utf8'),
        await readFile(join(second, file), 'utf8')
      );
    }

    await writeFile(join(first, 'obsolete-artifact.json'), '{}\n', 'utf8');
    const replacement = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', first],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(replacement.status, 0, replacement.stderr || replacement.stdout);
    assert.deepEqual((await readdir(first)).sort(), expectedFiles);

    const manifest = JSON.parse(await readFile(join(first, 'manifest.json'), 'utf8'));
    assert.equal(manifest.schemaVersion, 'workflow_artifact_manifest.v0.1');
    assert.equal(manifest.files.length, 11);
    assert.ok(manifest.files.every((entry) => /^sha256:[a-f0-9]{64}$/.test(entry.hash)));
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});

test('the public CLI fails closed with structured diagnostics for a malformed workflow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-invalid-'));
  const workflowPath = join(root, 'workflow.json');
  const outDir = join(root, 'output');

  try {
    await writeFile(
      workflowPath,
      `${JSON.stringify({ schemaVersion: 'workflow_definition.v0.1', workflowId: 'invalid' })}\n`,
      'utf8'
    );
    const result = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', workflowPath, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      error: 'WorkflowInputValidationError',
      code: 'INVALID_WORKFLOW_DEFINITION',
      diagnostics: [
        {
          code: 'REQUIRED_FIELD',
          path: '$.actions',
          message: 'Expected an array.'
        }
      ]
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the public CLI reports invalid JSON without leaking parser implementation details', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-invalid-json-'));
  const workflowPath = join(root, 'workflow.json');

  try {
    await writeFile(workflowPath, '{ invalid json\n', 'utf8');
    const result = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', workflowPath, '--out', join(root, 'output')],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      error: 'WorkflowCliInputError',
      code: 'INVALID_JSON',
      input: 'workflow',
      message: 'Workflow definition is not valid JSON.'
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the public CLI rejects the filesystem root as an artifact output path', () => {
  const result = spawnSync(
    process.execPath,
    [
      'dist/cli.js',
      'compile',
      '--workflow',
      fixturePath.pathname,
      '--out',
      parse(packageRoot.pathname).root
    ],
    { cwd: packageRoot, encoding: 'utf8' }
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), {
    ok: false,
    error: 'WorkflowArtifactOutputError',
    code: 'UNSAFE_OUTPUT_PATH',
    message: 'The filesystem root cannot be used as a workflow artifact output directory.'
  });
});

test('the public CLI returns a structured usage error for incomplete arguments', () => {
  const result = spawnSync(
    process.execPath,
    ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname],
    { cwd: packageRoot, encoding: 'utf8' }
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(result.stdout, '');
  const error = JSON.parse(result.stderr);
  assert.equal(error.ok, false);
  assert.equal(error.error, 'WorkflowCliUsageError');
  assert.equal(error.code, 'INVALID_ARGUMENTS');
  assert.match(error.usage, /^Usage:\n  workflow-compiler compile/);
});

test('the public CLI refuses to replace a non-empty directory it does not own', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-unowned-output-'));
  const outDir = join(root, 'output');
  const protectedPath = join(outDir, 'keep.txt');

  try {
    await mkdir(outDir);
    await writeFile(protectedPath, 'operator data\n', 'utf8');
    const result = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(await readFile(protectedPath, 'utf8'), 'operator data\n');
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      error: 'WorkflowArtifactOutputError',
      code: 'OUTPUT_NOT_OWNED',
      message:
        'Refusing to replace a non-empty output directory without a workflow compiler manifest.'
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const mode of [0o700, 0o500]) {
  test(`atomic replacement preserves output directory mode ${mode.toString(8)}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-output-mode-'));
    const outDir = join(root, 'output');

    try {
      const initial = spawnSync(
        process.execPath,
        ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
        { cwd: packageRoot, encoding: 'utf8' }
      );
      assert.equal(initial.status, 0, initial.stderr || initial.stdout);
      await chmod(outDir, mode);

      const replacement = spawnSync(
        process.execPath,
        ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
        { cwd: packageRoot, encoding: 'utf8' }
      );

      assert.equal(replacement.status, 0, replacement.stderr || replacement.stdout);
      assert.equal((await stat(outDir)).mode & 0o777, mode);
    } finally {
      await chmod(outDir, 0o700).catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  });
}

const alternateGroupId = (process.getgroups?.() ?? []).find(
  (groupId) => groupId !== process.getgid?.()
);

test(
  'atomic replacement preserves output directory group ownership',
  { skip: alternateGroupId === undefined || process.getuid === undefined },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-output-owner-'));
    const outDir = join(root, 'output');

    try {
      const initial = spawnSync(
        process.execPath,
        ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
        { cwd: packageRoot, encoding: 'utf8' }
      );
      assert.equal(initial.status, 0, initial.stderr || initial.stdout);
      await chown(outDir, process.getuid(), alternateGroupId);

      const replacement = spawnSync(
        process.execPath,
        ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', outDir],
        { cwd: packageRoot, encoding: 'utf8' }
      );

      assert.equal(replacement.status, 0, replacement.stderr || replacement.stdout);
      assert.equal((await stat(outDir)).gid, alternateGroupId);
      assert.equal((await stat(join(outDir, 'manifest.json'))).gid, alternateGroupId);
      assert.equal((await stat(join(outDir, 'compiled-workflow.json'))).gid, alternateGroupId);
    } finally {
      await chmod(outDir, 0o700).catch(() => undefined);
      await rm(root, { recursive: true, force: true });
    }
  }
);

test('the public CLI refuses to replace an output directory through a symbolic link', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-compiler-output-link-'));
  const targetDir = join(root, 'target');
  const linkedDir = join(root, 'linked-output');

  try {
    const initial = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', targetDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );
    assert.equal(initial.status, 0, initial.stderr || initial.stdout);
    await symlink(targetDir, linkedDir, 'dir');

    const replacement = spawnSync(
      process.execPath,
      ['dist/cli.js', 'compile', '--workflow', fixturePath.pathname, '--out', linkedDir],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    assert.equal(replacement.status, 2, replacement.stderr || replacement.stdout);
    assert.deepEqual(JSON.parse(replacement.stderr), {
      ok: false,
      error: 'WorkflowArtifactOutputError',
      code: 'OUTPUT_NOT_OWNED',
      message: 'Refusing to replace an output path that is not a workflow compiler directory.'
    });
    assert.equal((await stat(join(targetDir, 'manifest.json'))).isFile(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
