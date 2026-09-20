import { redirect, error } from '@sveltejs/kit';
import { publicNetwork, type Network } from '$lib/server/networks';
export const load = async ({ locals, platform }) => {
  if (!locals.identity) redirect(303, '/login?next=/dashboard');
  if (!platform?.env.DB) error(503, 'Network management is temporarily unavailable.');
  const { results } = await platform.env.DB.prepare(
    'SELECT * FROM networks WHERE owner_id = ? ORDER BY created_at DESC'
  )
    .bind(locals.identity.subject)
    .all<Network>();
  return { networks: results.map(publicNetwork) };
};
