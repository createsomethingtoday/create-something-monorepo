import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseArcExportRoute, renderArcJsonExport, renderArcPdfExport, renderArcWebExport } from '$lib/server/arc-export';
import { getArcDocument, getArcVersion, getOrCreateAppReviewArc, listArcReceipts } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';

const headers = { 'cache-control': 'no-store, private', 'x-robots-tag': 'noindex, nofollow' };

export const GET: RequestHandler = async ({ locals, params, platform, url }) => {
  if (!locals.admin) return json({ error: 'Admin login required.' }, { status: 401, headers });
  const db = getDb(platform);
  const requestedRevision = url.searchParams.get('revision');
  const revision = requestedRevision ? Number(requestedRevision) : null;
  const document = revision && Number.isInteger(revision)
    ? await getArcVersion(db, params.id, revision)
    : params.id === 'app-review-governance'
      ? await getOrCreateAppReviewArc(db)
      : await getArcDocument(db, params.id);
  if (!document) return json({ error: 'Arc or version not found.' }, { status: 404, headers });
  const routeId = parseArcExportRoute(url.searchParams.get('route'));
  const receipt = (await listArcReceipts(db, params.id, 1))[0];
  const filename = `${params.id}-${routeId.replace('app-review-governance-', '')}-r${document.revision}`;

  if (params.format === 'web') {
    return new Response(renderArcWebExport(document, routeId, receipt), { headers: { ...headers, 'content-type': 'text/html; charset=utf-8', 'content-disposition': `attachment; filename="${filename}.html"` } });
  }
  if (params.format === 'pdf') {
    return new Response(renderArcPdfExport(document, routeId, receipt), { headers: { ...headers, 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${filename}.pdf"` } });
  }
  if (params.format === 'json') {
    return json(renderArcJsonExport(document, routeId, receipt), { headers: { ...headers, 'content-disposition': `attachment; filename="${filename}.json"` } });
  }
  return json({ error: 'Export format must be web, pdf, or json.' }, { status: 404, headers });
};
