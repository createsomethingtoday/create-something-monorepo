import { fail, redirect } from '@sveltejs/kit';
import { dashboardAccessKey } from '$lib/server/access';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, platform, url }) => {
    const data = await request.formData();
    const key = String(data.get('key') ?? '');
    const expected = dashboardAccessKey(platform?.env);

    if (!expected || key.length === 0 || key !== expected) {
      return fail(403, { error: 'Invalid access key.' });
    }

    cookies.set('dash_key', key, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });

    const next = url.searchParams.get('next') ?? '/';
    redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/');
  }
};
