import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';

import { buildCmuxArgs, buildInnerCommand, createCommandFile, parseArgs, shellQuote } from '../cmux-ornith-lane.mjs';

test('cmux Ornith lane parses defaults as no-write local lane', () => {
  const options = parseArgs([]);
  assert.equal(options.name, 'Ornith Codebase Loop');
  assert.equal(options.model, 'ornith:9b');
  assert.equal(options.surface, 'docs/guides');
  assert.equal(options.limit, 3);
  assert.equal(options.timeoutMs, 60_000);
  assert.equal(options.batchTimeoutMs, 60_000);
});

test('cmux Ornith lane builds command with operator-agent gates', () => {
  const options = parseArgs([
    '--name',
    'Test Lane',
    '--surface',
    'docs',
    '--limit',
    '2',
    '--timeout-ms',
    '120000',
    '--batch-timeout-ms',
    '45000',
  ]);
  const command = buildInnerCommand(options, '/repo/root');
  assert.match(command, /operator-agent:doctor/);
  assert.match(command, /operator-agent:model-probe/);
  assert.match(command, /operator-agent:batch-eval/);
  assert.match(command, /--surface 'docs'/);
  assert.match(command, /--limit 2/);
  assert.match(command, /--timeout-ms 45000/);
  assert.match(command, /Batch-eval timeout: 45000ms/);
  assert.match(command, /fall back to deterministic candidates/);
  assert.match(command, /Authority: no-write scout\/probe\/batch-eval; Codex reviews patches/);
  assert.match(command, /authoritative improvement candidate comes from the operator-agent receipt above/i);
  assert.match(command, /Do not name files, propose edits, or claim repository inspection/i);
  assert.match(command, /cmux:ornith:receipt/);
});

test('cmux Ornith lane can skip slow model-backed steps', () => {
  const options = parseArgs(['--skip-probe', '--skip-batch-eval']);
  const command = buildInnerCommand(options, '/repo/root');
  assert.doesNotMatch(command, /operator-agent:model-probe/);
  assert.doesNotMatch(command, /^OPERATOR_AGENT_MODEL=.*operator-agent:batch-eval/m);
  assert.match(command, /operator-agent:doctor/);
});

test('cmux args use a workspace command and preserve cwd', () => {
  const options = parseArgs(['--no-focus']);
  const args = buildCmuxArgs(options, '/repo/root', '/tmp/cmux-ornith-lane/run.zsh');
  assert.deepEqual(args.slice(0, 3), ['workspace', 'create', '--name']);
  assert.ok(args.includes('/repo/root'));
  assert.ok(args.includes('false'));
  assert.ok(args.includes('--command'));
  assert.ok(args.includes("zsh '/tmp/cmux-ornith-lane/run.zsh'"));
});

test('shellQuote handles apostrophes', () => {
  assert.equal(shellQuote("Aaron's context"), "'Aaron'\\''s context'");
});

test('command file is executable zsh script', () => {
  const filePath = createCommandFile('echo ok');
  assert.equal(fs.readFileSync(filePath, 'utf8'), '#!/bin/zsh\necho ok\n');
  assert.equal(fs.statSync(filePath).mode & 0o700, 0o700);
});
