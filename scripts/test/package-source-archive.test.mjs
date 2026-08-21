import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CLI = fileURLToPath(new URL('../package-source-archive.mjs', import.meta.url));

async function writeFixture(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

async function createWorkspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-test-'));
  t.after(() => rm(root, { force: true, recursive: true }));

  await writeFixture(
    path.join(root, 'package.json'),
    JSON.stringify({ name: '@fixture/root', private: true, packageManager: 'pnpm@9.15.0' })
  );
  await writeFixture(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
  await writeFixture(path.join(root, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  await writeFixture(path.join(root, '.gitignore'), 'node_modules/\ndist/\n');
  await writeFixture(
    path.join(root, 'packages/app/package.json'),
    JSON.stringify({ name: '@fixture/app', dependencies: { '@fixture/lib': 'workspace:*' } })
  );
  await writeFixture(
    path.join(root, 'packages/app/src/index.js'),
    "export { value } from '@fixture/lib';\n"
  );
  await writeFixture(path.join(root, 'packages/app/.npmrc'), 'engine-strict=true\n');
  await writeFixture(
    path.join(root, 'packages/lib/package.json'),
    JSON.stringify({ name: '@fixture/lib', version: '1.0.0' })
  );
  await writeFixture(path.join(root, 'packages/lib/src/index.js'), 'export const value = 42;\n');
  await writeFixture(
    path.join(root, 'packages/unrelated/package.json'),
    JSON.stringify({ name: '@fixture/unrelated', version: '1.0.0' })
  );
  await writeFixture(
    path.join(root, 'packages/unrelated/src/index.js'),
    'export const unrelated = true;\n'
  );
  await writeFixture(path.join(root, 'packages/app/dist/leak.js'), 'generated\n');

  await execFileAsync('git', ['init', '--quiet'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['add', '--force', 'packages/app/dist/leak.js'], { cwd: root });
  await writeFixture(
    path.join(root, 'packages/app/src/untracked.js'),
    'export const local = true;\n'
  );

  return root;
}

test('archives one package closure without unrelated packages or generated output', async (t) => {
  const root = await createWorkspace(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-output-'));
  t.after(() => rm(outputRoot, { force: true, recursive: true }));
  const archivePath = path.join(outputRoot, 'app-source.tar.gz');

  await execFileAsync(
    process.execPath,
    [
      CLI,
      '--root',
      root,
      '--package',
      '@fixture/app',
      '--output',
      archivePath,
      '--reserve-bytes',
      '0'
    ],
    { cwd: root }
  );

  const { stdout: listing } = await execFileAsync('tar', ['-tzf', archivePath]);
  const files = listing.trim().split('\n').sort();

  assert.ok(files.includes('package.json'));
  assert.ok(files.includes('pnpm-lock.yaml'));
  assert.ok(files.includes('pnpm-workspace.yaml'));
  assert.ok(files.includes('packages/app/src/index.js'));
  assert.ok(files.includes('packages/app/src/untracked.js'));
  assert.ok(files.includes('packages/app/.npmrc'));
  assert.ok(files.includes('packages/lib/src/index.js'));
  assert.ok(!files.some((file) => file.startsWith('packages/unrelated/')));
  assert.ok(!files.some((file) => file.includes('/dist/')));

  const manifest = JSON.parse(await readFile(`${archivePath}.manifest.json`, 'utf8'));
  assert.deepEqual(manifest.workspacePackages, ['@fixture/app', '@fixture/lib']);
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    files
  );

  const archive = await readFile(archivePath);
  const expectedHash = createHash('sha256').update(archive).digest('hex');
  assert.equal(
    await readFile(`${archivePath}.sha256`, 'utf8'),
    `${expectedHash}  app-source.tar.gz\n`
  );
});

test('fails disk preflight without leaving archive or lock files', async (t) => {
  const root = await createWorkspace(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-output-'));
  t.after(() => rm(outputRoot, { force: true, recursive: true }));
  const archivePath = path.join(outputRoot, 'app-source.tar.gz');
  const lockPath = path.join(outputRoot, 'archive.lock');

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        CLI,
        '--root',
        root,
        '--package',
        '@fixture/app',
        '--output',
        archivePath,
        '--reserve-bytes',
        '8000000000000000'
      ],
      { cwd: root, env: { ...process.env, PACKAGE_SOURCE_ARCHIVE_LOCK: lockPath } }
    ),
    (error) => {
      assert.match(error.stderr, /Insufficient disk space/);
      return true;
    }
  );

  await assert.rejects(access(archivePath));
  await assert.rejects(access(lockPath));
  assert.deepEqual(await readdir(outputRoot), []);
});

test('refuses a concurrent archive without deleting the active lock', async (t) => {
  const root = await createWorkspace(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-output-'));
  t.after(() => rm(outputRoot, { force: true, recursive: true }));
  const archivePath = path.join(outputRoot, 'app-source.tar.gz');
  const lockPath = path.join(outputRoot, 'archive.lock');
  await writeFile(lockPath, 'owned by another archive\n');

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        CLI,
        '--root',
        root,
        '--package',
        '@fixture/app',
        '--output',
        archivePath,
        '--reserve-bytes',
        '0'
      ],
      { cwd: root, env: { ...process.env, PACKAGE_SOURCE_ARCHIVE_LOCK: lockPath } }
    ),
    (error) => {
      assert.match(error.stderr, /Another package archive is active/);
      return true;
    }
  );

  await assert.rejects(access(archivePath));
  assert.equal(await readFile(lockPath, 'utf8'), 'owned by another archive\n');
});

test('fails closed when the selected source contains a credential-like file', async (t) => {
  const root = await createWorkspace(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-output-'));
  t.after(() => rm(outputRoot, { force: true, recursive: true }));
  const archivePath = path.join(outputRoot, 'app-source.tar.gz');
  await writeFixture(path.join(root, 'packages/app/.env.production'), 'TOKEN=do-not-package\n');

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        CLI,
        '--root',
        root,
        '--package',
        '@fixture/app',
        '--output',
        archivePath,
        '--reserve-bytes',
        '0'
      ],
      { cwd: root }
    ),
    (error) => {
      assert.match(error.stderr, /Credential-like file/);
      return true;
    }
  );
  await assert.rejects(access(archivePath));
});

test('allows ordinary npm settings but rejects npm authentication fields', async (t) => {
  const root = await createWorkspace(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'package-source-archive-output-'));
  t.after(() => rm(outputRoot, { force: true, recursive: true }));
  const archivePath = path.join(outputRoot, 'app-source.tar.gz');
  await writeFixture(
    path.join(root, 'packages/app/.npmrc'),
    'engine-strict=true\n//registry.npmjs.org/:_authToken=do-not-package\n'
  );

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        CLI,
        '--root',
        root,
        '--package',
        '@fixture/app',
        '--output',
        archivePath,
        '--reserve-bytes',
        '0'
      ],
      { cwd: root }
    ),
    (error) => {
      assert.match(error.stderr, /Credential-like npm configuration/);
      return true;
    }
  );
  await assert.rejects(access(archivePath));
});
