import { foundationEntry } from '$lib/server/learning';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, platform }) => ({
  foundation: platform?.env.DB ? await foundationEntry(platform.env.DB, locals) : null
});
