import { json } from '@sveltejs/kit';
import { getPublishedNewsletters } from '$lib/server/newsletterArchive';

/** Read-only projection of the archive's existing publication-filtered source. */
export const GET = () =>
  json(
    {
      editions: getPublishedNewsletters().map(
        ({ slug, title, description, deliveryTarget, readingMinutes, hero }) => ({
          slug,
          title,
          description,
          deliveryTarget,
          readingMinutes,
          hero
        })
      )
    },
    { headers: { 'cache-control': 'no-store' } }
  );
