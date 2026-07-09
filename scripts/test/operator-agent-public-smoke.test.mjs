import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyAccessResponse, parseArgs, smoke } from '../operator-agent-public-smoke.mjs';

function response(status, headers = {}) {
  return {
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

test('operator-agent public smoke parses defaults', () => {
  const options = parseArgs(['--json']);

  assert.equal(options.json, true);
  assert.equal(options.url, 'https://operator-agent.createsomething.agency/health');
  assert.equal(options.expectedAccessHost, 'createsomething.cloudflareaccess.com');
  assert.equal(options.timeoutMs, 15_000);
});

test('operator-agent public smoke passes when Cloudflare Access redirects login', async () => {
  const report = await smoke(parseArgs([]), async () =>
    response(302, {
      location: 'https://createsomething.cloudflareaccess.com/cdn-cgi/access/login/operator-agent.createsomething.agency',
      'cf-ray': 'test-ray',
    })
  );

  assert.equal(report.ok, true);
  assert.equal(report.response.accessProtected, true);
  assert.equal(report.response.redirectsToAccess, true);
  assert.equal(report.response.locationHost, 'createsomething.cloudflareaccess.com');
});

test('operator-agent public smoke passes when Cloudflare Access challenges directly', async () => {
  const report = await smoke(parseArgs([]), async () =>
    response(401, {
      'www-authenticate': 'Cloudflare-Access resource_metadata="https://operator-agent.createsomething.agency/.well-known/cloudflare-access-protected-resource/health"',
    })
  );

  assert.equal(report.ok, true);
  assert.equal(report.response.accessProtected, true);
  assert.equal(report.response.challengesAccess, true);
});

test('operator-agent public smoke blocks raw origin exposure', async () => {
  const report = await smoke(parseArgs([]), async () => response(200, { 'content-type': 'application/json' }));

  assert.equal(report.ok, false);
  assert.equal(report.response.rawOriginExposed, true);
  assert.match(report.nextActions.join('\n'), /repair Cloudflare Access/);
});

test('operator-agent public smoke classifier ignores unrelated redirects', () => {
  const classified = classifyAccessResponse(
    response(302, {
      location: 'https://example.com/login',
    }),
    parseArgs([])
  );

  assert.equal(classified.accessProtected, false);
  assert.equal(classified.redirectsToAccess, false);
});
