import type { LayoutServerLoad } from './$types';
import { publicNetwork } from '$lib/server/networks';
export const load: LayoutServerLoad = ({ locals, platform }) => ({
  selfServiceEnabled: platform?.env.PCN_SELF_SERVICE_ENABLED === 'true',
  identity: locals.identity,
  network: locals.network ? publicNetwork(locals.network) : null
});
