/**
 * Loads published pages in Cloudflare Browser Rendering and records uncaught
 * JavaScript errors and horizontal overflow at each review viewport.
 */

import puppeteer, { type Browser, type BrowserWorker, type Page } from '@cloudflare/puppeteer';

import {
	MAX_RENDERED_PAGES,
	OVERFLOW_TOLERANCE_PX,
	RENDER_VIEWPORTS,
	describePageError,
	emulatePointerInPage,
	isIgnoredPageError,
	measureLayoutInPage,
	scrollSweepInPage,
	summarizeRendering,
	type PageErrorObservation,
	type PageRenderObservation,
	type RenderViewport,
	type RenderingAnalysisResult,
	type ViewportObservation
} from '../validators/rendering-validator';

const NAVIGATION_TIMEOUT_MS = 25_000;
const NETWORK_IDLE_TIMEOUT_MS = 4_000;
/** Lets Webflow page-load interactions start before the first measurement. */
const LOAD_SETTLE_MS = 800;
/** Overflow must still be there this much later, so load animations that slide in do not count. */
const OVERFLOW_RECHECK_MS = 1_500;
const SCROLL_STEP_DELAY_MS = 120;
const MAX_SCROLL_SWEEP_PX = 20_000;
const LAUNCH_ATTEMPTS = 2;
const LAUNCH_RETRY_DELAY_MS = 3_000;
const MAX_OFFENDERS = 5;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function launchWithRetry(binding: BrowserWorker): Promise<Browser> {
	for (let attempt = 1; ; attempt += 1) {
		try {
			return await puppeteer.launch(binding);
		} catch (error) {
			// Browser Rendering returns 429 when the account's browser limit is reached.
			if (attempt >= LAUNCH_ATTEMPTS) throw error;
			await delay(LAUNCH_RETRY_DELAY_MS);
		}
	}
}

async function measure(page: Page) {
	return page.evaluate(measureLayoutInPage, OVERFLOW_TOLERANCE_PX, MAX_OFFENDERS);
}

async function renderViewport(
	browser: Browser,
	url: string,
	viewport: RenderViewport,
	errors: Map<string, PageErrorObservation>
): Promise<ViewportObservation> {
	const page = await browser.newPage();
	page.on('pageerror', (error: Error) => {
		const observed = describePageError(error?.message || String(error), error?.stack);
		if (isIgnoredPageError(observed.message)) return;
		// Keyed without the line, so one error does not repeat per viewport or page variant.
		const key = `${observed.message}\n${observed.source?.replace(/:\d+:\d+$/, '') ?? ''}`;
		if (!errors.has(key)) errors.set(key, observed);
	});
	try {
		await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
		await page.evaluateOnNewDocument(emulatePointerInPage, viewport.pointer);
		let response: Awaited<ReturnType<Page['goto']>> = null;
		try {
			response = await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
		} catch (error) {
			// A page that never fires load (a stalled beacon or video) is still measurable.
			if (!(error instanceof Error && error.name === 'TimeoutError')) throw error;
		}
		if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
		await page.waitForNetworkIdle({ idleTime: 500, timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => undefined);
		await page
			.evaluate(() => (document.fonts ? document.fonts.ready.then(() => true) : true))
			.catch(() => undefined);
		await delay(LOAD_SETTLE_MS);

		const first = await measure(page);
		let overflowPx = first.overflowPx;
		let offenders = first.offenders;
		if (first.overflowPx > OVERFLOW_TOLERANCE_PX) {
			await delay(OVERFLOW_RECHECK_MS);
			const second = await measure(page);
			overflowPx = Math.min(first.overflowPx, second.overflowPx);
			if (second.offenders.length > 0) offenders = second.offenders;
		}

		// Scroll once so errors thrown by scroll-triggered scripts are caught too.
		if (viewport.name === 'desktop') {
			await page
				.evaluate(scrollSweepInPage, viewport.height, SCROLL_STEP_DELAY_MS, MAX_SCROLL_SWEEP_PX)
				.catch(() => undefined);
		}

		return {
			viewport: viewport.name,
			width: viewport.width,
			overflowPx: overflowPx > OVERFLOW_TOLERANCE_PX ? overflowPx : 0,
			offenders: overflowPx > OVERFLOW_TOLERANCE_PX ? offenders : []
		};
	} finally {
		await page.close().catch(() => undefined);
	}
}

async function renderPage(browser: Browser, url: string): Promise<PageRenderObservation> {
	const errors = new Map<string, PageErrorObservation>();
	try {
		// One tab per viewport: each loads the page fresh at its own width, as a visitor would.
		const viewports = await Promise.all(
			RENDER_VIEWPORTS.map((viewport) => renderViewport(browser, url, viewport, errors))
		);
		return { url, status: 'ok', viewports, uncaughtErrors: [...errors.values()] };
	} catch (error) {
		return { url, status: 'failed', error: errorMessage(error), viewports: [], uncaughtErrors: [] };
	}
}

/** Unique page URLs without fragments, in crawl order. */
export function renderTargets(pageUrls: string[]): string[] {
	const seen = new Set<string>();
	const targets: string[] = [];
	for (const raw of pageUrls) {
		try {
			const url = new URL(raw);
			url.hash = '';
			const key = url.href;
			if (seen.has(key)) continue;
			seen.add(key);
			targets.push(key);
		} catch {
			// Not a URL the browser can load.
		}
	}
	return targets;
}

export async function validateRendering(
	binding: BrowserWorker | undefined,
	pageUrls: string[],
	options: { deadline?: number } = {}
): Promise<RenderingAnalysisResult> {
	const all = renderTargets(pageUrls);
	const targets = all.slice(0, MAX_RENDERED_PAGES);
	const context = { pagesRequested: all.length };
	if (targets.length === 0) {
		return summarizeRendering([], { ...context, unavailableReason: 'There was no published page URL to load.' });
	}
	if (!binding) {
		return summarizeRendering([], { ...context, unavailableReason: 'Browser Rendering is not configured on the validation worker.' });
	}

	let browser: Browser;
	try {
		browser = await launchWithRetry(binding);
	} catch (error) {
		return summarizeRendering([], { ...context, unavailableReason: `The browser did not start: ${errorMessage(error)}` });
	}

	try {
		const pages: PageRenderObservation[] = [];
		for (const url of targets) {
			// Pages left when the time budget runs out count as not rendered.
			if (options.deadline !== undefined && Date.now() > options.deadline) break;
			pages.push(await renderPage(browser, url));
		}
		return summarizeRendering(pages, context);
	} finally {
		await browser.close().catch(() => undefined);
	}
}
