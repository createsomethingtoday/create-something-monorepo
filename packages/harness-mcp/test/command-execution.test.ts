import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { updateIssue } from '../src/tools/beads.js';

test('issue notes are passed to bd as literal arguments without invoking a shell', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'harness-mcp-command-'));
  const binDir = join(fixtureRoot, 'bin');
  const capturePath = join(fixtureRoot, 'argv.jsonl');
  const injectionMarker = join(fixtureRoot, 'shell-injection-ran');
  const originalCwd = process.cwd();
  const originalPath = process.env.PATH;
  const originalCapturePath = process.env.HARNESS_TEST_CAPTURE;

  mkdirSync(join(fixtureRoot, '.beads'));
  mkdirSync(binDir);
  const fakeBdPath = join(binDir, 'bd');
  writeFileSync(
    fakeBdPath,
    '#!/usr/bin/env node\n' +
      "const fs = require('node:fs');\n" +
      "fs.appendFileSync(process.env.HARNESS_TEST_CAPTURE, JSON.stringify(process.argv.slice(2)) + '\\n');\n",
  );
  chmodSync(fakeBdPath, 0o755);

  try {
    process.chdir(fixtureRoot);
    process.env.PATH = `${binDir}:${originalPath ?? ''}`;
    process.env.HARNESS_TEST_CAPTURE = capturePath;

    const maliciousNotes = `status update\"; touch ${injectionMarker}; echo \"`;
    updateIssue('CRE-1634', { notes: maliciousNotes });

    assert.equal(existsSync(injectionMarker), false);
    const calls = readFileSync(capturePath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.deepEqual(calls, [['update', 'CRE-1634', '--notes', maliciousNotes]]);
  } finally {
    process.chdir(originalCwd);
    process.env.PATH = originalPath;
    if (originalCapturePath === undefined) delete process.env.HARNESS_TEST_CAPTURE;
    else process.env.HARNESS_TEST_CAPTURE = originalCapturePath;
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
