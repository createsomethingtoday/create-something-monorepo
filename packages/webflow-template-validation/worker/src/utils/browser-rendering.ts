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
	emulateVisitorInPage,
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

/**
 * One reusable tab per viewport. Opening fresh tabs for every page after the
 * previous ones closed often failed on Cloudflare ("Session with given id not
 * found") once the browser had no tabs left, so the tabs stay open for the
 * whole run and navigate from page to page.
 */
interface ViewportTab {
	viewport: RenderViewport;
	page: Page;
	/** Where page errors go; set for the page being rendered, null in between. */
	errors: Map<string, PageErrorObservation> | null;
}

/** The page's own failure (an HTTP error status, or no response at all); retrying it would not help. */
class PageLoadError extends Error {}

async function openTabs(browser: Browser, userAgent: string): Promise<ViewportTab[]> {
	return Promise.all(
		RENDER_VIEWPORTS.map(async (viewport) => {
			const page = await browser.newPage();
			const tab: ViewportTab = { viewport, page, errors: null };
			page.on('pageerror', (error: Error) => {
				if (!tab.errors) return;
				const observed = describePageError(error?.message || String(error), error?.stack);
				if (isIgnoredPageError(observed.message)) return;
				// Keyed without the line, so one error does not repeat per viewport or page variant.
				const key = `${observed.message}\n${observed.source?.replace(/:\d+:\d+$/, '') ?? ''}`;
				if (!tab.errors.has(key)) tab.errors.set(key, observed);
			});
			await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
			await page.setUserAgent(userAgent);
			await page.evaluateOnNewDocument(emulateVisitorInPage, viewport.pointer);
			return tab;
		})
	);
}

async function closeTabs(tabs: ViewportTab[] | null): Promise<null> {
	await Promise.all((tabs ?? []).map((tab) => tab.page.close().catch(() => undefined)));
	return null;
}

async function renderViewport(tab: ViewportTab, url: string, errors: Map<string, PageErrorObservation>): Promise<ViewportObservation> {
	const { page, viewport } = tab;
	// Leave the previous page first, so its late errors are not counted against this one.
	await page.goto('about:blank').catch(() => undefined);
	tab.errors = errors;
	try {
		let response: Awaited<ReturnType<Page['goto']>> = null;
		try {
			response = await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
		} catch (error) {
			if (!(error instanceof Error && error.name === 'TimeoutError')) throw error;
			// A page that never fires load (a stalled beacon or video) is still measurable,
			// but only if its document arrived. Otherwise the tab is still on about:blank.
			if (page.url() === 'about:blank') {
				throw new PageLoadError(`The page did not respond within ${NAVIGATION_TIMEOUT_MS / 1000}s.`);
			}
		}
		if (response && response.status() >= 400) throw new PageLoadError(`HTTP ${response.status()}`);
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
		tab.errors = null;
	}
}

/** Load one page at every viewport, each tab at its own width, as a visitor would. */
async function renderPage(tabs: ViewportTab[], url: string): Promise<PageRenderObservation> {
	const errors = new Map<string, PageErrorObservation>();
	const viewports = await Promise.all(tabs.map((tab) => renderViewport(tab, url, errors)));
	return { url, status: 'ok', viewports, uncaughtErrors: [...errors.values()] };
}

function failedPage(url: string, error: unknown): PageRenderObservation {
	return { url, status: 'failed', error: errorMessage(error), viewports: [], uncaughtErrors: [] };
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

	let tabs: ViewportTab[] | null = null;
	let relaunched = false;
	try {
		// The same Chrome, without the "HeadlessChrome" product token some scripts check for.
		let userAgent = (await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/');
		const pages: PageRenderObservation[] = [];
		for (const url of targets) {
			// Pages left when the time budget runs out count as not rendered.
			if (options.deadline !== undefined && Date.now() > options.deadline) break;
			let observation: PageRenderObservation | null = null;
			// A browser-side failure (a lost tab or connection) gets one retry on fresh
			// tabs, and the browser is relaunched once per run if it disconnected.
			for (let attempt = 0; observation === null; attempt += 1) {
				try {
					tabs ??= await openTabs(browser, userAgent);
					observation = await renderPage(tabs, url);
				} catch (error) {
					tabs = await closeTabs(tabs);
					if (error instanceof PageLoadError || attempt >= 1) {
						observation = failedPage(url, error);
					} else if (!browser.connected) {
						if (relaunched) {
							observation = failedPage(url, error);
						} else {
							relaunched = true;
							await browser.close().catch(() => undefined);
							try {
								browser = await launchWithRetry(binding);
								userAgent = (await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/');
							} catch (launchError) {
								observation = failedPage(url, launchError);
							}
						}
					}
				}
			}
			pages.push(observation);
		}
		return summarizeRendering(pages, context);
	} finally {
		await closeTabs(tabs);
		await browser.close().catch(() => undefined);
	}
}
