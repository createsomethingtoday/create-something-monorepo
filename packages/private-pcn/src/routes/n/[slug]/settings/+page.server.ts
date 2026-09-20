import { readBilling } from '$lib/server/billing';
import { error, redirect } from '@sveltejs/kit';
export const load = async ({ locals, url, platform }) => {
  if (locals.network?.kind === 'support') redirect(303, `/support/${locals.network.id}`);
  if (!locals.identity) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  if (!locals.network || locals.network.owner_id !== locals.identity.subject)
    error(403, 'Only the network owner can change these settings.');
  const row = platform?.env.DB ? await readBilling(platform.env.DB, locals.network.id) : null;
  const trial = await platform!.env.DB.prepare(
    'SELECT starts_at,ends_at FROM creator_trials WHERE subject=? AND network_id=?'
  )
    .bind(locals.identity.subject, locals.network.id)
    .first<{ starts_at: number; ends_at: number }>();
  const invited = !!(await platform!.env.DB.prepare(
    'SELECT redeemed_by FROM creator_invitations WHERE redeemed_by=?'
  )
    .bind(locals.identity.subject)
    .first());
  return {
    trial,
    invited,
    billing: row
      ? {
          status: row.status,
          periodEnd: row.period_end,
          cancelAtPeriodEnd: !!row.cancel_at_period_end,
          hasCustomer: !!row.customer_id
        }
      : null,
    billingEnabled: platform?.env.PCN_SELF_SERVICE_ENABLED === 'true'
  };
};
