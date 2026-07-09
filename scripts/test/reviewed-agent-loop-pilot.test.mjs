import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyReviewedCodexCommandOverride,
  buildAccountBasedLoopEnv,
  parseArgs,
} from '../reviewed-agent-loop-pilot.mjs';

test('reviewed pilot CLI parses one exact issue and explicit dispatch mode', () => {
  assert.deepEqual(
    parseArgs(['node', 'script', '--issue', 'cre-1154', '--dispatch', '--json']),
    { issue: 'CRE-1154', dispatch: true, json: true },
  );
});

test('reviewed pilot CLI strips model keys but preserves Linear and shell credentials', () => {
  const { env, removedKeys } = buildAccountBasedLoopEnv({
    OPENAI_API_KEY: 'remove',
    TEAM_OPENAI_API_KEY: 'remove-too',
    ANTHROPIC_API_KEY: 'remove-three',
    LINEAR_API_KEY: 'keep',
    PATH: '/usr/bin',
  });

  assert.deepEqual(removedKeys, ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'TEAM_OPENAI_API_KEY']);
  assert.deepEqual(env, { LINEAR_API_KEY: 'keep', PATH: '/usr/bin' });
});

test('reviewed pilot CLI applies an explicit Codex app-server command override', () => {
  const config = { codex: { command: 'codex app-server', approval_policy: 'on-request' } };

  assert.deepEqual(
    applyReviewedCodexCommandOverride(config, {
      SYMPHONY_CODEX_COMMAND: '"/Applications/ChatGPT.app/Contents/Resources/codex" app-server',
    }),
    {
      codex: {
        command: '"/Applications/ChatGPT.app/Contents/Resources/codex" app-server',
        approval_policy: 'on-request',
      },
    },
  );
  assert.equal(applyReviewedCodexCommandOverride(config, {}).codex.command, 'codex app-server');
});
