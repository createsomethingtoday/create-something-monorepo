import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumePublishLimit, createShare, purgeExpiredPublishLimits, purgeExpiredShares } from '$lib/share';
import { readJsonBodyBounded, RequestBodyTooLargeError } from '$lib/request-body';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
export const POST: RequestHandler = async ({ request, platform, url, getClientAddress }) => {
  if (request.headers.get('origin') !== url.origin) error(403, 'Sharing request denied.');
  const db = platform?.env.DRAW_DB, secret = platform?.env.DRAW_SHARE_RATE_SECRET;
  if (!db || !secret) error(503, 'Sharing is temporarily unavailable.');
  if (!await consumePublishLimit(db, getClientAddress(), secret)) error(429, 'Try sharing again later.');
  await purgeExpiredShares(db);
  await purgeExpiredPublishLimits(db);
  let body: unknown; try { body = await readJsonBodyBounded(request, 520_000); } catch (cause) { if (cause instanceof RequestBodyTooLargeError) error(413, 'Snapshot exceeds Draw sharing limits.'); error(400, 'Invalid sharing request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) error(400, 'Invalid sharing request.');
  try {
    const created = await createShare(db, (body as { document?: unknown }).document, (body as { expiresAt?: string }).expiresAt);
    return json({ shareId: created.shareId, url: `/s/${created.shareId}`, managementToken: created.managementToken, revision: created.revision, publishedAt: created.publishedAt, expiresAt: created.expiresAt }, { status: 201, headers });
  } catch { error(400, 'Snapshot could not be published.'); }
};
