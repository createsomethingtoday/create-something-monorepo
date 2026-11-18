import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { POST_LOGIN_COOKIE, postLoginPath } from '$lib/server/post-login';
import { getAirtableClient, type Asset } from '$lib/server/airtable';
import { getCachedAssets, setCachedAssets } from '$lib/server/assets-cache';
import { applyTemplateViews } from '$lib/server/template-views';

export const load: PageServerLoad = async ({ locals, platform, depends, cookies }) => {
	// The usual sign-in ends here. A reader who came from a link to one asset
	// (the review feedback email) goes on to that asset, once.
	const remembered = cookies.get(POST_LOGIN_COOKIE);
	if (remembered !== undefined) {
		cookies.delete(POST_LOGIN_COOKIE, { path: '/' });
		const returnTo = locals.user ? postLoginPath(remembered) : null;
		if (returnTo) throw redirect(302, returnTo);
	}

	// Mark this load function as dependent on 'app:assets'
	// so invalidate('app:assets') will trigger a reload
	depends('app:assets');

	// User is guaranteed to exist here due to hooks.server.ts protection
	let assets: Asset[] = [];
	let assetsError: string | null = null;

	if (locals.user?.email && platform?.env) {
		try {
			const kv = platform.env.SESSIONS;
			const cached = kv ? await getCachedAssets(kv, locals.user.email) : null;

			if (cached) {
				assets = cached;
			} else {
				const airtable = getAirtableClient(platform.env);
				assets = await applyTemplateViews(
					platform.env,
					await airtable.getAssetsByEmail(locals.user.email),
					{ waitUntil: (p) => platform.context?.waitUntil(p) }
				);
				if (kv) {
					setCachedAssets(kv, locals.user.email, assets, (p) =>
						platform.context?.waitUntil(p)
					);
				}
			}
		} catch (err) {
			console.error('Error fetching assets:', err);
			assetsError = 'We could not load your assets right now. Refresh to retry.';
		}
	}

	return {
		user: locals.user,
		assets,
		assetsError
	};
};
