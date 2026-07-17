import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEFAULT_REDIRECT = '/dashboard';

function safeRedirect(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT;
	return value;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'));

	if (locals.user) {
		throw redirect(302, redirectTo);
	}

	return {
		redirectTo,
		error: url.searchParams.get('error') || null,
	};
};
