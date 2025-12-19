import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect authenticated users to dashboard
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Redirect unauthenticated users to login
	throw redirect(302, '/login');
};
