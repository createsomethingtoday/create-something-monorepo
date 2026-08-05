/**
 * Beacon parsing and filtering. Pure functions so they stay unit-testable
 * without a Workers runtime.
 *
 * Payload contract (sent via navigator.sendBeacon as text/plain JSON so the
 * request stays CORS-"simple" and needs no preflight):
 *   { s: string  — template slug
 *     p: string  — page pathname
 *     r?: string — document.referrer
 *     u?: 0 | 1  — 1 when this is the first view of this template in the
 *                  visitor's browser session (sessionStorage dedupe) }
 */

export interface BeaconEvent {
	slug: string;
	path: string;
	referrerHost: string;
	newSession: boolean;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

// Conservative UA screen: we would rather undercount than count crawlers.
const BOT_UA_PATTERN =
	/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|monitor|preview|scrape|python|curl|wget|httpclient|facebookexternalhit|embedly|vercel|render|checker/i;

export function isLikelyBot(userAgent: string | null): boolean {
	if (!userAgent || userAgent.length < 10) return true;
	return BOT_UA_PATTERN.test(userAgent);
}

export function slugFromPath(path: string): string | null {
	const match = /^\/templates\/html\/([a-z0-9][a-z0-9-]*)\/?$/.exec(path);
	return match ? match[1] : null;
}

export function parseBeacon(raw: string): BeaconEvent | null {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof data !== 'object' || data === null) return null;

	return beaconFromFields(data as Record<string, unknown>);
}

/**
 * Query-string variant for the script-tag transport. webflow.com's enforced
 * CSP allowlists connect-src (blocking sendBeacon/fetch to this worker) but
 * sets no script-src/default-src, so a <script src> GET is the delivery path
 * that actually works from real browsers.
 */
export function parseBeaconQuery(params: URLSearchParams): BeaconEvent | null {
	return beaconFromFields({
		s: params.get('s') ?? undefined,
		p: params.get('p') ?? undefined,
		r: params.get('r') ?? undefined,
		u: params.get('u') ?? undefined
	});
}

function beaconFromFields(body: Record<string, unknown>): BeaconEvent | null {
	const path = typeof body.p === 'string' ? body.p.slice(0, 512) : '';
	if (!path.startsWith('/templates')) return null;

	// Trust the URL over the client-supplied slug on detail pages.
	const pathSlug = slugFromPath(path);
	const claimedSlug = typeof body.s === 'string' ? body.s.trim().toLowerCase() : '';
	const slug = pathSlug ?? claimedSlug;
	if (!SLUG_PATTERN.test(slug)) return null;

	let referrerHost = '';
	if (typeof body.r === 'string' && body.r) {
		try {
			referrerHost = new URL(body.r).hostname.slice(0, 128);
		} catch {
			referrerHost = '';
		}
	}

	return {
		slug,
		path,
		referrerHost,
		newSession: body.u === 1 || body.u === '1' || body.u === true
	};
}

export function utcDay(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

export function corsHeaders(origin: string | null, allowedOrigins: string): Record<string, string> {
	const allowed = allowedOrigins.split(',').map((entry) => entry.trim());
	const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';
	return {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin'
	};
}
