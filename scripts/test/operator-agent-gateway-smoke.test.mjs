import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { loadGatewayToken, parseArgs, smoke } from '../operator-agent-gateway-smoke.mjs';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test('operator-agent gateway smoke parses defaults and redacts token source', () => {
  const options = parseArgs(['--json', '--base-url=http://127.0.0.1:19932', '--mode=memory-proposal']);

  assert.equal(options.json, true);
  assert.equal(options.baseUrl, 'http://127.0.0.1:19932');
  assert.equal(options.mode, 'memory-proposal');
  assert.equal(options.timeoutMs, 120_000);

  const token = loadGatewayToken(options, { OPERATOR_AGENT_GATEWAY_TOKEN: 'secret-token-must-not-leak' });
  assert.equal(token.ok, true);
  assert.equal(token.source, 'env');
  assert.equal(token.tokenValuePrinted, false);
});

test('operator-agent gateway smoke runs memory proposal through bearer auth without mutating memory', async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, auth: request.headers.authorization });
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          name: 'operator-agent-gateway',
          status: 'ok',
          exposedModes: ['readiness', 'memory-proposal'],
          writeModesExposed: false,
        })
      );
      return;
    }
    if (request.method === 'POST' && request.url === '/v1/run') {
      assert.equal(request.headers.authorization, 'Bearer test-token');
      request.resume();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          exitCode: 0,
          report: {
            mode: 'memory-proposal',
            outcome: 'memory-proposed',
            mutation: { writesPerformed: 0, memoryStoreMutated: false },
            receiptPath: '.cache/operator-agent-system/test-memory-proposal.json',
          },
        })
      );
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false }));
  });

  try {
    const port = await listen(server);
    const report = await smoke(
      {
        ...parseArgs(['--mode=memory-proposal']),
        baseUrl: `http://127.0.0.1:${port}`,
      },
      { OPERATOR_AGENT_GATEWAY_TOKEN: 'test-token' }
    );

    assert.equal(report.ok, true);
    assert.equal(report.token.source, 'env');
    assert.equal(report.token.tokenValuePrinted, false);
    assert.equal(report.steps.find((step) => step.id === 'run').memoryStoreMutated, false);
    assert.equal(report.report.mutation.memoryStoreMutated, false);
    assert.equal(requests.some((entry) => entry.auth === 'Bearer test-token'), true);
    assert.doesNotMatch(JSON.stringify(report), /test-token/);
  } finally {
    server.close();
  }
});

test('operator-agent gateway smoke blocks before HTTP calls when token is missing', async () => {
  const report = await smoke(parseArgs(['--base-url=http://127.0.0.1:1']), { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' });

  assert.equal(report.ok, false);
  assert.equal(report.token.ok, false);
  assert.equal(report.steps.length, 0);
  assert.match(report.nextActions.join('\n'), /OPERATOR_AGENT_GATEWAY_TOKEN/);
});
