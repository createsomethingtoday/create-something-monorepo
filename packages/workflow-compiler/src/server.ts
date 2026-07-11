import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export interface OperatorConsoleServer {
  server: Server;
  url: string;
}

export async function serveOperatorConsole(
  rootDir: string,
  options: { host?: string; port?: number } = {},
): Promise<OperatorConsoleServer> {
  const root = resolve(rootDir);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4173;
  const consoleIndex = join(root, 'operator-console', 'index.html');
  await stat(consoleIndex);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://${host}`);
      if (url.pathname === '/') {
        response.writeHead(302, { location: '/operator-console/' });
        response.end();
        return;
      }

      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      let target = resolve(root, relativePath);
      if (url.pathname.endsWith('/')) target = join(target, 'index.html');
      if (target !== root && !target.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      const file = await stat(target);
      if (!file.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolveListen();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine console address.');

  return { server, url: `http://${host}:${address.port}/operator-console/` };
}
