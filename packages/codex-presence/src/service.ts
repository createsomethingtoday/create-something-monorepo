import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { listPresenceCards, type PresenceActionType } from './presence';
import { OpenAITranscriptionError, transcribeAudio, type TranscriptionResult } from './transcription';

export type ActionRequest = {
  requestId: string;
  actionId: string;
  taskId: string;
  type: PresenceActionType;
  text?: string;
  confirmed?: boolean;
};

export type ActionExecution = {
  upstreamStatus: number;
  detail?: string;
};

export type ActionExecutor = (request: ActionRequest) => Promise<ActionExecution>;

export type ActionReceipt = {
  requestId: string;
  actionId: string;
  taskId: string;
  type: PresenceActionType;
  status: 'accepted' | 'rejected';
  createdAt: string;
  upstreamStatus?: number;
  detail?: string;
};

export type PresenceServerOptions = {
  token: string;
  codexHome: string;
  port?: number;
  host?: string;
  allowedOrigin?: string;
  actionExecutor?: ActionExecutor;
  transcriber?: (input: { bytes: Uint8Array; mimeType: string }) => Promise<TranscriptionResult>;
};

export type PresenceServerHandle = {
  origin: string;
  close: () => Promise<void>;
};

export async function startPresenceServer(options: PresenceServerOptions): Promise<PresenceServerHandle> {
  if (!options.token.trim()) throw new Error('Presence service token is required.');
  const receipts = new Map<string, ActionReceipt>();
  const server = createServer(async (request, response) => {
    applyCors(response, options.allowedOrigin);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/v1/health') {
      sendJson(response, 200, { ok: true, service: 'codex-presence' });
      return;
    }
    if (!authenticated(request, url, options.token)) {
      sendJson(response, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      if (request.method === 'GET' && url.pathname === '/v1/cards') {
        sendJson(response, 200, { cards: await listPresenceCards({ codexHome: options.codexHome }) });
        return;
      }
      if (request.method === 'GET' && url.pathname.startsWith('/v1/cards/')) {
        const id = decodeURIComponent(url.pathname.slice('/v1/cards/'.length));
        const card = (await listPresenceCards({ codexHome: options.codexHome, limit: 100 }))
          .find((candidate) => candidate.taskId === id);
        sendJson(response, card ? 200 : 404, card ?? { error: 'Task not found' });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/v1/events') {
        await streamCards(response, options.codexHome);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/actions') {
        const value = await readJson(request);
        const action = parseActionRequest(value);
        const replay = receipts.get(action.requestId);
        if (replay) {
          sendJson(response, replay.status === 'accepted' ? 202 : 409, replay);
          return;
        }
        const card = (await listPresenceCards({ codexHome: options.codexHome, limit: 100 }))
          .find((candidate) => candidate.taskId === action.taskId);
        const offered = card?.actions.find((candidate) => candidate.type === action.type && candidate.id === action.actionId);
        if (!card || !offered) {
          const receipt = rejected(action, 'Action is not valid for the current task state.');
          receipts.set(action.requestId, receipt);
          sendJson(response, 409, receipt);
          return;
        }
        if (offered.requiresConfirmation && action.confirmed !== true) {
          const receipt = rejected(action, 'Explicit confirmation is required.');
          receipts.set(action.requestId, receipt);
          sendJson(response, 409, receipt);
          return;
        }
        if ((action.type === 'follow_up' || action.type === 'answer') && !action.text?.trim()) {
          const receipt = rejected(action, 'Text is required for this action.');
          receipts.set(action.requestId, receipt);
          sendJson(response, 409, receipt);
          return;
        }
        if (!options.actionExecutor && !['inspect', 'dismiss', 'open_detail'].includes(action.type)) {
          const receipt = rejected(action, 'No action executor is configured.');
          receipts.set(action.requestId, receipt);
          sendJson(response, 503, receipt);
          return;
        }
        let execution: ActionExecution;
        try {
          execution = options.actionExecutor
            ? await options.actionExecutor(action)
            : { upstreamStatus: 200 };
        } catch (error) {
          const receipt = rejected(
            action,
            error instanceof Error ? error.message : 'The action executor rejected the request.'
          );
          receipt.upstreamStatus = 502;
          receipts.set(action.requestId, receipt);
          sendJson(response, 502, receipt);
          return;
        }
        const receipt: ActionReceipt = {
          requestId: action.requestId,
          actionId: action.actionId,
          taskId: action.taskId,
          type: action.type,
          status: 'accepted',
          createdAt: new Date().toISOString(),
          ...execution
        };
        receipts.set(action.requestId, receipt);
        sendJson(response, 202, receipt);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/transcriptions') {
        const bytes = await readBytes(request, 10 * 1024 * 1024);
        const mimeType = request.headers['content-type'] ?? 'application/octet-stream';
        const result = options.transcriber
          ? await options.transcriber({ bytes, mimeType })
          : await transcribeAudio({ bytes, mimeType });
        sendJson(response, 200, result);
        return;
      }
      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      const status = error instanceof OpenAITranscriptionError ? 502 : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof OpenAITranscriptionError ? { code: error.code } : {})
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Presence service did not bind a TCP port.');
  return {
    origin: `http://${options.host ?? '127.0.0.1'}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

function authenticated(request: IncomingMessage, url: URL, token: string): boolean {
  const header = request.headers.authorization;
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  return provided === token;
}

function parseActionRequest(value: unknown): ActionRequest {
  const body = object(value);
  const requestId = text(body.requestId);
  const actionId = text(body.actionId);
  const taskId = text(body.taskId);
  const type = text(body.type) as PresenceActionType;
  const allowed: PresenceActionType[] = [
    'inspect', 'follow_up', 'answer', 'approve', 'deny', 'interrupt', 'dismiss', 'open_detail'
  ];
  if (!requestId || !actionId || !taskId || !allowed.includes(type)) throw new Error('Invalid action request.');
  return {
    requestId,
    actionId,
    taskId,
    type,
    text: typeof body.text === 'string' ? body.text : undefined,
    confirmed: body.confirmed === true
  };
}

function rejected(action: ActionRequest, detail: string): ActionReceipt {
  return {
    requestId: action.requestId,
    actionId: action.actionId,
    taskId: action.taskId,
    type: action.type,
    status: 'rejected',
    createdAt: new Date().toISOString(),
    detail
  };
}

async function streamCards(response: ServerResponse, codexHome: string): Promise<void> {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive'
  });
  let active = true;
  response.on('close', () => { active = false; });
  while (active) {
    const cards = await listPresenceCards({ codexHome });
    response.write(`event: cards\ndata: ${JSON.stringify({ cards })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  return JSON.parse(Buffer.from(await readBytes(request, 1024 * 1024)).toString('utf8')) as unknown;
}

async function readBytes(request: IncomingMessage, maximum: number): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximum) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function applyCors(response: ServerResponse, allowedOrigin?: string): void {
  if (!allowedOrigin) return;
  response.setHeader('access-control-allow-origin', allowedOrigin);
  response.setHeader('access-control-allow-headers', 'authorization, content-type');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
