import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const hasSession = cookies.get('session');
	if (hasSession) {
		throw redirect(303, '/dashboard');
	}
	throw redirect(303, '/login');
};
