import { ARC_CATALOG_COUNTS } from '@create-something/playbook-mcp/arcs';
import { json } from '@sveltejs/kit';
import { getAgencyArcCatalog } from '$lib/server/arc-catalog';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  const arcs = getAgencyArcCatalog();
  return json(
    { arcs, counts: ARC_CATALOG_COUNTS, total: arcs.length },
    { headers: { 'cache-control': 'public, max-age=300' } }
  );
};
