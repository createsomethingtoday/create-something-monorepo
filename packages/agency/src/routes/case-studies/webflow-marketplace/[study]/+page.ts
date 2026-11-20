import { error } from '@sveltejs/kit';
import { webflowStudies } from '$lib/data/webflowMarketplace';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
  const study = webflowStudies.find(study => study.id === params.study && study.id !== 'overview');
  if (!study) error(404, 'This Webflow study was not found.');
  return { study };
};
