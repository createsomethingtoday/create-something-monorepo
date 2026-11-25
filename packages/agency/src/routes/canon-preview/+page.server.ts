import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ url }) => {
  if (!dev) error(404, 'Local review fixture');
  const surface = ['delivery', 'services', 'map'].includes(url.searchParams.get('surface') ?? '') ? url.searchParams.get('surface')! : 'delivery';
  return { surface, proposed: url.searchParams.get('variant') === 'proposed' };
};
