import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInnerCommand,
  buildZellijCommands,
  formatCommand,
  parseArgs,
  registryPath,
  shellQuote,
} from '../zellij-agent-lane.mjs';

test('zellij agent lane parses defaults', () => {
  const options = parseArgs([]);
  assert.equal(options.sessionName, 'create-something-agent');
  assert.equal(options.paneName, 'worker');
  assert.equal(options.command, 'zsh');
});

test('zellij agent lane parses custom command options', () => {
  const options = parseArgs([
    '--name',
    'claude-webflow',
    '--pane-name',
    'claude',
    '--cwd',
    '/tmp',
    '--command',
    'claude',
  ]);
  assert.equal(options.sessionName, 'claude-webflow');
  assert.equal(options.paneName, 'claude');
  assert.equal(options.cwd, '/tmp');
  assert.equal(options.command, 'claude');
});

test('zellij commands expose create, inspect, stream, send, and attach primitives', () => {
  const options = parseArgs(['--name', 'agent-lane', '--pane-name', 'worker', '--cwd', '/repo', '--command', 'echo ok']);
  const commands = buildZellijCommands(options, '/tmp/run.zsh');
  assert.deepEqual(commands.createSession, ['zellij', 'attach', '--create-background', 'agent-lane']);
  assert.deepEqual(commands.createPane.slice(0, 8), [
    'zellij',
    '--session',
    'agent-lane',
    'action',
    'new-pane',
    '--name',
    'worker',
    '--cwd',
  ]);
  assert.equal(commands.createPane.at(-1), '/tmp/run.zsh');
  assert.ok(commands.dumpScreen.includes('dump-screen'));
  assert.ok(commands.streamJson.includes('subscribe'));
  assert.ok(commands.sendText.includes('paste'));
  assert.ok(commands.sendEnter.includes('send-keys'));
  assert.deepEqual(commands.attach, ['zellij', 'attach', 'agent-lane']);
});

test('inner command marks authority and execs requested command', () => {
  const options = parseArgs(['--name', 'agent-lane', '--pane-name', 'worker', '--cwd', '/repo', '--command', 'echo ok']);
  const command = buildInnerCommand(options);
  assert.match(command, /CREATE SOMETHING \/ Zellij agent cockpit/);
  assert.match(command, /Codex\/operator owns done/);
  assert.match(command, /exec zsh -lc 'echo ok'/);
});

test('shellQuote handles single quotes', () => {
  assert.equal(shellQuote("can't"), "'can'\\''t'");
});

test('formatCommand pins the short zellij socket directory', () => {
  assert.equal(formatCommand(['zellij', 'attach', 'agent']), "ZELLIJ_SOCKET_DIR='/tmp/zellij' 'zellij' 'attach' 'agent'");
});

test('registry path lives under .codex in the lane cwd', () => {
  assert.equal(registryPath('/repo'), '/repo/.codex/zellij-agent-lanes.json');
});
