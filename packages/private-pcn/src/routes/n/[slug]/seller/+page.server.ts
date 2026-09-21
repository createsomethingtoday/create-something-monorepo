import { error, redirect } from '@sveltejs/kit';
import { ownsNetwork } from '$lib/server/builder-assets';
import { readSeller } from '$lib/server/seller-accounts';
export const load = async ({ locals, platform, url }) => {
  if (!locals.identity) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  if (!ownsNetwork(locals)) error(403, 'Only the network owner can manage seller payments.');
  if (!platform?.env.DB) error(503, 'Seller setup unavailable.');
  const seller = await readSeller(platform.env.DB, locals.identity.subject);
  return {
    sellerState: seller?.state || 'not_started',
    onboardingEnabled: platform.env.PCN_CONNECT_ENABLED === 'true',
    feesConfirmed: platform.env.PCN_ASSET_FEE_POLICY === 'hosting_only_v1'
  };
};
