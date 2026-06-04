import { redirect } from '@sveltejs/kit';

export function requireAdmin(locals: App.Locals, url: URL): NonNullable<App.Locals['admin']> {
	if (!locals.admin) {
		redirect(302, `/admin?redirect=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
	}

	return locals.admin;
}
