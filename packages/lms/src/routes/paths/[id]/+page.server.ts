import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPath } from '$lib/content/paths';

export const load: PageServerLoad = async ({ params }) => {
  const path = getPath(params.id);

  if (!path) {
    throw error(404, 'Path not found');
  }

  return {
    path
  };
};
