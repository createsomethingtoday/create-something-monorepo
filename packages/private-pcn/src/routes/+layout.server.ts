import { isReviewer } from '$lib/server/admission';
import type { LayoutServerLoad } from './$types';
import { publicNetwork } from '$lib/server/networks';
export const load: LayoutServerLoad = ({ locals, platform }) => ({
  selfServiceEnabled: platform?.env.PCN_SELF_SERVICE_ENABLED === 'true',
  identity: locals.identity,
  impersonation: locals.impersonation || null,
  supportEnabled: platform?.env.PCN_IMPERSONATION_ENABLED === 'true',
  reviewer: !!platform?.env && isReviewer(locals.identity, platform.env),
  network: locals.network ? publicNetwork(locals.network) : null
});
