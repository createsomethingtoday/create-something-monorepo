import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { IO_EXPERIMENTS_URL, ioExperimentDestination } from '$lib/data/ioResearchLinks';

export const load: PageServerLoad = ({ params }) => {
  const destination = ioExperimentDestination(params.slug);
  // Unknown slugs may gain an exact mapping later; do not cache the fallback permanently.
  redirect(destination === IO_EXPERIMENTS_URL ? 302 : 301, destination);
};
