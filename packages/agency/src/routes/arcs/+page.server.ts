import { ARC_CATALOG_COUNTS } from '@create-something/playbook-mcp/arcs';
import { getAgencyArcCatalog } from '$lib/server/arc-catalog';

export const load = () => ({
  arcs: getAgencyArcCatalog(),
  counts: ARC_CATALOG_COUNTS
});
