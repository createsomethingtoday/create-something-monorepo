import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One adapter-node process owns both the local app and its Access-protected
 * remote view. Never accept a forwarded scheme from a browser or tunnel client.
 * @param {{ localOrigin: string; remoteOrigin: string; handler: import('node:http').RequestListener }} options
 * @returns {import('node:http').RequestListener}
 */
export function createDualOriginHandler({ localOrigin, remoteOrigin, handler }) {
  const localHost = new URL(localOrigin).host;
  const remoteHost = new URL(remoteOrigin).host;
  if (
    localOrigin !== new URL(localOrigin).origin ||
    remoteOrigin !== new URL(remoteOrigin).origin ||
    new URL(localOrigin).protocol !== 'http:' ||
    new URL(localOrigin).hostname !== '127.0.0.1' ||
    new URL(remoteOrigin).protocol !== 'https:' ||
    localHost === remoteHost
  ) {
    throw new Error('Dual-origin listener requires exact loopback and HTTPS remote origins.');
  }
  return (request, response) => {
    const host = request.headers.host;
    const protocol = host === localHost ? 'http' : host === remoteHost ? 'https' : null;
    if (!protocol) {
      response.writeHead(421, { 'cache-control': 'no-store', 'content-type': 'text/plain' });
      response.end('Unknown workspace host.');
      return;
    }
    delete request.headers['x-forwarded-host'];
    delete request.headers['x-forwarded-port'];
    delete request.headers.forwarded;
    request.headers['x-forwarded-proto'] = protocol;
    handler(request, response);
  };
}

async function start() {
  if (process.env.CLIENT_WORKSPACE_DESKTOP !== '1' || process.env.CLIENT_WORKSPACE_REMOTE !== '1') {
    throw new Error('Dual-origin listener requires both desktop and remote policy modes.');
  }
  if (process.env.ORIGIN || process.env.HOST_HEADER || process.env.PORT_HEADER) {
    throw new Error('Fixed adapter origin or forwarded host configuration is unavailable in dual mode.');
  }
  const port = Number(process.env.PORT);
  const localOrigin = process.env.CLIENT_WORKSPACE_LOOPBACK_ORIGIN ?? '';
  const remoteOrigin = process.env.CLIENT_WORKSPACE_REMOTE_ORIGIN ?? '';
  if (
    process.env.HOST !== '127.0.0.1' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    new URL(localOrigin).port !== String(port) ||
    !/^[a-f0-9]{64}$/.test(process.env.CLIENT_WORKSPACE_CAPABILITY_TOKEN ?? '') ||
    !process.env.CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN ||
    !process.env.CLIENT_WORKSPACE_ACCESS_AUD ||
    !process.env.CLIENT_WORKSPACE_ACCESS_EMAIL
  ) {
    throw new Error('Dual-origin listener configuration is incomplete.');
  }
  process.env.PROTOCOL_HEADER = 'x-forwarded-proto';
  const installedHandler = new URL('../handler.js', import.meta.url);
  const handlerModule = existsSync(fileURLToPath(installedHandler))
    ? '../handler.js'
    : '../build/handler.js';
  const { handler } = await import(handlerModule);
  const server = createServer(createDualOriginHandler({ localOrigin, remoteOrigin, handler }));
  server.listen(port, '127.0.0.1');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await start();
}
