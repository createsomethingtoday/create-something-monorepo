/**
 * Where to send a reader after sign-in, when they arrived from a link to one
 * asset (the review feedback email). The path is kept in a short-lived cookie
 * while they sign in. Only an asset page is ever stored or followed, so the
 * value can never send someone off this site or to an arbitrary page.
 */

export const POST_LOGIN_COOKIE = 'wf_post_login_path';

export const POST_LOGIN_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	path: '/' as const,
	// Long enough to receive and enter a sign-in code.
	maxAge: 30 * 60,
	// The link is opened as a top-level page; the cookie is not needed in an embed.
	sameSite: 'lax' as const
};

const ASSET_PAGE = /^\/assets\/rec[A-Za-z0-9]{14}(\?tab=(overview|timeline|analytics))?$/;

/** The path when it is an asset page (with an optional tab), otherwise null. */
export function postLoginPath(value: string | null | undefined): string | null {
	return typeof value === 'string' && ASSET_PAGE.test(value) ? value : null;
}
