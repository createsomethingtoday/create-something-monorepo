/**
 * Deterministic fake of the dashboard's /api/storefront proxy contract
 * (src/routes/api/storefront/+server.ts), plus the /api/profile, /api/keys
 * and /api/upload calls the Settings modal makes. In-memory, per page load.
 *
 * Scenarios (?scenario=…):
 *   default      saved draft v2, one pick, never published
 *   empty        no storefront yet (first save creates it)
 *   published    published at v2, draft unchanged
 *   conflict     the next save returns version_conflict (another tab saved)
 *   pending      a previous write is still being applied
 *   propagating  publish returns 202 propagating
 *   suspended    staff suspension: publish/unpublish refused
 *   ineligible   publish fails: a featured template was delisted
 *   flaky        the first save fails with 503; Try again reuses the key
 *   ambiguous    login matches two creator records
 *   disabled     feature flag off: no Storefront tab
 */

export interface LoggedRequest {
	method: string;
	path: string;
	action?: string;
	idempotencyKey?: string | null;
	status: number;
}

type Json = Record<string, unknown>;

const ORIGIN = () => window.location.origin;
const CANDIDATES = [
	{ assetId: 'recFIXTUREASSET01', name: 'Atlas Studio', templateSlug: 'atlas-studio' },
	{ assetId: 'recFIXTUREASSET02', name: 'Harbor Agency', templateSlug: 'harbor-agency' },
	{ assetId: 'recFIXTUREASSET03', name: 'Meridian Portfolio', templateSlug: 'meridian-portfolio' },
	{ assetId: 'recFIXTUREASSET04', name: 'Northwind SaaS', templateSlug: 'northwind-saas' }
];
const LIMITS = { positioning: 120, coverAlt: 160, supportText: 400, note: 240 };

export function installFakeApi(scenario: string, log: (entry: LoggedRequest) => void): void {
	const state = {
		exists: scenario !== 'empty',
		draftVersion: scenario === 'empty' ? 0 : 2,
		status: scenario === 'published' ? 'Published' : scenario === 'suspended' ? 'Suspended' : 'Never published',
		publishedDraftVersion: scenario === 'published' || scenario === 'suspended' ? 2 : (null as number | null),
		publishedAt: scenario === 'published' ? '2026-10-29T12:00:00.000Z' : (null as string | null),
		fields:
			scenario === 'empty'
				? { positioning: null, coverUrl: null, coverAlt: null, portfolioUrl: null, supportText: null, supportUrl: null }
				: {
						positioning: 'Calm, conversion-focused templates for studios',
						coverUrl: null as string | null,
						coverAlt: null as string | null,
						portfolioUrl: 'https://dribbble.com/fixture-studio',
						supportText: null as string | null,
						supportUrl: null as string | null
					},
		selections: scenario === 'empty' ? [] : [{ assetId: CANDIDATES[0].assetId, position: 1, note: 'Our most flexible layout' }],
		revision: scenario === 'published' || scenario === 'suspended' ? 1 : 0,
		lastReceipt: null as Json | null,
		conflictArmed: scenario === 'conflict',
		flakyArmed: scenario === 'flaky',
		idempotency: new Map<string, { fingerprint: string; status: number; body: Json }>()
	};

	const view = (): Json => ({
		enabled: true,
		draft: {
			exists: state.exists,
			draftVersion: state.draftVersion,
			status: state.status,
			publishedDraftVersion: state.publishedDraftVersion,
			publishedAt: state.publishedAt,
			fields: state.fields,
			selections: state.selections
		},
		pending: scenario === 'pending',
		lastReceipt: state.lastReceipt,
		candidates: CANDIDATES
	});

	const respond = (status: number, body: unknown) =>
		new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

	const validateFields = (fields: Json): Array<{ field: string; issue: string }> => {
		const issues: Array<{ field: string; issue: string }> = [];
		const text = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string).trim() : '');
		if (text('positioning').length > LIMITS.positioning) issues.push({ field: 'positioning', issue: 'max_120_chars' });
		if (text('supportText').length > LIMITS.supportText) issues.push({ field: 'supportText', issue: 'max_400_chars' });
		for (const k of ['portfolioUrl']) {
			if (text(k) && !text(k).startsWith('https://')) issues.push({ field: k, issue: 'must_be_https' });
		}
		if (text('supportUrl') && !/^(https:\/\/|mailto:[^%\s?]+@[^\s?]+\.[^\s?]+$)/.test(text('supportUrl'))) {
			issues.push({ field: 'supportUrl', issue: 'must_be_https_or_mailto' });
		}
		if (Boolean(text('supportText')) !== Boolean(text('supportUrl'))) {
			issues.push({ field: 'support', issue: 'text_and_url_required_together' });
		}
		if (text('coverUrl') && !text('coverAlt')) issues.push({ field: 'coverAlt', issue: 'required_with_cover' });
		return issues;
	};

	const handleStorefrontPost = (body: Json, key: string | null): [number, Json] => {
		if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) return [400, { error: 'idempotency_key_required' }];
		const fingerprint = JSON.stringify(body);
		const prior = state.idempotency.get(key);
		if (prior) {
			if (prior.fingerprint !== fingerprint) {
				return [422, { error: 'idempotency_conflict', message: 'This Idempotency-Key was already used with a different request' }];
			}
			return [prior.status, prior.body];
		}
		const result = execute(body);
		// Only committed outcomes are remembered, like the service.
		if (result[0] === 200 || result[0] === 202) state.idempotency.set(key, { fingerprint, status: result[0], body: result[1] });
		return result;
	};

	const receipt = (op: string, readState: string): Json => ({
		publicationRevision: state.revision,
		op,
		status: state.status,
		publishedDraftVersion: state.publishedDraftVersion,
		publishedAt: state.publishedAt,
		readModel: readState === 'propagating' ? 'pending' : 'committed',
		state: readState
	});

	const execute = (body: Json): [number, Json] => {
		if (scenario === 'pending') return [409, { error: 'intent_pending', message: 'A previous change is still being applied' }];
		const expected = body.expectedDraftVersion;
		switch (body.action) {
			case 'save':
			case 'selections': {
				if (state.flakyArmed) {
					state.flakyArmed = false;
					return [503, { error: 'upstream_unavailable', message: 'injected outage' }];
				}
				if (state.conflictArmed) {
					state.conflictArmed = false;
					state.draftVersion += 1;
					return [409, { error: 'version_conflict', message: 'changed', details: { currentDraftVersion: state.draftVersion } }];
				}
				if (expected !== state.draftVersion) {
					return [409, { error: 'version_conflict', message: 'changed', details: { currentDraftVersion: state.draftVersion } }];
				}
				if (body.action === 'save') {
					const issues = validateFields(body.fields as Json);
					if (issues.length) return [422, { error: 'validation_failed', message: 'invalid', details: { issues } }];
					const f = body.fields as Record<string, string | null>;
					const clean = (k: string) => (typeof f[k] === 'string' && f[k]!.trim() ? f[k]!.trim() : null);
					state.fields = {
						positioning: clean('positioning'),
						coverUrl: clean('coverUrl'),
						coverAlt: clean('coverAlt'),
						portfolioUrl: clean('portfolioUrl'),
						supportText: clean('supportText'),
						supportUrl: clean('supportUrl')
					};
				} else {
					const picks = (body.selections as Array<{ assetId: string; note: string }>) ?? [];
					if (picks.length > 3) return [422, { error: 'validation_failed', message: 'invalid', details: { issues: [{ field: 'selections', issue: 'max_3' }] } }];
					state.selections = picks.map((p, i) => ({ assetId: p.assetId, position: i + 1, note: p.note?.trim() || null }) as never);
				}
				state.exists = true;
				state.draftVersion += 1;
				return [200, view()];
			}
			case 'publish': {
				if (state.status === 'Suspended') return [423, { error: 'suspended', message: 'suspended' }];
				if (expected !== state.draftVersion) {
					return [409, { error: 'version_conflict', message: 'changed', details: { currentDraftVersion: state.draftVersion } }];
				}
				if (scenario === 'ineligible' && state.selections.length) {
					return [
						422,
						{
							error: 'ineligible_selection',
							message: 'Some selected templates cannot be featured',
							details: { issues: [{ assetId: (state.selections[0] as { assetId: string }).assetId, reason: 'not_in_inventory' }] }
						}
					];
				}
				state.revision += 1;
				state.status = 'Published';
				state.publishedDraftVersion = state.draftVersion;
				state.publishedAt = '2026-10-29T13:00:00.000Z';
				const r = receipt('publish', scenario === 'propagating' ? 'propagating' : 'live');
				state.lastReceipt = r;
				return [scenario === 'propagating' ? 202 : 200, { receipt: r }];
			}
			case 'unpublish': {
				if (state.status === 'Suspended') return [423, { error: 'suspended', message: 'suspended' }];
				if (state.status !== 'Published') return [200, { receipt: { ...receipt('unpublish', 'unchanged') } }];
				state.revision += 1;
				state.status = 'Unpublished';
				const r = receipt('unpublish', 'removed');
				state.lastReceipt = r;
				return [200, { receipt: r }];
			}
			default:
				return [400, { error: 'invalid_request', message: 'Unknown action' }];
		}
	};

	const preview = (): Json => ({
		enabled: true,
		storefront: {
			creatorSlug: 'fixture-studio',
			positioning: state.fields.positioning,
			cover: state.fields.coverUrl && state.fields.coverAlt ? { url: state.fields.coverUrl, alt: state.fields.coverAlt } : null,
			links: state.fields.portfolioUrl ? [{ href: state.fields.portfolioUrl, label: 'View Dribbble portfolio' }] : [],
			support: state.fields.supportText && state.fields.supportUrl ? { text: state.fields.supportText, href: state.fields.supportUrl } : null,
			selections: state.selections.map((s: { assetId: string; note: string | null }) => ({
				templateSlug: CANDIDATES.find((c) => c.assetId === s.assetId)?.templateSlug ?? 'unknown',
				note: s.note
			}))
		},
		issues: scenario === 'ineligible' && state.selections.length ? [{ assetId: (state.selections[0] as { assetId: string }).assetId, reason: 'not_in_inventory' }] : [],
		blockers: scenario === 'ineligible' && state.selections.length ? ['ineligible_selection'] : []
	});

	const realFetch = window.fetch.bind(window);
	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, ORIGIN());
		const method = (init?.method ?? 'GET').toUpperCase();
		if (url.origin !== ORIGIN() || !url.pathname.startsWith('/api/')) return realFetch(input, init);
		await new Promise((r) => setTimeout(r, 250)); // visible busy states

		const finish = (status: number, body: unknown, extra: Partial<LoggedRequest> = {}) => {
			log({ method, path: `${url.pathname}${url.search}`, status, ...extra });
			return respond(status, body);
		};

		if (url.pathname === '/api/profile') {
			return finish(200, { id: 'fixture', name: 'Fixture Studio', legalName: '', biography: 'Bio stays in the Profile tab.', avatarUrl: null, websiteUrl: 'https://fixture.example' });
		}
		if (url.pathname === '/api/keys') return finish(200, { keys: [] });
		if (url.pathname === '/api/upload' && method === 'POST') {
			return finish(200, { url: `${ORIGIN()}/api/uploads/fixture/cover.svg`, key: 'fixture/cover.svg', size: 1 });
		}
		if (url.pathname === '/api/storefront') {
			if (scenario === 'disabled') return finish(method === 'GET' ? 200 : 404, method === 'GET' ? { enabled: false } : { error: 'storefront_disabled' });
			if (method === 'GET') {
				if (url.searchParams.has('probe')) return finish(200, { enabled: true });
				if (scenario === 'ambiguous') {
					return finish(409, { error: 'ambiguous_creator', message: 'More than one Creator matches this account' });
				}
				return finish(200, url.searchParams.has('preview') ? preview() : view());
			}
			const body = JSON.parse(String(init?.body ?? '{}')) as Json;
			const key = new Headers(init?.headers).get('Idempotency-Key');
			const [status, result] = handleStorefrontPost(body, key);
			return finish(status, result, { action: String(body.action), idempotencyKey: key });
		}
		return finish(404, { error: 'not_found' });
	};
}
