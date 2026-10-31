import type { RequestHandler } from './$types';
import { catalog, loadFoundationContent } from '$lib/server/foundation/catalog';
import { apiJson, BodyTooLargeError, guard, preflight, readBoundedJson } from '$lib/server/foundation/guard';
import { handleMcp } from '$lib/server/foundation/service';

export const OPTIONS: RequestHandler = () => preflight();
export const POST: RequestHandler = async (event) => {
  const rejected = await guard(event, true);
  if (rejected) return rejected;
  if (event.request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return apiJson({ error: 'Use application/json.' }, 415);
  let body: unknown;
  try { body = await readBoundedJson(event.request); }
  catch (error) { return apiJson({ error: error instanceof BodyTooLargeError ? error.message : 'Invalid JSON.' }, error instanceof BodyTooLargeError ? 413 : 400); }
  const response = await handleMcp(event.request, body, catalog, loadFoundationContent);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
};
export const GET: RequestHandler = async (event) => (await guard(event, true)) ?? apiJson({ error: 'This stateless MCP uses POST; SSE listening is not offered.' }, 405, { Allow: 'POST, OPTIONS' });
export const DELETE: RequestHandler = async (event) => (await guard(event, true)) ?? apiJson({ error: 'No writable state or sessions.' }, 405, { Allow: 'POST, OPTIONS' });
