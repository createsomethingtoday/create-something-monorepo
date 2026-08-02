import { discoverConcepts } from '$lib/config/discoverConcepts';

const pageModules = import.meta.glob('/src/routes/**/+page.svelte');

function routePathFromFile(file: string): string | null {
  const match = file.match(/^\/src\/routes(.*)\/\+page\.svelte$/);
  if (!match || match[1].includes('[')) return null;
  return match[1] || '/';
}

export function getSpaceSitemapPaths(): string[] {
  const staticPaths = Object.keys(pageModules)
    .map(routePathFromFile)
    .filter((path): path is string => path !== null);
  const conceptPaths = discoverConcepts.map((concept) => `/discover/${concept.slug}`);

  return [...new Set([...staticPaths, ...conceptPaths])];
}
