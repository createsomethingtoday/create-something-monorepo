import http from 'node:http';

const port = Number(process.argv[2]);
const mode = process.argv[3] ?? 'ready';

if (mode === 'crash') {
  process.exit(1);
}

if (mode === 'hang') {
  setInterval(() => {}, 1000);
} else {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`preview:${request.url}`);
  });
  server.listen(port, '127.0.0.1');
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
