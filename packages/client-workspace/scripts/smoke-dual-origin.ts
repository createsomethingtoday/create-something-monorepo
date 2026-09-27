import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function call(port: number, host: string, path: string, options: {
  method?: string;
  origin?: string;
  cookie?: string;
  jwt?: string;
  body?: string;
} = {}): Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }> {
  return await new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Host: host, 'X-Forwarded-Proto': 'javascript' };
    if (options.origin) headers.Origin = options.origin;
    if (options.cookie) headers.Cookie = options.cookie;
    if (options.jwt) headers['Cf-Access-Jwt-Assertion'] = options.jwt;
    if (options.body) {
      headers['Content-Type'] = 'multipart/form-data; boundary=test';
      headers['Content-Length'] = String(Buffer.byteLength(options.body));
    }
    const outgoing = request({ hostname: '127.0.0.1', port, path, method: options.method ?? 'GET', headers }, (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
      incoming.on('end', () => resolve({
        status: incoming.statusCode ?? 0,
        headers: incoming.headers,
        body: Buffer.concat(chunks).toString()
      }));
    });
    outgoing.on('error', reject);
    outgoing.end(options.body);
  });
}

const stateRoot = await mkdtemp(join(tmpdir(), 'client-workspace-dual-origin-'));
const appPort = await freePort();
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'smoke-key', alg: 'RS256', use: 'sig' };
const jwks = createServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ keys: [jwk] }));
});
await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
const address = jwks.address();
assert.ok(address && typeof address !== 'string');
const issuer = `http://127.0.0.1:${address.port}`;
const localOrigin = `http://127.0.0.1:${appPort}`;
const remoteOrigin = 'https://client-agent.example.test';
const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'smoke-key', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: issuer, aud: ['dual-origin-smoke'], email: 'operator@example.test', iat: now, exp: now + 60
})).toString('base64url');
const signed = `${header}.${payload}`;
const jwt = `${signed}.${sign('RSA-SHA256', Buffer.from(signed), privateKey).toString('base64url')}`;
const entry = process.env.CLIENT_WORKSPACE_DUAL_ENTRY ?? 'scripts/dual-origin-server.mjs';
const runtime = process.env.CLIENT_WORKSPACE_DUAL_RUNTIME ?? process.execPath;
const child = spawn(runtime, [entry], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(appPort),
    NODE_ENV: 'production',
    CLIENT_WORKSPACE_DESKTOP: '1',
    CLIENT_WORKSPACE_REMOTE: '1',
    CLIENT_WORKSPACE_LOOPBACK_ORIGIN: localOrigin,
    CLIENT_WORKSPACE_REMOTE_ORIGIN: remoteOrigin,
    CLIENT_WORKSPACE_CAPABILITY_TOKEN: 'a'.repeat(64),
    CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN: issuer,
    CLIENT_WORKSPACE_ACCESS_AUD: 'dual-origin-smoke',
    CLIENT_WORKSPACE_ACCESS_EMAIL: 'operator@example.test',
    CLIENT_WORKSPACE_STATE_ROOT: stateRoot,
    CLIENT_WORKSPACE_MANAGED_ROOT: join(stateRoot, 'workspaces'),
    CLIENT_WORKSPACE_CODEX_COMMAND: '/bin/false',
    ORIGIN: undefined,
    HOST_HEADER: undefined,
    PORT_HEADER: undefined
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let stderr = '';
child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      const probe = await call(appPort, 'unknown.example.test', '/');
      if (probe.status === 421) { ready = true; break; }
    } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, `Dual-origin server did not start: ${stderr}`);
  assert.equal((await call(appPort, `127.0.0.1:${appPort}`, '/api/runtime/codex')).status, 403);
  assert.equal((await call(appPort, 'client-agent.example.test', '/api/runtime/codex')).status, 403);
  assert.equal((await call(appPort, 'client-agent.example.test', `/?cap=${'a'.repeat(64)}`)).status, 403);
  assert.equal((await call(appPort, 'unknown.example.test', '/api/runtime/codex', { jwt })).status, 421);
  const bootstrap = await call(appPort, `127.0.0.1:${appPort}`, `/?cap=${'a'.repeat(64)}`);
  assert.equal(bootstrap.status, 200);
  const cookie = String(bootstrap.headers['set-cookie']?.[0] ?? '').split(';')[0];
  assert.match(cookie, /^cs_workspace_capability=/);
  assert.equal((await call(appPort, `127.0.0.1:${appPort}`, '/api/runtime/codex', { cookie })).status, 200);
  assert.equal((await call(appPort, 'client-agent.example.test', '/api/runtime/codex', { jwt })).status, 200);
  const multipart = '--test\r\nContent-Disposition: form-data; name="other"\r\n\r\nvalue\r\n--test--\r\n';
  assert.equal((await call(appPort, 'client-agent.example.test', '/api/deliveries', {
    method: 'POST', origin: remoteOrigin, jwt, body: multipart
  })).status, 400);
  assert.equal((await call(appPort, 'client-agent.example.test', '/api/deliveries', {
    method: 'POST', origin: 'https://attacker.example.test', jwt, body: multipart
  })).status, 403);
  assert.equal((await call(appPort, `127.0.0.1:${appPort}`, '/api/deliveries', {
    method: 'POST', origin: localOrigin, cookie, body: multipart
  })).status, 400);
  console.log('Dual-origin server smoke passed.');
} finally {
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.once('exit', () => resolve());
  });
  await new Promise<void>((resolve) => jwks.close(() => resolve()));
  await rm(stateRoot, { recursive: true, force: true });
}
