import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { runtimeSource } from './runtime-definition.mjs';

const fixturePort = Number(process.env.RUNTIME_FIXTURE_PORT ?? 4173);
const canaryPort = Number(process.env.RUNTIME_CANARY_PORT ?? 4174);
let canaryHits = 0;

const runtimeSha256 = createHash('sha256').update(runtimeSource).digest('hex');
const integrity = `sha256-${createHash('sha256').update(runtimeSource).digest('base64')}`;

const fixture = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${fixturePort}`);
  if (url.pathname === '/runtime-fixture') {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    });
    response.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Runtime fixture</title></head>
<body>
  <h1>Webflow-owned runtime fixture</h1>
  <input value="customer@example.com" aria-label="Sensitive fixture field">
  <script>
    const script = document.createElement('script');
    script.src = '/runtime-v1.js';
    script.integrity = '${integrity}';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  </script>
</body></html>`);
    return;
  }
  if (url.pathname === '/runtime-v1.js') {
    response.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=31536000, immutable'
    });
    response.end(runtimeSource);
    return;
  }
  if (url.pathname === '/runtime-v1.js.map') {
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*'
    });
    response.end(JSON.stringify({ version: 3, sources: ['runtime-v1.ts'], names: [], mappings: '' }));
    return;
  }
  if (url.pathname === '/allowed-data') {
    response.writeHead(204, { 'cache-control': 'no-store' });
    response.end();
    return;
  }
  if (url.pathname === '/proxy') {
    response.writeHead(403, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*'
    });
    response.end(JSON.stringify({ error: 'external_proxy_blocked' }));
    return;
  }
  response.writeHead(404);
  response.end('not found');
});

const canary = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${canaryPort}`);
  if (url.pathname === '/webflow-runtime-canary') canaryHits += 1;
  if (url.pathname === '/state') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ hits: canaryHits }));
    return;
  }
  response.writeHead(200, { 'content-type': 'text/plain' });
  response.end('webflow runtime canary');
});

await Promise.all([
  new Promise((resolve) => fixture.listen(fixturePort, '127.0.0.1', resolve)),
  new Promise((resolve) => canary.listen(canaryPort, '127.0.0.1', resolve))
]);

console.log(JSON.stringify({
  fixtureUrl: `http://127.0.0.1:${fixturePort}/runtime-fixture`,
  runtimeUrl: `http://127.0.0.1:${fixturePort}/runtime-v1.js`,
  runtimeSha256,
  integrity,
  canaryUrl: `http://127.0.0.1:${canaryPort}/webflow-runtime-canary`
}));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    fixture.close();
    canary.close();
    process.exit(0);
  });
}
