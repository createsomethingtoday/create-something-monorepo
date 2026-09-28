import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from './worker.mjs';
const html = await readFile(new URL('public/index.html', import.meta.url), 'utf8');
const calls = [];
const env = new Proxy({ ASSETS: { fetch: async request => {
  calls.push({ url: request.url, method: request.method, headers: [...request.headers] });
  return new Response(html, { status: 200 });
} } }, { get(target, key) { assert.equal(key, 'ASSETS', 'No backend binding may be accessed'); return target[key]; } });
const routes = ['/', '/templates/restaurant', '/checkout', '/checkout/success?session_id=test', '/dashboard', '/login', '/api/sites/provision', '/api/subscriptions/update', '/api/upload'];
let checks = 0;
for (const path of routes) {
  for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const before = calls.length;
    const response = await worker.fetch(new Request('https://templates.example'+path, { method, headers: { Cookie: 'untrusted=test' } }), env);
    const body = await response.text();
    assert.equal(response.status, path === '/' && ['GET', 'HEAD'].includes(method) ? 200 : 410);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    if (method === 'HEAD') assert.equal(body, '');
    else assert.match(body, /retired/);
    if (!['GET','HEAD'].includes(method) || path.startsWith('/api/')) assert.equal(calls.length, before);
    checks++;
  }
}
for (const call of calls) { assert.equal(call.url, 'https://templates.example/'); assert.equal(call.method, 'GET'); assert.deepEqual(call.headers, []); }
const failed = await worker.fetch(new Request('https://templates.example/checkout'), { ASSETS: { fetch: async () => new Response('', { status: 404 }) } });
assert.equal(failed.status, 503);
assert.doesNotMatch(html, /<script|<form|payment successful|purchase complete/i);
console.log(JSON.stringify({ checks, backendAccess: false, forwardedCredentials: false, missingAssetStatus: failed.status, result: 'pass' }, null, 2));
