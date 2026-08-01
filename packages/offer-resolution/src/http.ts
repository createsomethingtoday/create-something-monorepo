import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';

import type { OfferRequestInput } from './types.js';
import type { OfferService, VerifyOfferInput, WatchOffersInput } from './service.js';
import {
  findOffersInputSchema,
  verifyOfferInputSchema,
  watchOffersInputSchema
} from './schemas.js';

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(`${JSON.stringify(body)}\n`);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new Error('content-type must be application/json');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('request body exceeds 1 MiB');
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('request body must contain valid JSON');
  }
}

async function handleRequest(
  service: OfferService,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://offer-resolution.local');
  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'offer-resolution',
      schemaVersion: 'offer_service.v0.1'
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/offers/find') {
    const body = findOffersInputSchema.parse(await readJson(request)) as OfferRequestInput;
    sendJson(response, 200, await service.findOffers(body));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/offers/verify') {
    const body = verifyOfferInputSchema.parse(await readJson(request)) as VerifyOfferInput;
    sendJson(response, 200, await service.verifyOffer(body));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/watches') {
    const body = watchOffersInputSchema.parse(await readJson(request)) as WatchOffersInput;
    const result = await service.watchOffers(body);
    sendJson(response, result.created ? 201 : 200, result);
    return;
  }
  const watchMatch = /^\/v1\/watches\/([^/]+)$/.exec(url.pathname);
  if (request.method === 'GET' && watchMatch) {
    const watch = await service.getWatch(decodeURIComponent(watchMatch[1]));
    if (!watch) {
      sendJson(response, 404, {
        error: 'watch_not_found',
        message: 'No offer watch exists with that ID.'
      });
      return;
    }
    sendJson(response, 200, watch);
    return;
  }
  sendJson(response, 404, {
    error: 'not_found',
    message: 'The requested Offer Resolution route does not exist.'
  });
}

export function createOfferHttpHandler(service: OfferService): RequestListener {
  return (request, response) => {
    void handleRequest(service, request, response).catch((error: unknown) => {
      sendJson(response, 400, {
        error: 'invalid_request',
        message: error instanceof Error ? error.message : 'The request could not be processed.'
      });
    });
  };
}
