import type { PageServerLoad } from './$types';
import { getPublishedNewsletters } from '$lib/server/newsletterArchive';

export const load: PageServerLoad = async () => ({
  editions: getPublishedNewsletters()
});
