import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	// Consolidated admin surface: /admin is now a compatibility alias.
	redirect(307, '/admin/videos');
};
