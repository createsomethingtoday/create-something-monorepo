import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RELAY_LAUNCH_LABEL,
  buildRelayLaunchAgentPlist
} from '../scripts/install-agent-relay-launch-agent.mjs';

test('builds a secret-free persistent Codex relay LaunchAgent', () => {
  const plist = buildRelayLaunchAgentPlist({
    infisicalExecutable: '/tools/infisical',
    pnpmExecutable: '/tools/pnpm',
    packageDirectory: '/workspace/repo/packages/calm-operator-ink-bridge',
    workspaceDirectory: '/workspace/repo',
    transcriberExecutable: '/workspace/repo/scripts/transcribe.mjs',
    homeDirectory: '/Users/operator',
    path: '/tools:/usr/bin:/bin',
    stdoutPath: '/private/logs/relay.log',
    stderrPath: '/private/logs/relay.error.log'
  });

  assert.match(plist, new RegExp(RELAY_LAUNCH_LABEL));
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /<string>--include-imports=true<\/string>/);
  assert.match(plist, /<key>INK_RELAY_PROVIDERS<\/key>\s*<string>codex<\/string>/);
  assert.match(plist, /<key>INK_AGENT_WORKDIR<\/key>\s*<string>\/workspace\/repo<\/string>/);
  assert.match(plist, /<key>OPERATOR_TRANSCRIBE_EXECUTABLE<\/key>/);
  assert.doesNotMatch(plist, /TOKEN|SECRET|Bearer/);
});
