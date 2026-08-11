import { getCanonPaths, getPatternSlugs } from '$lib/content-loader';
import { playbooks } from '$lib/operator-library/playbooks';
import { loadMasters } from '$lib/server/masters';

const CORE_PATHS = [
  '/',
  '/brand',
  '/canon',
  '/ethos',
  '/masters',
  '/patterns',
  '/playbooks',
  '/presentations',
  '/principles',
  '/readiness',
  '/standards',
  '/taste',
  '/voice'
];

type SitemapCatalog = {
  canonPaths: string[][];
  patternSlugs: string[];
  masterSlugs: string[];
};

export function buildLtdSitemapPaths({
  canonPaths,
  patternSlugs,
  masterSlugs
}: SitemapCatalog): string[] {
  const detailPaths = [
    ...canonPaths.map((parts) => (parts.length === 0 ? '/canon' : `/canon/${parts.join('/')}`)),
    ...patternSlugs.map((slug) => `/patterns/${slug}`),
    ...playbooks.map((playbook) => `/playbooks/${playbook.slug}`),
    ...masterSlugs.map((slug) => `/masters/${slug}`)
  ];

  return [...new Set([...CORE_PATHS, ...detailPaths])];
}

export async function getLtdSitemapPaths(db: D1Database | undefined): Promise<string[]> {
  const [canonPaths, patternSlugs, masters] = await Promise.all([
    getCanonPaths(),
    getPatternSlugs(),
    loadMasters(db)
  ]);

  return buildLtdSitemapPaths({
    canonPaths,
    patternSlugs,
    masterSlugs: masters.map((master) => master.slug)
  });
}
