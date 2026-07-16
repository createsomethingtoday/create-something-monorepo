import { createServer } from 'node:http';
import {
  bakedRuntimeProcessLauncher,
  createRuntimeTemplateHandler
} from './server.js';

const PORT = 3_000;
const MAX_REQUEST_BYTES = 8_192;
const EXPECTED_API_ORIGIN =
  'https://webflow-app-review-preflight.createsomething.workers.dev';
const handle = createRuntimeTemplateHandler({
  expectedApiOrigin: EXPECTED_API_ORIGIN,
  runtime: bakedRuntimeProcessLauncher
});

createServer((incoming, outgoing) => {
  void (async () => {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        outgoing.writeHead(413, {
          'cache-control': 'no-store',
          'content-type': 'application/json'
        });
        outgoing.end('{"error":"request_too_large"}');
        return;
      }
      chunks.push(buffer);
    }

    const body = Buffer.concat(chunks);
    const request = new Request(`http://127.0.0.1:${PORT}${incoming.url ?? '/'}`, {
      method: incoming.method ?? 'GET',
      headers: incoming.headers as Record<string, string>,
      body: body.length > 0 ? body : undefined
    });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  })().catch(() => {
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, {
        'cache-control': 'no-store',
        'content-type': 'application/json'
      });
    }
    outgoing.end('{"error":"internal_error"}');
  });
}).listen(PORT, '0.0.0.0');
