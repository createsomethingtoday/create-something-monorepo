import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs, parsePaneListOutput, renderText, stripAnsi } from '../zellij-agent-board.mjs';

test('zellij board parses watch and json options', () => {
  const options = parseArgs(['--', '--watch', '--json', '--interval-ms', '1000', '--registry', '/tmp/lanes.json']);
  assert.equal(options.watch, true);
  assert.equal(options.json, true);
  assert.equal(options.intervalMs, 1000);
  assert.equal(options.registry, '/tmp/lanes.json');
});

test('zellij board renders empty state with start command', () => {
  const text = renderText([]);
  assert.match(text, /Zellij Agent Board/);
  assert.match(text, /No active or registered Zellij agent lanes/);
  assert.match(text, /pnpm zellij:claude/);
});

test('zellij board renders lane cards', () => {
  const text = renderText([
    {
      session: 'claude-webflow',
      status: 'active',
      registered: true,
      paneId: 'terminal_0',
      paneName: 'claude',
      command: 'claude',
      cwd: '/repo',
      createdAt: '2026-07-08T00:00:00.000Z',
      attach: 'zellij attach claude-webflow',
      inspect: 'zellij dump',
      streamJson: 'zellij subscribe',
    },
  ]);
  assert.match(text, /\* claude-webflow/);
  assert.match(text, /status: active/);
  assert.match(text, /pane: claude \/ terminal_0/);
  assert.match(text, /stream: zellij subscribe/);
});

test('zellij board strips ansi before parsing command output', () => {
  assert.equal(stripAnsi('\u001b[32;1mbrave-xylophone\u001b[0m'), 'brave-xylophone');
});

test('zellij board treats non-json pane output as an unavailable session', () => {
  const result = parsePaneListOutput('brave-ocelot\nquadratic-jellyfish');
  assert.equal(result.ok, false);
  assert.deepEqual(result.panes, []);
  assert.match(result.error, /not attachable/);
});
