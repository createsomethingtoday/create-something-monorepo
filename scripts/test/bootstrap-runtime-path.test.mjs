import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('bootstrap preserves the selected pinned runtime ahead of fallback tools', () => {
  const root = mkdtempSync(join(tmpdir(), 'agency-bootstrap-path-'));
  try {
    const selected = join(root, 'selected'), fallback = join(root, 'fallback');
    const scripts = join(root, '.ona', 'scripts');
    for (const path of [selected, fallback, scripts]) mkdirSync(path, { recursive: true });
    const pin = readFileSync(new URL('../../.nvmrc', import.meta.url), 'utf8').trim();
    writeFileSync(join(selected, 'node'), `#!/bin/sh\necho v${pin}\n`, { mode: 0o755 });
    writeFileSync(join(fallback, 'node'), '#!/bin/sh\necho v22.23.3\n', { mode: 0o755 });
    // Stop before dependency installation. Reaching corepack proves that the
    // real bootstrap passed its runtime check using the selected toolchain.
    writeFileSync(join(selected, 'corepack'), '#!/bin/sh\nexit 73\n', { mode: 0o755 });
    const source = readFileSync(new URL('../../.ona/scripts/bootstrap.sh', import.meta.url), 'utf8')
      .replaceAll('/usr/local/bin', fallback).replaceAll('/usr/local/sbin', fallback);
    const script = join(scripts, 'bootstrap.sh');
    writeFileSync(script, source);
    const result = spawnSync('/bin/bash', [script], {
      encoding: 'utf8', env: { ...process.env, PATH: `${selected}:${process.env.PATH}` }
    });
    assert.equal(result.status, 73, `Selected runtime must survive PATH setup: ${result.stderr}`);
    assert.doesNotMatch(result.stderr, /Expected Node .* found/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
