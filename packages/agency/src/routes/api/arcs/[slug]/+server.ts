import { toAtlasStoryAdapter } from '@create-something/atlas-composition';
import { error, json } from '@sveltejs/kit';
import { getAgencyArc } from '$lib/server/arc-catalog';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const arc = getAgencyArc(params.slug);
  if (!arc) error(404, 'Arc not found');
  const route = arc.composition.routes.find((candidate) => candidate.kind === 'arc');
  if (!route) error(500, 'Arc route missing');
  return json(
    { ...arc, story: toAtlasStoryAdapter(arc.composition, route.id) },
    { headers: { 'cache-control': 'public, max-age=300' } }
  );
};
