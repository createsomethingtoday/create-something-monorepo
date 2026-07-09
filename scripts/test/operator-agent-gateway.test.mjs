import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

const repoRoot = new URL('../..', import.meta.url).pathname;
const gatewayPath = new URL('../operator-agent-gateway.mjs', import.meta.url).pathname;

function getPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function waitForGateway(child) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`gateway did not start: ${stderr}`)), 10_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdout.on('data', (chunk) => {
      if (chunk.includes('operator-agent-gateway listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`gateway exited early with ${code}: ${stderr}`));
    });
  });
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('operator-agent gateway requires bearer auth and exposes no write modes', async () => {
  const port = await getPort();
  const child = spawn(process.execPath, [gatewayPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      OPERATOR_AGENT_GATEWAY_HOST: '127.0.0.1',
      OPERATOR_AGENT_GATEWAY_PORT: String(port),
      OPERATOR_AGENT_GATEWAY_TOKEN: 'test-token',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForGateway(child);

    const health = await fetchJson(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.equal(health.body.writeModesExposed, false);
    assert.ok(health.body.exposedModes.includes('batch-eval'));
    assert.ok(health.body.exposedModes.includes('pattern-review'));
    assert.ok(health.body.exposedModes.includes('model-probe'));
    assert.ok(health.body.exposedModes.includes('model-benchmark'));
    assert.ok(health.body.exposedModes.includes('memory-proposal'));
    assert.equal(health.body.exposedModes.includes('patch'), false);
    assert.equal(health.body.exposedModes.includes('revise'), false);

    const unauthenticated = await fetchJson(`http://127.0.0.1:${port}/v1/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'readiness' }),
    });
    assert.equal(unauthenticated.status, 401);

    const writeMode = await fetchJson(`http://127.0.0.1:${port}/v1/run`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mode: 'patch' }),
    });
    assert.equal(writeMode.status, 400);
    assert.match(writeMode.body.error, /not exposed/);

    const readiness = await fetchJson(`http://127.0.0.1:${port}/v1/run`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mode: 'readiness' }),
    });
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.ok, true);
    assert.equal(readiness.body.report.mode, 'readiness');
    assert.equal(readiness.body.report.passed, true);

    const memoryProposal = await fetchJson(`http://127.0.0.1:${port}/v1/run`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ mode: 'memory-proposal', receiptLimit: 3 }),
    });
    assert.equal(memoryProposal.status, 200);
    assert.equal(memoryProposal.body.ok, true);
    assert.equal(memoryProposal.body.report.mode, 'memory-proposal');
    assert.equal(memoryProposal.body.report.mutation.memoryStoreMutated, false);
  } finally {
    child.kill('SIGTERM');
  }
});
