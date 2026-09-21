import { redirect, error } from '@sveltejs/kit';
import { isReviewer } from '$lib/server/admission';
export const load = async ({ locals, platform, fetch }) => {
  if (!locals.identity) redirect(303, '/login?next=/impact');
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    error(403, 'Reviewer access required.');
  const response = await fetch('/api/impact');
  if (!response.ok) error(503, 'Impact report unavailable.');
  return { report: await response.json() };
};
