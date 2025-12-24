import { error } from '@sveltejs/kit';
import { getModule, getRelatedModules } from '$lib/config/modules';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const module = getModule(params.slug);

  if (!module) {
    throw error(404, 'Module not found');
  }

  const relatedModules = getRelatedModules(params.slug);

  return {
    module,
    relatedModules,
  };
};
