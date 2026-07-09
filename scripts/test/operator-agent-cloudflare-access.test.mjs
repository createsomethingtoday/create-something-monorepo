import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  accessSummary,
  buildAccessAppPayload,
  buildTunnelConfig,
  DEFAULTS,
  finalizeAccess,
  parseArgs,
  parseInfisicalSecretNames,
  preflight,
  preflightNextActions,
  provisionAccessNextActionsForCredentials,
  selectCloudflareTokenName,
  storeAccessToken,
  validateConfig,
} from '../operator-agent-cloudflare-access.mjs';

const scriptPath = new URL('../operator-agent-cloudflare-access.mjs', import.meta.url).pathname;

test('operator-agent Cloudflare defaults use a dedicated loopback tunnel origin', () => {
  assert.equal(DEFAULTS.hostname, 'operator-agent.createsomething.agency');
  assert.equal(DEFAULTS.tunnelName, 'create-something-operator-agent');
  assert.equal(DEFAULTS.origin, 'http://127.0.0.1:19932');
  assert.equal(DEFAULTS.sessionDuration, '12h');
  assert.deepEqual(validateConfig(DEFAULTS), []);
});

test('operator-agent Cloudflare config rejects public origins and long sessions', () => {
  assert.deepEqual(validateConfig({ ...DEFAULTS, origin: 'https://example.com' }), [
    'origin must stay bound to 127.0.0.1, localhost, or ::1',
  ]);
  assert.deepEqual(validateConfig({ ...DEFAULTS, sessionDuration: '24h' }), [
    'operator-agent Cloudflare Access policy must use the approved 12h session duration',
  ]);
});

test('operator-agent Cloudflare config renders published app ingress', () => {
  const options = parseArgs(['config', '--origin', 'http://localhost:3000', '--config-path=.tmp/operator.yml']);
  const config = buildTunnelConfig(options);

  assert.equal(options.command, 'config');
  assert.equal(options.origin, 'http://localhost:3000');
  assert.match(config, /hostname: operator-agent\.createsomething\.agency/);
  assert.match(config, /service: http:\/\/localhost:3000/);
  assert.match(config, /http_status:404/);
  assert.match(accessSummary(options).join('\n'), /bearer token/);
});

test('operator-agent Cloudflare Access app payload stays narrow', () => {
  const payload = buildAccessAppPayload(DEFAULTS);

  assert.equal(payload.name, 'CREATE SOMETHING Operator Agent Gateway');
  assert.equal(payload.domain, 'operator-agent.createsomething.agency');
  assert.equal(payload.type, 'self_hosted');
  assert.equal(payload.session_duration, '12h');
  assert.deepEqual(payload.policies, [
    {
      name: 'Allow operator identity',
      decision: 'allow',
      precedence: 1,
      include: [{ email: { email: 'micah@createsomething.io' } }],
    },
  ]);
});

test('operator-agent Cloudflare preflight parses secret posture options', () => {
  const options = parseArgs([
    'preflight',
    '--',
    '--json',
    '--public',
    '--infisical-env=prod',
    '--infisical-path=/operator-agent/local-gateway',
    '--cloudflare-secrets-path=/',
  ]);

  assert.equal(options.command, 'preflight');
  assert.equal(options.json, true);
  assert.equal(options.public, true);
  assert.equal(options.infisicalEnv, 'prod');
  assert.equal(options.infisicalPath, '/operator-agent/local-gateway');
  assert.equal(options.cloudflareSecretsPath, '/');
});

test('operator-agent Cloudflare finalize parses apply flag without changing defaults', () => {
  const options = parseArgs(['finalize', '--json', '--apply']);

  assert.equal(options.command, 'finalize');
  assert.equal(options.json, true);
  assert.equal(options.apply, true);
  assert.equal(options.hostname, 'operator-agent.createsomething.agency');
  assert.equal(options.sessionDuration, '12h');
});

test('operator-agent Cloudflare store-token parses without accepting token as an argument', () => {
  const options = parseArgs(['store-token', '--json', '--cloudflare-secrets-path=/']);

  assert.equal(options.command, 'store-token');
  assert.equal(options.json, true);
  assert.equal(options.cloudflareSecretsPath, '/');
});

test('operator-agent Cloudflare Infisical parsing returns names only', () => {
  assert.deepEqual(
    parseInfisicalSecretNames(
      JSON.stringify({
        OPERATOR_AGENT_GATEWAY_TOKEN: 'do-not-return-value',
        OPERATOR_AGENT_TUNNEL_TOKEN: 'do-not-return-value',
      })
    ),
    ['OPERATOR_AGENT_GATEWAY_TOKEN', 'OPERATOR_AGENT_TUNNEL_TOKEN']
  );
  assert.deepEqual(
    parseInfisicalSecretNames(
      JSON.stringify({
        secrets: [
          { secretKey: 'OPERATOR_AGENT_GATEWAY_TOKEN', secretValue: 'do-not-return-value' },
          { key: 'OPERATOR_AGENT_TUNNEL_TOKEN', value: 'do-not-return-value' },
        ],
      })
    ),
    ['OPERATOR_AGENT_GATEWAY_TOKEN', 'OPERATOR_AGENT_TUNNEL_TOKEN']
  );
});

test('operator-agent Cloudflare token selection prefers dedicated Access tokens', () => {
  assert.equal(
    selectCloudflareTokenName({
      CLOUDFLARE_API_TOKEN: 'general-token',
      CLOUDFLARE_ACCESS_API_TOKEN: 'access-token',
      CLOUDFLARE_ZERO_TRUST_API_TOKEN: 'zero-trust-token',
    }),
    'CLOUDFLARE_ACCESS_API_TOKEN'
  );
  assert.equal(
    selectCloudflareTokenName({
      CLOUDFLARE_API_TOKEN: 'general-token',
      CLOUDFLARE_ZERO_TRUST_API_TOKEN: 'zero-trust-token',
    }),
    'CLOUDFLARE_ZERO_TRUST_API_TOKEN'
  );
  assert.equal(selectCloudflareTokenName({ CLOUDFLARE_API_TOKEN: 'general-token' }), 'CLOUDFLARE_API_TOKEN');
  assert.equal(selectCloudflareTokenName({}), null);
});

test('operator-agent Cloudflare public preflight points at dedicated Access token when fallback token is insufficient', () => {
  assert.deepEqual(
    preflightNextActions({
      config: { ok: true },
      commands: { cloudflared: { ok: true }, infisical: { ok: true } },
      wrangler: { ok: true },
      tunnel: { ok: true, tunnelName: 'create-something-operator-agent' },
      infisical: { ok: true },
      gateway: { ok: true },
      cloudflareAccess: { ok: false, tokenName: 'CLOUDFLARE_API_TOKEN', canListApplications: false },
      publicHostname: { ok: false },
    }),
    [
      'store CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies permission in Infisical before routing DNS',
      'route public hostname to the tunnel only after Cloudflare Access is verified',
    ]
  );
});

test('operator-agent Cloudflare provision points at dedicated Access token when fallback token cannot list apps', () => {
  assert.deepEqual(
    provisionAccessNextActionsForCredentials({ tokenName: 'CLOUDFLARE_API_TOKEN', canListApplications: false }),
    ['store CLOUDFLARE_ACCESS_API_TOKEN with Cloudflare Access Apps and Policies Write permission in Infisical']
  );
  assert.deepEqual(
    provisionAccessNextActionsForCredentials({ tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN', canListApplications: true }),
    ['rerun with --apply to create the Access application, then run public preflight']
  );
});

test('operator-agent Cloudflare token-check uses env token without printing the value', () => {
  const result = spawnSync(process.execPath, [scriptPath, 'token-check', '--json'], {
    encoding: 'utf8',
    env: {
      CLOUDFLARE_ACCESS_API_TOKEN: 'secret-token-must-not-leak',
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    },
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, /secret-token-must-not-leak/);
  assert.doesNotMatch(result.stderr, /secret-token-must-not-leak/);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'token-check');
  assert.equal(output.credentials.tokenName, 'CLOUDFLARE_ACCESS_API_TOKEN');
  assert.equal(output.credentials.tokenProvided, true);
  assert.equal(output.credentials.usingEnvironmentToken, true);
  assert.equal(output.credentials.source, 'env');
  assert.match(output.nextActions.join('\n'), /CLOUDFLARE_ACCOUNT_ID/);
});

test('operator-agent Cloudflare token-check can read dedicated token posture from Infisical without leaking it', () => {
  const binDir = mkdtempSync(path.join(tmpdir(), 'operator-agent-infisical-'));
  const fakeInfisical = path.join(binDir, 'infisical');
  writeFileSync(
    fakeInfisical,
    [
      '#!/bin/sh',
      'cat <<\'JSON\'',
      '{"CLOUDFLARE_ACCESS_API_TOKEN":"secret-token-must-not-leak"}',
      'JSON',
      '',
    ].join('\n')
  );
  chmodSync(fakeInfisical, 0o755);

  const result = spawnSync(process.execPath, [scriptPath, 'token-check', '--json'], {
    encoding: 'utf8',
    env: {
      PATH: `${binDir}:/usr/bin:/bin:/usr/sbin:/sbin`,
    },
  });

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stdout, /secret-token-must-not-leak/);
  assert.doesNotMatch(result.stderr, /secret-token-must-not-leak/);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'token-check');
  assert.equal(output.credentials.tokenName, 'CLOUDFLARE_ACCESS_API_TOKEN');
  assert.equal(output.credentials.tokenProvided, true);
  assert.equal(output.credentials.usingEnvironmentToken, false);
  assert.equal(output.credentials.source, 'infisical');
  assert.equal(output.credentials.tokenValuePrinted, false);
  assert.match(output.nextActions.join('\n'), /CLOUDFLARE_ACCOUNT_ID/);
});

test('operator-agent Cloudflare finalize stops before provisioning when the dedicated token is missing', async () => {
  const report = await finalizeAccess(DEFAULTS, {
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  });

  assert.equal(report.mode, 'finalize-access');
  assert.equal(report.ok, false);
  assert.equal(report.dryRun, true);
  assert.equal(report.stoppedAt, 'token-check');
  assert.equal(report.steps[0].id, 'token-check');
  assert.equal(report.steps[0].tokenProvided, false);
  assert.match(report.nextActions.join('\n'), /CLOUDFLARE_ACCESS_API_TOKEN/);
});

test('operator-agent Cloudflare store-token requires env token and never prints token values', async () => {
  const report = await storeAccessToken(DEFAULTS, { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' });

  assert.equal(report.mode, 'store-token');
  assert.equal(report.ok, false);
  assert.equal(report.tokenValuePrinted, false);
  assert.match(report.error, /must be provided in the environment/);
  assert.doesNotMatch(JSON.stringify(report), /secret-token-must-not-leak/);
});

test('operator-agent Cloudflare preflight prefers corepack pnpm for wrangler checks', () => {
  const binDir = mkdtempSync(path.join(tmpdir(), 'operator-agent-corepack-'));
  writeFileSync(
    path.join(binDir, 'corepack'),
    [
      '#!/bin/sh',
      'if [ "$1" = "pnpm" ] && [ "$2" = "exec" ] && [ "$3" = "wrangler" ] && [ "$4" = "whoami" ]; then',
      '  echo "wrangler ok via corepack"',
      '  exit 0',
      'fi',
      'exit 64',
      '',
    ].join('\n')
  );
  writeFileSync(path.join(binDir, 'pnpm'), '#!/bin/sh\nexit 99\n');
  writeFileSync(
    path.join(binDir, 'cloudflared'),
    ['#!/bin/sh', 'if [ "$1" = "tunnel" ] && [ "$2" = "list" ]; then echo "create-something-operator-agent"; exit 0; fi', 'exit 64', ''].join('\n')
  );
  writeFileSync(
    path.join(binDir, 'infisical'),
    [
      '#!/bin/sh',
      'cat <<\'JSON\'',
      '{"OPERATOR_AGENT_GATEWAY_TOKEN":"redacted","OPERATOR_AGENT_TUNNEL_TOKEN":"redacted"}',
      'JSON',
      '',
    ].join('\n')
  );
  writeFileSync(path.join(binDir, 'curl'), '#!/bin/sh\necho "{\\"status\\":\\"ok\\"}"\n');
  for (const name of ['corepack', 'pnpm', 'cloudflared', 'infisical', 'curl']) {
    chmodSync(path.join(binDir, name), 0o755);
  }

  const previousPath = process.env.PATH;
  process.env.PATH = `${binDir}:/usr/bin:/bin:/usr/sbin:/sbin`;
  try {
    const report = preflight(DEFAULTS);

    assert.equal(report.checks.wrangler.ok, true);
    assert.equal(report.ok, true);
  } finally {
    process.env.PATH = previousPath;
  }
});

test('operator-agent Cloudflare preflight next actions only include failed checks', () => {
  assert.deepEqual(
    preflightNextActions({
      config: { ok: true },
      commands: { cloudflared: { ok: true }, infisical: { ok: true } },
      wrangler: { ok: true },
      tunnel: { ok: true, tunnelName: 'create-something-operator-agent' },
      infisical: { ok: false },
      gateway: { ok: false },
    }),
    [
      'store or restore OPERATOR_AGENT_* secrets in Infisical at the configured env/path',
      'start the local gateway with pnpm operator-agent:runtime:start-gateway',
    ]
  );
});

test('operator-agent Cloudflare public preflight next actions include Access before DNS', () => {
  assert.deepEqual(
    preflightNextActions({
      config: { ok: true },
      commands: { cloudflared: { ok: true }, infisical: { ok: true } },
      wrangler: { ok: true },
      tunnel: { ok: true, tunnelName: 'create-something-operator-agent' },
      infisical: { ok: true },
      gateway: { ok: true },
      cloudflareAccess: { ok: false, tokenName: 'CLOUDFLARE_ACCESS_API_TOKEN', canListApplications: true },
      publicHostname: { ok: false },
    }),
    [
      'create Cloudflare Access self-hosted app and allow policy before routing public DNS',
      'route public hostname to the tunnel only after Cloudflare Access is verified',
    ]
  );
});
