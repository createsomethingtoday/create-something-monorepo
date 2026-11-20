import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanRepository } from './scan.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'workflow-scan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'root',
      scripts: { test: 'private-token-command', build: 'private-build-command' }
    })
  );
  return root;
}
async function put(root, path, value) {
  const target = join(root, path);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, typeof value === 'string' ? value : JSON.stringify(value));
}

test('discovers direct package scripts and canonical workflows deterministically without exposing commands', async (t) => {
  const root = await fixture(t);
  await put(root, 'packages/z/package.json', {
    name: '@fixture/z',
    scripts: { z: 'private-z', a: 'private-a' }
  });
  await put(root, 'apps/a/package.json', { name: '@fixture/a' });
  await put(root, 'packages/z/workflows/real/workflow.json', {
    schemaVersion: 'workflow_definition.v0.3',
    id: 'real'
  });
  await put(root, 'packages/z/fixtures/workflow.json', { id: 'ignored' });
  await put(root, '.github/workflows/check.yaml', 'name: check\n');
  await put(root, 'node_modules/hidden/package.json', { name: 'ignored' });
  const before = await readFile(join(root, 'package.json'));
  const result = await scanRepository(root);
  assert.deepEqual(result, await scanRepository(root));
  assert.equal(result.schema, 'workflow-discovery-inventory@1');
  assert.deepEqual(
    result.packages.map((item) => item.path),
    ['apps/a/package.json', 'package.json', 'packages/z/package.json']
  );
  assert.deepEqual(result.packages.find((item) => item.name === 'root').scriptNames, [
    'build',
    'test'
  ]);
  assert.equal(JSON.stringify(result).includes('private-'), false);
  assert.deepEqual(
    result.workflows.map((item) => item.path),
    ['packages/z/workflows/real/workflow.json']
  );
  assert.equal(result.workflows[0].definition.id, 'real');
  assert.deepEqual(
    result.githubWorkflows.map((item) => item.path),
    ['.github/workflows/check.yaml']
  );
  assert.equal(
    result.packages.find((item) => item.name === 'root').sha256,
    `sha256:${createHash('sha256').update(before).digest('hex')}`
  );
  assert.deepEqual(await readFile(join(root, 'package.json')), before);
  assert.match(result.digest, /^sha256:[a-f0-9]{64}$/);
});

test('automatically discovers a newly added direct package without changing scanner configuration', async (t) => {
  const root = await fixture(t);
  const first = await scanRepository(root);
  await put(root, 'packages/new/package.json', {
    name: 'new',
    scripts: { check: 'private-command' }
  });
  const second = await scanRepository(root);
  assert.equal(second.packages.length, first.packages.length + 1);
  assert.notEqual(second.digest, first.digest);
});

test('rejects symlink package directories, source files, and workflow directories escaping the root', async (t) => {
  for (const kind of [
    'package-directory',
    'source-file',
    'workflow-directory',
    'github-directory'
  ]) {
    const root = await fixture(t);
    const outside = await mkdtemp(join(tmpdir(), 'workflow-scan-outside-'));
    t.after(() => rm(outside, { recursive: true, force: true }));
    await writeFile(join(outside, 'package.json'), JSON.stringify({ name: 'outside' }));
    if (kind === 'package-directory') {
      await mkdir(join(root, 'packages'));
      await symlink(outside, join(root, 'packages/link'));
    } else if (kind === 'source-file') {
      await mkdir(join(root, 'apps/link'), { recursive: true });
      await symlink(join(outside, 'package.json'), join(root, 'apps/link/package.json'));
    } else if (kind === 'workflow-directory') {
      await mkdir(join(root, 'packages/a/workflows'), { recursive: true });
      await symlink(outside, join(root, 'packages/a/workflows/link'));
    } else {
      await symlink(outside, join(root, '.github'));
    }
    await assert.rejects(() => scanRepository(root), /symlink|unsafe/i);
  }
});

test('rejects malformed JSON and package shape without revealing source snippets', async (t) => {
  const root = await fixture(t);
  for (const content of [
    '{"private-secret":"bad',
    '[]',
    '{"name":"valid","scripts":{"test":42}}'
  ]) {
    await put(root, 'packages/broken/package.json', content);
    await assert.rejects(
      () => scanRepository(root),
      (error) =>
        /packages\/broken\/package.json/.test(error.message) &&
        !/private-secret/.test(error.message)
    );
  }
  await put(root, 'packages/broken/package.json', { name: 'valid' });
  await put(root, 'packages/broken/workflows/bad/workflow.json', 'null');
  await assert.rejects(() => scanRepository(root), /workflow\.json/);
});

test('fails closed on source count, per-file byte, and total byte limits', async (t) => {
  const root = await fixture(t);
  await put(root, 'apps/a/package.json', { name: 'a' });
  await assert.rejects(() => scanRepository(root, { maximumSources: 1 }), /limit/i);
  await put(root, '.github/workflows/large.yml', 'x'.repeat(1024 * 1024 + 1));
  await assert.rejects(() => scanRepository(root), /limit/i);
  await rm(join(root, '.github/workflows/large.yml'));
  for (let index = 0; index < 17; index++)
    await put(root, `.github/workflows/large-${index}.yml`, 'x'.repeat(1024 * 1024));
  await assert.rejects(() => scanRepository(root), /total.*limit/i);
  for (const maximumSources of [0, -1, 1.5, Infinity])
    await assert.rejects(() => scanRepository(root, { maximumSources }), /maximumSources/i);
});
