// Local-only harness for the exact edge handler; no provider/backend bindings.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import worker from './worker.mjs';
const env = { ASSETS: { async fetch(request) {
  const path = new URL(request.url).pathname;
  const file = { '/': 'index.html', '/styles.css': 'styles.css', '/tokens.css': 'tokens.css' }[path];
  if (!file) return new Response('', { status: 404 });
  return new Response(await readFile(new URL('dist/' + file, import.meta.url)));
} } };
createServer(async (req, res) => {
  try {
    const response = await worker.fetch(new Request(new URL(req.url, 'http://127.0.0.1:4317'), { method: req.method }), env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(503); res.end('Preview unavailable'); }
}).listen(4317, '127.0.0.1', () => console.log('Templates retirement preview: http://127.0.0.1:4317'));
