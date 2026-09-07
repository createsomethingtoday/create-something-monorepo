import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purgeExpiredPublishLimits, readShare, revokeShare, updateShare } from '$lib/share';
import { readJsonBodyBounded, RequestBodyTooLargeError } from '$lib/request-body';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
const database = (platform: App.Platform | undefined) => platform?.env.DRAW_DB ?? error(503, 'Sharing is temporarily unavailable.');
const token = (request: Request) => request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1] ?? '';
const sameOrigin = (request: Request, origin: string) => { if (request.headers.get('origin') !== origin) error(403, 'Sharing request denied.'); };

export const GET: RequestHandler = async ({ params, platform }) => {
  const share = await readShare(database(platform), params.shareId);
  if (!share) error(404, 'Snapshot not found.');
  return json(share, { headers });
};

export const PUT: RequestHandler = async ({ params, platform, request, url }) => {
  sameOrigin(request, url.origin);
  const db = database(platform), secret = platform?.env.DRAW_SHARE_RATE_SECRET;
  if (!secret) error(503, 'Sharing is temporarily unavailable.');
  let body: unknown; try { body = await readJsonBodyBounded(request, 520_000); } catch (cause) { if (cause instanceof RequestBodyTooLargeError) error(413, 'Snapshot exceeds Draw sharing limits.'); error(400, 'Invalid sharing request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) error(400, 'Invalid sharing request.');
  const expectedRevision = (body as { expectedRevision?: unknown }).expectedRevision;
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 1) error(400, 'A valid expected revision is required.');
  let result; try { result = await updateShare(db, params.shareId, token(request), Number(expectedRevision), (body as { document?: unknown }).document, secret); } catch { error(400, 'Snapshot could not be updated.'); }
  if (!result) error(404, 'Snapshot not found.');
  if ('conflict' in result) return json({ error: 'Snapshot revision is stale.', revision: result.revision }, { status: 409, headers });
  if ('rateLimited' in result) error(429, 'Try updating this snapshot again later.');
  await purgeExpiredPublishLimits(db);
  return json(result, { headers });
};

export const DELETE: RequestHandler = async ({ params, platform, request, url }) => {
  sameOrigin(request, url.origin);
  if (!await revokeShare(database(platform), params.shareId, token(request))) error(404, 'Snapshot not found.');
  return new Response(null, { status: 204, headers });
};
