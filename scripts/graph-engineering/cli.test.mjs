import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createFixture } from './fixtures.mjs';
const exec = promisify(execFile);
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url));

test('CLI projects local inputs to stdout and leaves source files unchanged', async () => {
  const fixture = await createFixture();
  const root = await mkdtemp(join(tmpdir(), 'graph-cli-'));
  try {
    const input = join(root, 'input.json');
    const key = join(root, 'trusted.pem');
    const serialized = JSON.stringify(fixture.input);
    await writeFile(input, serialized);
    await writeFile(key, fixture.trustedPublicKey);
    const args = [cli, 'project', '--input', input, '--trusted-key', key];
    const first = await exec(process.execPath, args);
    assert.equal(first.stderr, '');
    assert.equal(JSON.parse(first.stdout).authority, 'read_only');
    assert.equal((await exec(process.execPath, args)).stdout, first.stdout);
    // Real export projection succeeds with filesystem writes and process spawning denied.
    const restricted = await exec(process.execPath, [
      '--experimental-permission',
      '--allow-fs-read=*',
      ...args
    ]);
    assert.equal(restricted.stdout, first.stdout);
    assert.equal(await readFile(input, 'utf8'), serialized);
    assert.equal(await readFile(key, 'utf8'), fixture.trustedPublicKey);
    assert.deepEqual((await readdir(root)).sort(), ['input.json', 'trusted.pem']);
    await assert.rejects(
      () => exec(process.execPath, [...args, '--execute']),
      (error) => error.stdout === '' && /Usage/.test(error.stderr)
    );
    fixture.input.runtime.run.status = 'completed';
    await writeFile(input, JSON.stringify(fixture.input));
    await assert.rejects(
      () => exec(process.execPath, args),
      (error) => error.stdout === '' && error.code === 1
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('demo labels synthetic evidence and includes separate task, coordination, and runtime views', async () => {
  const { stdout } = await exec(process.execPath, [cli, 'demo']);
  const demonstration = JSON.parse(stdout);
  assert.equal(demonstration.evidence, 'synthetic_no_live_execution');
  assert.ok(demonstration.graph.nodes.some((node) => node.kind === 'task'));
  assert.ok(demonstration.graph.nodes.some((node) => node.kind === 'assignment'));
  assert.ok(demonstration.graph.nodes.some((node) => node.kind === 'receipt'));
});
