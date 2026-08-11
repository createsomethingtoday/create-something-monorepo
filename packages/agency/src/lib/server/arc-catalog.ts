import {
  getArcBySlug,
  listArcSummaries,
  type ArcCatalogEntry,
  type ArcCatalogSummary
} from '@create-something/playbook-mcp/arcs';

export function getAgencyArcCatalog(): ArcCatalogSummary[] {
  return listArcSummaries();
}

export function getAgencyArc(slug: string): ArcCatalogEntry | undefined {
  return getArcBySlug(slug);
}
