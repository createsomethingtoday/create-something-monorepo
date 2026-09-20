import { redirect, error } from '@sveltejs/kit';
import { publicNetwork, type Network } from '$lib/server/networks';
export const load = async ({ locals, platform }) => {
  if (!locals.identity) redirect(303, '/login?next=/dashboard');
  if (!platform?.env.DB) error(503, 'Network management is temporarily unavailable.');
  const { results } = await platform.env.DB.prepare(
    "SELECT * FROM networks WHERE owner_id = ? AND kind <> 'support' ORDER BY created_at DESC"
  )
    .bind(locals.identity.subject)
    .all<Network>();
  const application = await platform.env.DB.prepare(
    'SELECT status FROM creator_applications WHERE subject=?'
  )
    .bind(locals.identity.subject)
    .first<{ status: string }>();
  return { networks: results.map(publicNetwork), approved: application?.status === 'approved' };
};
