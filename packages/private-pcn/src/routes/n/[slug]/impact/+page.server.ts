import { redirect, error } from '@sveltejs/kit';
export const load = async ({ locals, params, fetch, url }) => {
  if (!locals.identity) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  if (!locals.network || locals.network.owner_id !== locals.identity.subject)
    error(403, 'Network owner access required.');
  const response = await fetch(`/api/networks/${params.slug}/impact`);
  if (!response.ok) error(503, 'Impact report unavailable.');
  return { report: await response.json() };
};
