import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTunnelConfig,
  DEFAULTS,
  parseArgs,
  validateConfig
} from '../codex-g2-cloudflare-access.mjs';

test('defaults encode the approved G2 Cloudflare Access posture', () => {
  assert.equal(DEFAULTS.hostname, 'codex-g2.createsomething.agency');
  assert.equal(DEFAULTS.tunnelName, 'create-something-codex-g2');
  assert.equal(DEFAULTS.origin, 'http://127.0.0.1:19931');
  assert.equal(DEFAULTS.protocol, 'http2');
  assert.equal(DEFAULTS.sessionDuration, '12h');
  assert.deepEqual(validateConfig(DEFAULTS), []);
});

test('rejects non-local origins and non-12h access sessions', () => {
  assert.deepEqual(validateConfig({ ...DEFAULTS, origin: 'https://example.com' }), [
    'origin must stay bound to 127.0.0.1, localhost, or ::1'
  ]);
  assert.deepEqual(validateConfig({ ...DEFAULTS, sessionDuration: '24h' }), [
    'G2 all-day access policy must use the approved 12h session duration'
  ]);
});

test('parses command options and renders Cloudflare tunnel ingress config', () => {
  const options = parseArgs([
    'config',
    '--origin',
    'http://localhost:3000',
    '--config-path=.tmp/custom.yml'
  ]);

  assert.equal(options.command, 'config');
  assert.equal(options.origin, 'http://localhost:3000');
  assert.equal(options.configPath, '.tmp/custom.yml');
  assert.match(buildTunnelConfig(options), /hostname: codex-g2\.createsomething\.agency/);
  assert.match(buildTunnelConfig(options), /protocol: http2/);
  assert.match(buildTunnelConfig(options), /service: http:\/\/localhost:3000/);
  assert.match(buildTunnelConfig(options), /http_status:404/);
});
