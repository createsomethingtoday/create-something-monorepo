import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULTS,
  REQUIRED_GATEWAY_MODES,
  isPidRunning,
  parseArgs,
  serviceDefinitions,
  validateGatewayHealth,
} from '../operator-agent-runtime.mjs';

test('operator-agent runtime defaults to status with Infisical local-gateway path', () => {
  const options = parseArgs([]);
  assert.equal(options.command, 'status');
  assert.equal(options.infisicalEnv, 'prod');
  assert.equal(options.infisicalPath, '/operator-agent/local-gateway');
  assert.equal(options.gatewayHealthUrl, 'http://127.0.0.1:19932/health');
  assert.equal(DEFAULTS.gatewayPidPath, '.tmp/operator-agent-gateway.pid');
});

test('operator-agent runtime builds direct node commands under Infisical', () => {
  const options = parseArgs(['start', '--json', '--infisical-path=/operator-agent/local-gateway']);
  const services = serviceDefinitions(options);

  assert.equal(options.command, 'start');
  assert.equal(options.json, true);
  assert.deepEqual(services.gateway.command, [
    'infisical',
    'run',
    '--env=prod',
    '--path=/operator-agent/local-gateway',
    '--include-imports=true',
    '--',
    'node',
    'scripts/operator-agent-gateway.mjs',
  ]);
  assert.deepEqual(services.tunnel.command, [
    'infisical',
    'run',
    '--env=prod',
    '--path=/operator-agent/local-gateway',
    '--include-imports=true',
    '--',
    'node',
    'scripts/operator-agent-cloudflare-access.mjs',
    'start',
  ]);
  assert.deepEqual(services.gateway.gatewayModePolicy.required, REQUIRED_GATEWAY_MODES);
  assert.deepEqual(services.gateway.gatewayModePolicy.forbidden, ['patch', 'revise']);
});

test('operator-agent runtime pid check returns false for absent pid', () => {
  assert.equal(isPidRunning(null), false);
  assert.equal(isPidRunning(999999999), false);
});

test('operator-agent runtime validates gateway mode posture', () => {
  const healthy = validateGatewayHealth({
    exposedModes: [...REQUIRED_GATEWAY_MODES],
    writeModesExposed: false,
  });
  assert.equal(healthy.ok, true);
  assert.deepEqual(healthy.missingModes, []);

  const stale = validateGatewayHealth({
    exposedModes: ['readiness', 'profiles', 'policy', 'scout', 'batch-eval', 'pattern-review'],
    writeModesExposed: false,
  });
  assert.equal(stale.ok, false);
  assert.match(stale.blockers.join('\n'), /model-probe/);
  assert.match(stale.blockers.join('\n'), /memory-proposal/);

  const unsafe = validateGatewayHealth({
    exposedModes: [...REQUIRED_GATEWAY_MODES, 'patch'],
    writeModesExposed: true,
  });
  assert.equal(unsafe.ok, false);
  assert.match(unsafe.blockers.join('\n'), /patch/);
  assert.match(unsafe.blockers.join('\n'), /writeModesExposed=true/);
});
