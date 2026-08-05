/**
 * webflow-template-views — first-party view beacon for the template
 * marketplace.
 *
 * The Segment path that produced `Template Marketplace Viewed` was
 * decommissioned on 2026-07-21 (marketing Segment decoupling,
 * webflow/webflow#112237), freezing creator-facing view counts. This worker
 * collects views directly from the Templates marketplace site's custom code
 * and rolls them up per template per UTC day in D1.
 *
 * Endpoints:
 *   POST /v            beacon ingest (text/plain JSON, no preflight needed)
 *   GET  /stats        daily rollups   (Bearer STATS_API_KEY)
 *   GET  /             health
 */

import { corsHeaders, isLikelyBot, parseBeacon, parseBeaconQuery, utcDay } from './beacon';
import type { BeaconEvent } from './beacon';

export interface Env {
	DB: D1Database;
	VIEWS_AE?: AnalyticsEngineDataset;
	STATS_API_KEY?: string;
	ALLOWED_ORIGINS: string;
}

const MAX_BODY_BYTES = 2048;

function recordView(event: BeaconEvent, env: Env, ctx: ExecutionContext): void {
	const day = utcDay();
	ctx.waitUntil(
		(async () => {
			await env.DB.prepare(
				`INSERT INTO template_views_daily (day, slug, views, sessions) VALUES (?, ?, 1, ?)
				 ON CONFLICT (day, slug) DO UPDATE SET
				   views = views + 1,
				   sessions = sessions + excluded.sessions`
			)
				.bind(day, event.slug, event.newSession ? 1 : 0)
				.run();

			env.VIEWS_AE?.writeDataPoint({
				blobs: [event.slug, event.path, event.referrerHost],
				doubles: [event.newSession ? 1 : 0],
				indexes: [event.slug]
			});
		})()
	);
}

/**
 * Script-tag transport: webflow.com's enforced CSP restricts connect-src
 * (blocking sendBeacon/fetch from browsers) but leaves script loads
 * unrestricted, so the site snippet delivers views as
 * `<script src=".../t.js?s=...&p=...&u=...">`.
 */
function ingestScript(request: Request, env: Env, ctx: ExecutionContext): Response {
	const headers = {
		'Content-Type': 'application/javascript',
		'Cache-Control': 'no-store, private'
	};

	if (!isLikelyBot(request.headers.get('User-Agent'))) {
		const event = parseBeaconQuery(new URL(request.url).searchParams);
		if (event) recordView(event, env, ctx);
	}

	return new Response('/* wf-template-views */', { status: 200, headers });
}

async function ingest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const headers = corsHeaders(request.headers.get('Origin'), env.ALLOWED_ORIGINS);

	if (isLikelyBot(request.headers.get('User-Agent'))) {
		return new Response(null, { status: 204, headers });
	}

	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) {
		return new Response(null, { status: 413, headers });
	}

	const event = parseBeacon(raw);
	if (!event) {
		return new Response(null, { status: 400, headers });
	}

	recordView(event, env, ctx);
	return new Response(null, { status: 204, headers });
}

async function stats(request: Request, env: Env): Promise<Response> {
	const auth = request.headers.get('Authorization') ?? '';
	if (!env.STATS_API_KEY || auth !== `Bearer ${env.STATS_API_KEY}`) {
		return Response.json({ error: 'unauthorized' }, { status: 401 });
	}

	const url = new URL(request.url);
	const slug = url.searchParams.get('slug');
	const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 30)));
	const since = utcDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

	const query = slug
		? env.DB.prepare(
				'SELECT day, slug, views, sessions FROM template_views_daily WHERE slug = ? AND day >= ? ORDER BY day'
			).bind(slug, since)
		: env.DB.prepare(
				'SELECT day, slug, views, sessions FROM template_views_daily WHERE day >= ? ORDER BY day, slug'
			).bind(since);

	const { results } = await query.all();
	return Response.json({ since, days, rows: results });
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request.headers.get('Origin'), env.ALLOWED_ORIGINS)
			});
		}

		if (request.method === 'POST' && url.pathname === '/v') {
			return ingest(request, env, ctx);
		}

		if (request.method === 'GET' && url.pathname === '/t.js') {
			return ingestScript(request, env, ctx);
		}

		if (request.method === 'GET' && url.pathname === '/stats') {
			return stats(request, env);
		}

		if (request.method === 'GET' && url.pathname === '/') {
			return Response.json({ service: 'webflow-template-views', status: 'ok' });
		}

		return new Response('Not found', { status: 404 });
	}
} satisfies ExportedHandler<Env>;
