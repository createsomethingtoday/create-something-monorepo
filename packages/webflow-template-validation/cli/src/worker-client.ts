/**
 * HTTP client for the production validation worker
 * (packages/webflow-template-validation/worker). Mirrors the payloads the
 * Designer Extension sends (extension/src/index.ts runUnifiedValidation,
 * waitForReviewCompletion, runLegacyValidation), minus Designer data.
 */

export const DEFAULT_WORKER_BASE = 'https://validation-worker.createsomething.workers.dev';

// Checks the worker can run from the published site alone. 'designer' needs
// Designer data, so the CLI sends it only with --designer-source mcp. Interactions (IX2) and
// Custom Code always run; the worker has no check flag for them.
export const PUBLISHED_SITE_CHECKS = ['assets', 'content', 'accessibility'] as const;

const NETWORK_TIMEOUT_MS = 30_000;
const STATUS_TIMEOUT_MS = 15_000;
const MAX_NETWORK_RETRIES = 3;
const MAX_PAGE_SLUGS = 50;
const STYLE_GUIDE_SLUGS = ['/style-guide', '/styleguide'];
const ASSET_PATH = /\.(png|jpe?g|gif|svg|webp|avif|pdf|zip|css|js|xml|txt|ico|mp4|webm|json)$/i;

export interface ValidationIssue {
	id: string;
	category?: string;
	severity: 'error' | 'warning' | 'info';
	message: string;
	description?: string;
	howToFix?: string;
	details?: Record<string, any>;
}

export interface CategoryResult {
	category: string;
	passed: boolean;
	issues: ValidationIssue[];
	stats?: Record<string, any>;
}

export interface MergedResult {
	url: string;
	success: boolean;
	categories: CategoryResult[];
	summary: Record<string, number>;
}

export interface RunOutcome {
	mode: 'async' | 'legacy';
	jobId: string | null;
	correlationId: string;
	asyncError?: string;
	raw: unknown;
	result: MergedResult;
}

export interface PageDiscovery {
	source: 'sitemap' | 'homepage-links' | 'none';
	slugs: string[];
	truncated: boolean;
}

export class WorkerError extends Error {}
class TerminalJobError extends Error {}

/** Mirrors normalizePublishedUrl in webflow-template-submission-form/lib/intake/published-url.ts. */
export function normalizePublishedUrl(rawValue: string): string {
	if (typeof rawValue !== 'string' || rawValue.trim() === '') {
		throw new Error('Published URL is required.');
	}
	const trimmed = rawValue.trim();
	const matched = trimmed.match(/https:\/\/[a-z0-9-]+\.webflow\.io(?:\/[^\s]*)?/i);
	const candidate = matched ? matched[0] : trimmed;

	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		throw new Error('Enter a valid published Webflow URL.');
	}
	if (parsed.protocol !== 'https:') {
		throw new Error("URL must start with 'https://'.");
	}
	if (!parsed.hostname.toLowerCase().endsWith('.webflow.io')) {
		throw new Error("URL must use a '.webflow.io' hostname.");
	}
	parsed.hash = '';
	if (!parsed.pathname) parsed.pathname = '/';
	return parsed.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

function isRetryable(error: unknown): boolean {
	const status = (error as { status?: number }).status;
	if (typeof status === 'number') return status === 408 || status === 429 || status >= 500;
	return true; // network error or timeout
}

/** Same retry shape as the extension's fetchJsonWithRetry: 3 attempts, linear backoff. */
async function fetchJsonWithRetry<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_NETWORK_RETRIES; attempt += 1) {
		try {
			const response = await fetchWithTimeout(url, init, timeoutMs);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				const error = new Error(text || `Request failed with status ${response.status}`) as Error & { status?: number };
				error.status = response.status;
				throw error;
			}
			return (await response.json()) as T;
		} catch (error) {
			lastError = error;
			if (attempt === MAX_NETWORK_RETRIES || !isRetryable(error)) throw error;
			await sleep(attempt * 1000);
		}
	}
	throw lastError instanceof Error ? lastError : new Error('Request failed');
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string | null> {
	try {
		const response = await fetchWithTimeout(url, { headers: { 'User-Agent': 'webflow-template-validate-cli/0.1' } }, 15_000);
		return response.ok ? await response.text() : null;
	} catch {
		return null;
	}
}

function toSlug(href: string, siteUrl: string): string | null {
	try {
		const url = new URL(href, siteUrl);
		if (url.hostname !== new URL(siteUrl).hostname) return null;
		const pathname = url.pathname.replace(/\/+$/, '') || '/';
		if (pathname === '/' || ASSET_PATH.test(pathname)) return null;
		return pathname;
	} catch {
		return null;
	}
}

/**
 * The worker does not read the sitemap for pages. Without pageSlugs the
 * Interactions (IX2) check covers only the homepage and the content check
 * follows at most 5 homepage links. So the CLI discovers pages itself:
 * /sitemap.xml (plus nested sitemaps) first, then same-host homepage links.
 */
export async function discoverPageSlugs(siteUrl: string): Promise<PageDiscovery> {
	const slugs = new Set<string>();
	const sitemap = await fetchText(new URL('/sitemap.xml', siteUrl).toString());
	if (sitemap && /<(urlset|sitemapindex)[\s>]/i.test(sitemap)) {
		const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
		const isIndex = /<sitemapindex[\s>]/i.test(sitemap);
		const pageLocs: string[] = [];
		if (isIndex) {
			for (const nested of locs.slice(0, 5)) {
				const body = await fetchText(nested);
				if (body) pageLocs.push(...[...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]));
			}
		} else {
			pageLocs.push(...locs);
		}
		for (const loc of pageLocs) {
			const slug = toSlug(loc, siteUrl);
			if (slug) slugs.add(slug);
		}
		if (slugs.size > 0) return finish('sitemap', slugs);
	}

	const homepage = await fetchText(siteUrl);
	if (homepage) {
		for (const match of homepage.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
			const href = match[1];
			if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
			const slug = toSlug(href, siteUrl);
			if (slug) slugs.add(slug);
		}
		if (slugs.size > 0) return finish('homepage-links', slugs);
	}
	return { source: 'none', slugs: [], truncated: false };
}

function finish(source: PageDiscovery['source'], slugs: Set<string>): PageDiscovery {
	const all = [...slugs].sort();
	return { source, slugs: all.slice(0, MAX_PAGE_SLUGS), truncated: all.length > MAX_PAGE_SLUGS };
}

/** Same defaults as the extension's getWorkerOptions with every option at its default. */
function buildOptions(checks: string[]) {
	const has = (name: string) => checks.includes(name);
	return {
		skipAssets: !has('assets'),
		skipContent: !has('content'),
		skipAccessibility: !has('accessibility'),
		excludePageSlugs: STYLE_GUIDE_SLUGS,
		pageScope: 'all' as const,
		currentPageSlug: '/',
		contentChecks: { lorem: true, headings: true, altText: true, seo: true, links: true, contentQuality: true }
	};
}

/**
 * The worker rejects requests without a truthy designerData (400). A
 * slug-only page list satisfies that check and moves the asset validator from
 * homepage-only to its multi-page strategy (up to 10 pages). It carries no
 * Designer API data, and 'designer' is never in checks, so no Designer
 * category runs.
 */
function buildDesignerStub(pageSlugs: string[]) {
	return { pages: ['/', ...pageSlugs].map((slug) => ({ slug })) };
}

interface ReviewStartResponse {
	jobId: string;
	statusUrl: string;
	eventsUrl: string;
}

interface ReviewStatusResponse {
	jobId: string;
	status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
	progress: number;
	message: string;
	result?: unknown;
	error?: string;
}

export async function runValidation(params: {
	siteUrl: string;
	pageSlugs: string[];
	checks: string[];
	workerBase: string;
	timeoutMs: number;
	/** Real DesignerData (from the MCP collector). Defaults to the slug-only stub. */
	designerData?: unknown;
	onProgress?: (message: string) => void;
}): Promise<RunOutcome> {
	const { siteUrl, pageSlugs, checks, workerBase, timeoutMs, onProgress } = params;
	const correlationId = `cli-${crypto.randomUUID()}`;
	const designerData = params.designerData ?? buildDesignerStub(pageSlugs);
	const options = buildOptions(checks);
	const headers = { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId };

	let jobId: string | null = null;
	try {
		const start = await fetchJsonWithRetry<ReviewStartResponse>(
			`${workerBase}/app-validator/review/start`,
			{
				method: 'POST',
				headers,
				body: JSON.stringify({ siteUrl, pageSlugs, designerData, checks, options, correlationId })
			},
			NETWORK_TIMEOUT_MS
		);
		jobId = start.jobId;
		onProgress?.(`Job ${jobId} started`);
		const status = await pollUntilTerminal(workerBase, jobId, correlationId, timeoutMs, onProgress);
		if (status.status !== 'completed' || !status.result) {
			throw new Error(status.error || status.message || 'Review completed without result payload');
		}
		return { mode: 'async', jobId, correlationId, raw: status.result, result: status.result as MergedResult };
	} catch (asyncError) {
		// Same as the extension: any async failure falls back to POST /validate.
		// /validate never runs the Designer checks, so Designer categories are absent there.
		const asyncMessage = asyncError instanceof Error ? asyncError.message : String(asyncError);
		onProgress?.(`Async review failed (${asyncMessage}). Falling back to POST /validate.`);
		try {
			const raw = await fetchJsonWithRetry<any>(
				`${workerBase}/validate`,
				{ method: 'POST', headers, body: JSON.stringify({ siteUrl, designerData, pageSlugs, options }) },
				Math.max(NETWORK_TIMEOUT_MS, timeoutMs)
			);
			return {
				mode: 'legacy',
				jobId,
				correlationId,
				asyncError: asyncMessage,
				raw,
				result: categoriesFromLegacy(siteUrl, raw)
			};
		} catch (legacyError) {
			const legacyMessage = legacyError instanceof Error ? legacyError.message : String(legacyError);
			throw new WorkerError(`Async review failed (${asyncMessage}); legacy /validate failed (${legacyMessage}).`);
		}
	}
}

async function pollUntilTerminal(
	workerBase: string,
	jobId: string,
	correlationId: string,
	timeoutMs: number,
	onProgress?: (message: string) => void
): Promise<ReviewStatusResponse> {
	const deadline = Date.now() + timeoutMs;
	let delay = 1500;
	let lastMessage = '';
	while (Date.now() < deadline) {
		try {
			const url = `${workerBase}/app-validator/review/${encodeURIComponent(jobId)}/status?correlationId=${encodeURIComponent(correlationId)}`;
			const status = await fetchJsonWithRetry<ReviewStatusResponse>(url, { method: 'GET' }, STATUS_TIMEOUT_MS);
			const line = `${status.status} ${Math.round(status.progress ?? 0)}% ${status.message ?? ''}`.trim();
			if (line !== lastMessage) {
				onProgress?.(line);
				lastMessage = line;
			}
			if (status.status === 'completed') return status;
			if (status.status === 'failed' || status.status === 'cancelled') {
				throw new TerminalJobError(status.error || status.message || 'Validation job failed');
			}
		} catch (error) {
			// Terminal job states and 404 (job state gone) end the poll. Other
			// errors already got 3 attempts; keep polling, like the extension's safePoll.
			if (error instanceof TerminalJobError || (error as { status?: number }).status === 404) throw error;
			onProgress?.(`status poll failed, retrying: ${error instanceof Error ? error.message : String(error)}`);
		}
		await sleep(Math.min(delay, Math.max(0, deadline - Date.now())));
		delay = Math.min(Math.round(delay * 1.5), 8000);
	}
	throw new Error(`Validation job timed out after ${Math.round(timeoutMs / 1000)}s`);
}

function surfacedAccessibility(issues: ValidationIssue[] | undefined, contentIncluded: boolean) {
	const filtered = (issues ?? []).filter((issue) => issue.id !== 'color-contrast-violations');
	if (!contentIncluded) return filtered;
	const duplicates = new Set(['missing-alt-text-critical', 'heading-structure-errors']);
	return filtered.filter((issue) => !duplicates.has(issue.id));
}

/** Mirrors the worker's mergeReviewResults for the no-Designer branch. */
function categoriesFromLegacy(siteUrl: string, raw: any): MergedResult {
	const analysis = raw?.analysis ?? {};
	const categories: CategoryResult[] = [];
	const push = (name: string, section: any, issues?: ValidationIssue[]) => {
		const list = issues ?? section.issues ?? [];
		categories.push({ category: name, passed: !list.some((i: ValidationIssue) => i.severity === 'error'), issues: list, stats: section.stats });
	};
	if (analysis.assets) push('Assets & Images', analysis.assets);
	if (analysis.content) push('Content & Accessibility', analysis.content);
	if (analysis.accessibility) {
		const surfaced = surfacedAccessibility(analysis.accessibility.issues, Boolean(analysis.content));
		if (surfaced.length > 0) push('Accessibility & WCAG', analysis.accessibility, surfaced);
	}
	if (analysis.interactions) push('Interactions and GSAP', analysis.interactions);
	if (analysis.customCode) push('Custom Code & Site Settings', analysis.customCode);
	const passedCategories = categories.filter((c) => c.passed).length;
	return {
		url: siteUrl,
		success: true,
		categories,
		summary: { passedCategories, failedCategories: categories.length - passedCategories }
	};
}

export interface RecordOutcome {
	ok: boolean;
	httpStatus?: number;
	/** Latest-result status as the Marketplace form reads it ('available' or 'missing'). */
	status?: string;
	passed?: boolean;
	evidenceVerified: boolean;
	correlationId?: string;
	error?: string;
}

/** Same fields as the extension's buildValidationSubmitIssue (extension/src/validation-submit-payload.ts). */
function buildSubmitIssue(issue: ValidationIssue): Record<string, unknown> {
	const pages = Array.isArray(issue.details?.pages) ? issue.details.pages : undefined;
	const duplicates = Array.isArray(issue.details?.duplicates) ? issue.details.duplicates : undefined;
	return {
		id: issue.id,
		severity: issue.severity,
		message: issue.message,
		howToFix: issue.howToFix || issue.details?.howToFix,
		location: (issue as { location?: string }).location || issue.details?.location,
		details: pages || duplicates ? { pages, duplicates } : undefined
	};
}

/** Mirrors the extension's buildValidationSubmitPayload, with the scope the CLI actually ran. */
export function buildSubmitPayload(params: {
	result: MergedResult;
	siteUrl: string;
	checks: string[];
	pageSlugsCount: number;
}): Record<string, unknown> {
	const { result, siteUrl, checks, pageSlugsCount } = params;
	return {
		url: result.url || siteUrl,
		summary: result.summary,
		categories: (result.categories ?? []).map((category) => ({
			category: category.category,
			passed: category.passed,
			issues: (category.issues ?? []).map(buildSubmitIssue)
		})),
		scope: {
			selectedChecks: checks,
			pageScope: 'all',
			publishedChecks: 'full',
			pageSlugsCount
		}
	};
}

/**
 * POST /app-validator/submit with oauth_site_access evidence, then read
 * /app-validator/submission/latest back so the outcome matches what the
 * Marketplace form sees. The access token goes only in the submit body.
 */
export async function recordValidationResult(params: {
	workerBase: string;
	siteId: string;
	siteName?: string;
	siteUrl: string;
	validationResults: Record<string, unknown>;
	accessToken: string;
}): Promise<RecordOutcome> {
	const { workerBase, siteId, siteName, siteUrl, validationResults, accessToken } = params;
	const correlationId = `cli-record-${crypto.randomUUID()}`;
	const headers = { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId };
	let response: Response;
	try {
		response = await fetchWithTimeout(
			`${workerBase}/app-validator/submit`,
			{
				method: 'POST',
				headers,
				body: JSON.stringify({
					siteId,
					siteName,
					siteUrl,
					validationResults,
					evidence: { type: 'oauth_site_access', accessToken }
				})
			},
			NETWORK_TIMEOUT_MS
		);
	} catch (error) {
		return { ok: false, evidenceVerified: false, correlationId, error: error instanceof Error ? error.message : String(error) };
	}
	const body = (await response.json().catch(() => null)) as
		| { error?: string; message?: string; correlationId?: string; evidence?: { verified?: boolean } | null }
		| null;
	if (!response.ok) {
		return {
			ok: false,
			httpStatus: response.status,
			evidenceVerified: false,
			correlationId: body?.correlationId ?? correlationId,
			error: body?.error || body?.message || `HTTP ${response.status}`
		};
	}
	const evidenceVerified = body?.evidence?.verified === true;

	try {
		const latest = await fetchWithTimeout(
			`${workerBase}/app-validator/submission/latest?siteId=${encodeURIComponent(siteId)}`,
			{ method: 'GET', headers: { 'X-Correlation-Id': correlationId } },
			STATUS_TIMEOUT_MS
		);
		const latestBody = (await latest.json().catch(() => null)) as { status?: string; passed?: boolean } | null;
		return {
			ok: true,
			httpStatus: response.status,
			status: latestBody?.status,
			passed: latestBody?.passed,
			evidenceVerified,
			correlationId
		};
	} catch (error) {
		return {
			ok: true,
			httpStatus: response.status,
			evidenceVerified,
			correlationId,
			error: `recorded, but the latest-result read failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
