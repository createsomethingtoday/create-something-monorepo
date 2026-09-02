import {
  getPublishedNewsletterEditions,
  parseNewsletterEdition,
  type NewsletterEdition
} from '$lib/newsletter/archive';

const contentFiles = import.meta.glob('/content/newsletters/*/newsletter.md', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

const editions = Object.entries(contentFiles).map(([path, source]) => {
  const match = path.match(/^\/content\/newsletters\/([^/]+)\/newsletter\.md$/);
  if (!match) throw new Error(`Unexpected newsletter source path: ${path}`);
  return parseNewsletterEdition(match[1], source);
});

export function getPublishedNewsletters(now = new Date()): NewsletterEdition[] {
  return getPublishedNewsletterEditions(editions, now);
}

export function getPublishedNewsletter(slug: string, now = new Date()): NewsletterEdition | null {
  return getPublishedNewsletters(now).find((edition) => edition.slug === slug) ?? null;
}
