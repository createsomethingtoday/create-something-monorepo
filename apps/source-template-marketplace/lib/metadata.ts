import type { Metadata } from 'next';
import { catalogUrl } from './catalog';
import type { Item } from './types';
export async function marketplaceMetadata(
  path: string[],
  search: Record<string, string | string[] | undefined>
): Promise<Metadata> {
  const base: Metadata = { robots: { index: false, follow: false } };
  if (path[1] === 'html' && path[2]) {
    try {
      const response = await fetch(
        catalogUrl(new URLSearchParams({ template_slug: path[2], page_size: '1' })),
        { signal: AbortSignal.timeout(15000), next: { revalidate: 300 } }
      );
      if (!response.ok) throw new Error('Catalog unavailable');
      const body = await response.json();
      const item: Item | undefined = body.items?.find((i: Item) => i.template_slug === path[2]);
      if (item)
        return {
          ...base,
          title: `${item.name} — Webflow website template`,
          description: item.description_short,
          openGraph: {
            title: item.name,
            description: item.description_short,
            images: item.thumbnail_image_url ? [{ url: item.thumbnail_image_url }] : []
          }
        };
    } catch {
      /* Metadata failure must not prevent an actionable client retry. */
    }
    return { ...base, title: 'Template details — Webflow Marketplace' };
  }
  const selected = [
    'q',
    'category_group_slug',
    'child_category_slug',
    'creator_slug',
    'styles',
    'style_slug',
    'tag_slug'
  ]
    .map((key) =>
      typeof search[key] === 'string'
        ? String(search[key])
            .replace(/-websites$/, '')
            .replaceAll('-', ' ')
        : ''
    )
    .find(Boolean);
  return {
    ...base,
    title:
      path[1] === 'all'
        ? `${selected || 'All website'} templates — Webflow Marketplace`
        : 'Website templates — Webflow Marketplace',
    description: 'Discover, preview and compare website templates by independent Webflow creators.'
  };
}
