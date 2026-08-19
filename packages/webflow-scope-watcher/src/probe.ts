/**
 * Scope Probe Increment 2: consent-screen capture (SCA-152).
 *
 * Uses Cloudflare Browser Rendering's /snapshot endpoint (one call → rendered
 * HTML + screenshot) to load the OAuth authorize URL as the probe account and
 * capture what a developer's consent screen shows for a set of scopes. HTML is
 * used to detect the logged-out state (expired/missing session cookie) so a
 * login page is never mistaken for a consent screen.
 */

export interface ProbeEnv {
	STATE: KVNamespace;
	/** Cloudflare account hosting Browser Rendering (var) */
	CF_ACCOUNT_ID: string;
	/** Browser Rendering API token (secret) */
	BROWSER_RENDERING_TOKEN?: string;
	/** client_id of the standing Scope Probe app (secret; set after setup checklist) */
	PROBE_CLIENT_ID?: string;
	/** Raw Cookie header of the probe account's webflow.com session (secret) */
	PROBE_SESSION_COOKIE?: string;
}

export interface ConsentCapture {
	ok: boolean;
	/** true when the render showed the login page — session cookie missing/expired */
	loginDetected?: boolean;
	/** KV id of the stored PNG; served at GET /consent/<id>.png */
	imageId?: string;
	authorizeUrl?: string;
	error?: string;
}

/** Parses a raw Cookie header ("a=1; b=2") into Browser Rendering cookie params. */
export function parseCookieHeader(
	header: string
): Array<{ name: string; value: string; domain: string; path: string }> {
	return header
		.split(';')
		.map((pair) => pair.trim())
		.filter((pair) => pair.includes('='))
		.map((pair) => {
			const eq = pair.indexOf('=');
			return {
				name: pair.slice(0, eq).trim(),
				value: pair.slice(eq + 1).trim(),
				domain: '.webflow.com',
				path: '/',
			};
		})
		.filter((c) => c.name.length > 0);
}

export function buildAuthorizeUrl(clientId: string, scopes: string[]): string {
	const url = new URL('https://webflow.com/oauth/authorize');
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', clientId);
	if (scopes.length > 0) url.searchParams.set('scope', scopes.join(' '));
	return url.toString();
}

/** Markers observed on webflow.com's logged-out flows (verified 2026-08-18). */
export function detectLoginPage(html: string): boolean {
	return html.includes('Log in to your account') || html.includes('Please sign back in');
}

export async function captureConsent(
	env: ProbeEnv,
	opts: { scopes: string[]; clientId?: string }
): Promise<ConsentCapture> {
	if (!env.BROWSER_RENDERING_TOKEN) {
		return { ok: false, error: 'BROWSER_RENDERING_TOKEN not configured' };
	}
	const clientId = opts.clientId ?? env.PROBE_CLIENT_ID;
	if (!clientId) {
		return {
			ok: false,
			error:
				'PROBE_CLIENT_ID not configured — run the setup checklist in docs/scope-probe-research.md',
		};
	}

	const authorizeUrl = buildAuthorizeUrl(clientId, opts.scopes);
	const cookies = env.PROBE_SESSION_COOKIE ? parseCookieHeader(env.PROBE_SESSION_COOKIE) : [];

	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/snapshot`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				url: authorizeUrl,
				viewport: { width: 1280, height: 1200 },
				// The authorize screen renders client-side after auth/data XHRs, so
				// wait for network idle plus a settle delay — without this the capture
				// races to a blank page (verified 2026-08-18).
				gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
				waitForTimeout: 4000,
				...(cookies.length > 0 ? { cookies } : {}),
			}),
		}
	);
	if (!res.ok) {
		return { ok: false, error: `browser rendering ${res.status}`, authorizeUrl };
	}
	const json = (await res.json()) as {
		success: boolean;
		result?: { screenshot: string; content: string };
	};
	if (!json.success || !json.result?.screenshot) {
		return { ok: false, error: 'browser rendering returned no snapshot', authorizeUrl };
	}

	const loginDetected = detectLoginPage(json.result.content ?? '');
	const idBytes = new Uint8Array(16);
	crypto.getRandomValues(idBytes);
	const imageId = [...idBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
	const png = Uint8Array.from(atob(json.result.screenshot), (c) => c.charCodeAt(0));
	await env.STATE.put(`consent:${imageId}`, png.buffer, {
		expirationTtl: 60 * 60 * 24 * 90,
		metadata: {
			scopes: opts.scopes.join(' '),
			at: new Date().toISOString(),
			loginDetected,
		},
	});

	return { ok: true, loginDetected, imageId, authorizeUrl };
}
