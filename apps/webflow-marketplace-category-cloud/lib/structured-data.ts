import type { CategoryMetadata, SearchItem } from './template-search';

export function buildCategoryStructuredData(category: CategoryMetadata, items: SearchItem[], page: number) {
  const itemList = items.map((item, index) => ({
    '@type': 'ListItem',
    position: (page - 1) * 24 + index + 1,
    name: item.name,
    url: item.url ?? `https://webflow.com/templates/html/${item.template_slug}`,
  }));

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Templates',
          item: 'https://webflow.com/templates',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category.name,
          item: category.canonical_url,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.title,
      description: category.description,
      url: page > 1 ? `${category.canonical_url}?page=${page}` : category.canonical_url,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: category.total_items,
        itemListElement: itemList,
      },
    },
  ];
}
