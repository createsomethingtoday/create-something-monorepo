import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = ({ locals, url }) => {
	const admin = requireAdmin(locals, url);
	return { admin, customerOwner: 'Ejohnson@jandjhomehealth.com' };
};
