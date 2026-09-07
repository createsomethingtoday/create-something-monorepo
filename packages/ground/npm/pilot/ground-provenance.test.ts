import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import test from 'node:test';
import { findWorkspaceRoot } from './workspace-root.ts';

const execFileAsync = promisify(execFile);
const require = createRequire(__filename);
const { version } = require('../package.json') as { version: string };

const workspace = findWorkspaceRoot(process.cwd());
const binaryPath =
  process.env.GROUND_BINARY ?? resolve(workspace, 'packages/ground/target/release/ground');

test('native CLI exposes machine-readable build provenance', async () => {
  const consumerDirectory = await mkdtemp(join(tmpdir(), 'ground-build-info-'));
  try {
    const { stdout } = await execFileAsync(binaryPath, ['build-info', '--json'], {
      cwd: consumerDirectory
    });
    const build = JSON.parse(stdout);

    assert.deepEqual(Object.keys(build).sort(), [
      'name',
      'receipt_schema_version',
      'source_sha',
      'target_triple',
      'version'
    ]);
    assert.equal(build.name, 'ground');
    assert.equal(build.version, version);
    assert.match(build.source_sha, /^(?:[0-9a-f]{40}|unknown)$/);
    assert.match(build.target_triple, /.+/);
    assert.equal(build.receipt_schema_version, 'ground-review-receipt.v1');
    assert.equal(existsSync(join(consumerDirectory, '.ground')), false);
  } finally {
    await rm(consumerDirectory, { recursive: true, force: true });
  }
});
