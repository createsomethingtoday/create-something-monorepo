import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumePublishLimit, createShare } from '$lib/share';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
export const POST: RequestHandler = async ({ request, platform, url, getClientAddress }) => {
  if (request.headers.get('origin') !== url.origin) error(403, 'Sharing request denied.');
  const db = platform?.env.DRAW_DB, secret = platform?.env.DRAW_SHARE_RATE_SECRET;
  if (!db || !secret) error(503, 'Sharing is temporarily unavailable.');
  if (!await consumePublishLimit(db, getClientAddress(), secret)) error(429, 'Try sharing again later.');
  if (Number(request.headers.get('content-length') ?? 0) > 520_000) error(413, 'Snapshot exceeds Draw sharing limits.');
  let body: unknown; try { const source = await request.text(); if (new TextEncoder().encode(source).length > 520_000) error(413, 'Snapshot exceeds Draw sharing limits.'); body = JSON.parse(source); } catch (cause) { if ((cause as { status?: number }).status === 413) throw cause; error(400, 'Invalid sharing request.'); }
  try {
    const created = await createShare(db, (body as { document?: unknown }).document, (body as { expiresAt?: string }).expiresAt);
    return json({ shareId: created.shareId, url: `/s/${created.shareId}`, managementToken: created.managementToken, revision: created.revision, publishedAt: created.publishedAt, expiresAt: created.expiresAt }, { status: 201, headers });
  } catch { error(400, 'Snapshot could not be published.'); }
};
