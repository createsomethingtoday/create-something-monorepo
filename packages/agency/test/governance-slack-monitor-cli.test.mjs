import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';

const scriptPath = new URL('../scripts/run-governance-slack-monitor.mjs', import.meta.url);

test('governance Slack monitor CLI treats not_configured as nonfatal by default', async () => {
  const server = await startJsonServer(202, {
    status: 'not_configured',
    channels: [],
    summary: { channels: 0, fetched: 0, created: 0, ignored: 0, errors: 0 }
  });
  try {
    const result = await runCli(['--url', server.url, '--key', 'test-key', '--json']);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /"status": "not_configured"/);
    assert.equal(result.stderr, '');
  } finally {
    await server.close();
  }
});

test('governance Slack monitor CLI can still require configured production state', async () => {
  const server = await startJsonServer(202, {
    status: 'not_configured',
    channels: [],
    summary: { channels: 0, fetched: 0, created: 0, ignored: 0, errors: 0 }
  });
  try {
    const result = await runCli([
      '--url',
      server.url,
      '--key',
      'test-key',
      '--json',
      '--require-configured'
    ]);

    assert.equal(result.code, 1);
    assert.match(result.stdout, /"status": "not_configured"/);
    assert.match(result.stderr, /deployed but not configured/);
  } finally {
    await server.close();
  }
});

async function startJsonServer(status, body) {
  const server = createServer((request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.authorization, 'Bearer test-key');
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}/api/governance/monitors/slack`,
    close: async () => {
      server.close();
      await once(server, 'close');
    }
  };
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath.pathname, ...args], {
      env: { ...process.env, AGENCY_INTERNAL_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}
