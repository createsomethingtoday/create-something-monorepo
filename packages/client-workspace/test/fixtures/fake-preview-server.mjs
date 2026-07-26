import http from 'node:http';

const port = Number(process.argv[2]);
const mode = process.argv[3] ?? 'ready';
const sourceRoot = process.argv[4] ?? '/workspace/projects/demo';

if (mode === 'crash') {
  process.exit(1);
}

if (mode === 'hang') {
  setInterval(() => {}, 1000);
} else {
  const server = http.createServer((request, response) => {
    if (request.url?.includes('/@vite/client')) {
      response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      response.end(
        'console.debug("[vite] connecting..."); transport.connect(createHMRHandler(handleMessage)); export { createHotContext };'
      );
      return;
    }
    if (request.url?.includes('/leak.js')) {
      response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      response.end(
        `export { default } from "/api/workspaces/demo/preview/@fs${sourceRoot}/src/private.js";`
      );
      return;
    }
    if (request.url?.includes('/@fs/')) {
      response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      response.end('export const previewModule = true;');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`preview:${request.url}`);
  });
  server.listen(port, '127.0.0.1');
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
