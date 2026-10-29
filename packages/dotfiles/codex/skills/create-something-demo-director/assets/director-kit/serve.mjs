import { createServer } from 'node:http';
import { open, lstat, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_FILES, MOBILE_FILES } from './build.mjs';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const mime = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', mp4: 'video/mp4', jpg: 'image/jpeg' };

export function parseRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return false;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
    end = Math.min(end, size - 1);
  }
  if (start >= size || start < 0 || end < start) return false;
  return { start, end };
}

export function createWalkthroughServer(root = packageRoot) {
  root = resolve(root);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return;
    }
    let path;
    try { path = decodeURIComponent((request.url || '/').split('?')[0]); }
    catch { response.writeHead(400); response.end('Invalid path'); return; }
    const name = path === '/' ? 'index.html' : path.slice(1);
    if (!path.startsWith('/') || ![...STATIC_FILES, ...MOBILE_FILES].includes(name)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    let handle;
    try {
      const filename = join(root, name);
      const info = await lstat(filename);
      if (!info.isFile() || await realpath(filename) !== filename) {
        response.writeHead(404); response.end('Not found'); return;
      }
      handle = await open(filename, 'r');
      const stat = await handle.stat();
      const range = parseRange(request.headers.range, stat.size);
      if (range === false) {
        await handle.close(); handle = null;
        response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); response.end(); return;
      }
      response.setHeader('Content-Type', mime[name.split('.').pop()] || 'application/octet-stream');
      response.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
        response.setHeader('Content-Length', range.end - range.start + 1);
      } else response.setHeader('Content-Length', stat.size);
      response.writeHead(range ? 206 : 200);
      if (request.method === 'HEAD') { await handle.close(); handle = null; response.end(); return; }
      const stream = handle.createReadStream(range || {});
      handle = null;
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      if (!response.headersSent) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(error.code === 'ENOENT' ? 'Not found' : 'Could not read asset'); }
      else response.destroy();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const port = args.length === 0 ? 8766 : args.length === 2 && args[0] === '--port' ? Number(args[1]) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Usage: node serve.mjs [--port 8766]'); process.exitCode = 1;
  } else {
    const server = createWalkthroughServer();
    server.on('error', error => { console.error(`Preview failed: ${error.message}`); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Walkthrough preview: http://127.0.0.1:${port}`));
  }
}
