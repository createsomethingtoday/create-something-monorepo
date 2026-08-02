import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { getWorkflowPage, workflowPages } from '$lib/data/workflowPages';

export const prerender = true;

export function entries(): ReturnType<EntryGenerator> {
  return workflowPages.map(({ slug }) => ({ slug }));
}

export const load: PageServerLoad = ({ params }) => {
  const guide = getWorkflowPage(params.slug);

  if (!guide) {
    error(404, 'Workflow guide not found');
  }

  return {
    guide,
    related: guide.relatedSlugs
      .map((slug) => getWorkflowPage(slug))
      .filter((page) => page !== undefined)
  };
};
