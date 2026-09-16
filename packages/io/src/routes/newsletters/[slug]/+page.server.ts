import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';
import { getPublishedNewsletter } from '$lib/server/newsletterArchive';

export const load: PageServerLoad = async ({ params }) => {
  const edition = getPublishedNewsletter(params.slug);
  if (!edition) throw error(404, 'Newsletter edition not found');

  return {
    edition: {
      ...edition,
      html: marked.parse(edition.markdown, { async: false, gfm: true }) as string
    }
  };
};
