import { error } from '@sveltejs/kit';
import { getAgencyArc } from '$lib/server/arc-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const arc = getAgencyArc(params.slug);
  if (!arc || arc.source.kind === 'prototype') error(404, 'Arc not found');
  return { arc };
};
