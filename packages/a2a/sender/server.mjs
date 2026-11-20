import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { CallbackTransportError, DEADLINE_MS, MAX_ENVELOPE_BYTES } from './policy.mjs';
import { sendCallback } from './transport.mjs';

export function validSenderToken(token) { return typeof token === 'string' && /^[A-Za-z0-9_-]{32,256}$/u.test(token); }
export function authorized(supplied, token) {
  if (!validSenderToken(token) || typeof supplied !== 'string' || supplied.length > 300) return false;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(supplied), digest(`Bearer ${token}`));
}

export function createSenderServer({ token, send = sendCallback }) {
  if (!validSenderToken(token)) throw new CallbackTransportError('sender_not_configured');
  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    const reply = (status, value) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', connection: 'close' });
      response.end(JSON.stringify(value));
    };
    if (request.url === '/health' && request.method === 'GET') return reply(200, { ok: true });
    if (request.url !== '/send' || request.method !== 'POST') return reply(404, { error: 'not_found' });
    if (!authorized(request.headers.authorization, token)) return reply(401, { error: 'unauthorized' });
    if (request.headers['content-type'] !== 'application/json' || request.headers['content-encoding']) return reply(415, { error: 'invalid_envelope' });
    const deadlineAt = Number(request.headers['x-a2a-deadline-at']);
    const remainingMs = deadlineAt - Date.now();
    if (!Number.isSafeInteger(deadlineAt) || remainingMs <= 0 || remainingMs > DEADLINE_MS) return reply(408, { error: 'callback_deadline_exceeded' });
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reply(504, { error: 'callback_deadline_exceeded' }); request.destroy(); }, remainingMs);
    const onDisconnect = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', onDisconnect);
    try {
      const chunks = [];
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > MAX_ENVELOPE_BYTES) { reply(413, { error: 'invalid_envelope' }); request.destroy(); return; }
        chunks.push(chunk);
      }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return reply(400, { error: 'invalid_envelope' }); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).sort().join(',') !== 'body,headers,url') return reply(400, { error: 'invalid_envelope' });
      const budget = deadlineAt - Date.now();
      if (budget <= 0 || controller.signal.aborted) return reply(408, { error: 'callback_deadline_exceeded' });
      const result = await send(payload.url, payload.body, payload.headers, { signal: controller.signal, deadlineMs: budget });
      reply(200, result);
    } catch (error) {
      const code = error instanceof CallbackTransportError ? error.code : 'callback_failed';
      reply(code === 'callback_deadline_exceeded' ? 504 : 400, { error: code });
    } finally {
      clearTimeout(timer);
      response.off('close', onDisconnect);
    }
  });
  server.requestTimeout = DEADLINE_MS;
  server.headersTimeout = DEADLINE_MS;
  server.keepAliveTimeout = 1000;
  server.maxConnections = 32;
  // No request, URL, payload, header, resolver, or provider-error logging.
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!validSenderToken(process.env.A2A_SENDER_TOKEN)) process.exit(78);
  const server = createSenderServer({ token: process.env.A2A_SENDER_TOKEN });
  server.listen(8080, '0.0.0.0');
  process.once('SIGTERM', () => { server.close(); server.closeAllConnections(); });
  process.once('SIGINT', () => { server.close(); server.closeAllConnections(); });
}
