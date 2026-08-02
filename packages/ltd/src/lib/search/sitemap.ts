import { getCanonPaths, getPatternSlugs } from '$lib/content-loader';
import { loadMasters } from '$lib/server/masters';

const CORE_PATHS = [
  '/',
  '/brand',
  '/canon',
  '/ethos',
  '/masters',
  '/patterns',
  '/presentations',
  '/principles',
  '/standards',
  '/taste',
  '/voice'
];

export async function getLtdSitemapPaths(db: D1Database | undefined): Promise<string[]> {
  const [canonPaths, patternSlugs, masters] = await Promise.all([
    getCanonPaths(),
    getPatternSlugs(),
    loadMasters(db)
  ]);

  const dynamicPaths = [
    ...canonPaths.map((parts) => (parts.length === 0 ? '/canon' : `/canon/${parts.join('/')}`)),
    ...patternSlugs.map((slug) => `/patterns/${slug}`),
    ...masters.map((master) => `/masters/${master.slug}`)
  ];

  return [...new Set([...CORE_PATHS, ...dynamicPaths])];
}
