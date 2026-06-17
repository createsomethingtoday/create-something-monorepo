import http from 'node:http';
import { URL } from 'node:url';

import { getAtlasStudioPalette } from './atlas.js';
import { renderStudioHtml } from './html.js';
import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  createSession,
  exportSessionMarkdown,
  listSessions,
  readSession,
  updateNode
} from './store.js';

type StudioServerOptions = {
  host: string;
  port: number;
  sessionId?: string;
  cwd?: string;
};

async function readJson<T = Record<string, unknown>>(request: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(
  response: http.ServerResponse,
  status: number,
  text: string,
  contentType = 'text/plain'
): void {
  response.writeHead(status, {
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'no-store'
  });
  response.end(text);
}

function badRequest(response: http.ServerResponse, error: unknown): void {
  sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
}

export async function startStudioServer(options: StudioServerOptions): Promise<http.Server> {
  const cwd = options.cwd ?? process.cwd();
  let defaultSessionId = options.sessionId;

  if (!defaultSessionId) {
    const sessions = await listSessions(cwd);
    defaultSessionId = sessions[0]?.id;
  }

  if (!defaultSessionId) {
    const session = await createSession(
      { client: 'Local client', workflow: 'Workflow mapping' },
      cwd
    );
    defaultSessionId = session.id;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? `${options.host}:${options.port}`}`
      );
      const method = request.method ?? 'GET';

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/sessions')) {
        response.writeHead(302, { location: `/sessions/${defaultSessionId}` });
        response.end();
        return;
      }

      if (method === 'GET' && /^\/sessions\/[^/]+$/.test(url.pathname)) {
        sendText(response, 200, renderStudioHtml(), 'text/html');
        return;
      }

      if (method === 'GET' && url.pathname === '/api/palette') {
        sendJson(response, 200, getAtlasStudioPalette());
        return;
      }

      if (method === 'GET' && url.pathname === '/api/sessions') {
        sendJson(response, 200, await listSessions(cwd));
        return;
      }

      if (method === 'POST' && url.pathname === '/api/sessions') {
        const body = await readJson<{ client?: string; workflow?: string; owner?: string }>(
          request
        );
        sendJson(
          response,
          201,
          await createSession(
            {
              client: body.client?.trim() || 'Local client',
              workflow: body.workflow?.trim() || 'Workflow mapping',
              owner: body.owner
            },
            cwd
          )
        );
        return;
      }

      const exportMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/export\.md$/);
      if (method === 'GET' && exportMatch) {
        const session = await readSession(decodeURIComponent(exportMatch[1] ?? ''), cwd);
        sendText(response, 200, exportSessionMarkdown(session), 'text/markdown');
        return;
      }

      const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (method === 'GET' && sessionMatch) {
        sendJson(response, 200, await readSession(decodeURIComponent(sessionMatch[1] ?? ''), cwd));
        return;
      }

      const addNodeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/nodes$/);
      if (method === 'POST' && addNodeMatch) {
        const body = await readJson<Parameters<typeof addNode>[1]>(request);
        sendJson(
          response,
          201,
          await addNode(decodeURIComponent(addNodeMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const updateNodeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/nodes\/([^/]+)$/);
      if (method === 'PATCH' && updateNodeMatch) {
        const body = await readJson<Parameters<typeof updateNode>[2]>(request);
        sendJson(
          response,
          200,
          await updateNode(
            decodeURIComponent(updateNodeMatch[1] ?? ''),
            decodeURIComponent(updateNodeMatch[2] ?? ''),
            body,
            cwd
          )
        );
        return;
      }

      const addEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges$/);
      if (method === 'POST' && addEdgeMatch) {
        const body = await readJson<Parameters<typeof addEdge>[1]>(request);
        sendJson(
          response,
          201,
          await addEdge(decodeURIComponent(addEdgeMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const observationMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/observations$/);
      if (method === 'POST' && observationMatch) {
        const body = await readJson<Parameters<typeof addObservation>[1]>(request);
        sendJson(
          response,
          201,
          await addObservation(decodeURIComponent(observationMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const acceptMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/suggestions\/([^/]+)\/accept$/
      );
      if (method === 'POST' && acceptMatch) {
        sendJson(
          response,
          200,
          await acceptSuggestion(
            decodeURIComponent(acceptMatch[1] ?? ''),
            decodeURIComponent(acceptMatch[2] ?? ''),
            cwd
          )
        );
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      badRequest(response, error);
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, options.host, resolve);
  });

  return server;
}
