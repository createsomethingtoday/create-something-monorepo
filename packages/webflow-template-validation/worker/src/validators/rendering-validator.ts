/**
 * Browser rendering checks: uncaught JavaScript errors and horizontal overflow.
 *
 * The static crawl cannot see either problem; both need a real browser. The
 * driver (utils/browser-rendering.ts) loads each page in Cloudflare Browser
 * Rendering and records what it observed; this module turns those
 * observations into validation issues.
 *
 * The *InPage functions run inside the page through page.evaluate, which sends
 * their source text. Keep them self-contained: no imports, no outer variables,
 * and no named inner functions (`const f = () => ...`), because the Worker
 * bundler wraps named functions in a `__name` helper that does not exist in
 * the page.
 */

import type { ValidationIssue } from '../types';

export const RENDERING_CATEGORY = 'Browser Rendering';

export interface RenderViewport {
	name: 'mobile' | 'tablet' | 'desktop';
	width: number;
	height: number;
	/** The input device scripts see through matchMedia hover and pointer queries. */
	pointer: 'touch' | 'mouse';
}

/** Widths reviewers check: phone, tablet, and laptop. */
export const RENDER_VIEWPORTS: readonly RenderViewport[] = [
	{ name: 'mobile', width: 375, height: 812, pointer: 'touch' },
	{ name: 'tablet', width: 768, height: 1024, pointer: 'touch' },
	{ name: 'desktop', width: 1440, height: 900, pointer: 'mouse' }
];

/** Pages rendered per run, home page first. */
export const MAX_RENDERED_PAGES = 10;

/** Sub-pixel layout rounding stays under this; anything wider scrolls sideways. */
export const OVERFLOW_TOLERANCE_PX = 1;

export interface OverflowOffender {
	/** tag#id.class1.class2 */
	label: string;
	/** Right edge in CSS px from the left of the page. */
	right: number;
}

export interface LayoutMeasurement {
	viewportWidth: number;
	documentWidth: number;
	/** Effective overflow-x of the viewport (html, or body when html is visible). */
	viewportOverflowX: string;
	/** How far a visitor can scroll sideways, in CSS px. 0 when the viewport clips. */
	overflowPx: number;
	offenders: OverflowOffender[];
}

/** One link text that shows more than once in the navbar and goes to the same place. */
export interface DuplicateNavLink {
	text: string;
	href: string;
	count: number;
}

/** Duplicate navbar links listed per page. */
export const MAX_DUPLICATE_NAV_LINKS = 5;

export interface ViewportObservation {
	viewport: RenderViewport['name'];
	width: number;
	/** Overflow that was still there after the settle delay; transient load animations do not count. */
	overflowPx: number;
	offenders: OverflowOffender[];
	/** Read at the desktop width only, where the full navbar shows. */
	duplicateNavLinks?: DuplicateNavLink[];
}

export interface PageErrorObservation {
	message: string;
	/** First script URL in the stack, when the browser reported one. */
	source?: string;
}

export interface PageRenderObservation {
	url: string;
	status: 'ok' | 'failed';
	error?: string;
	viewports: ViewportObservation[];
	uncaughtErrors: PageErrorObservation[];
}

export interface RenderingAnalysisResult {
	issues: ValidationIssue[];
	stats: {
		analysisComplete: boolean;
		pagesRequested: number;
		pagesRendered: number;
		pagesFailed: number;
		pagesNotRendered: number;
		viewports: string;
		pagesWithUncaughtErrors: number;
		pagesWithHorizontalOverflow: number;
	};
	pages: PageRenderObservation[];
}

/**
 * Measure how far the page scrolls sideways and which elements cause it.
 * Runs in the page. See the module comment for the constraints.
 */
export function measureLayoutInPage(tolerancePx: number, maxOffenders: number): LayoutMeasurement {
	const doc = document.documentElement;
	const body = document.body;
	const viewportWidth = doc.clientWidth || window.innerWidth;
	const scroller = document.scrollingElement || doc;
	const documentWidth = scroller.scrollWidth;
	const htmlOverflowX = getComputedStyle(doc).overflowX;
	// The root's overflow applies to the viewport; when it is visible, body's
	// overflow is used instead (CSS overflow propagation).
	const viewportOverflowX =
		htmlOverflowX !== 'visible' ? htmlOverflowX : body ? getComputedStyle(body).overflowX : 'visible';
	const viewportClips = viewportOverflowX === 'hidden' || viewportOverflowX === 'clip';
	const overflowPx = viewportClips ? 0 : Math.max(0, Math.round(documentWidth - viewportWidth));

	const offenders: Array<{ el: Element; label: string; right: number }> = [];
	if (overflowPx > tolerancePx && body) {
		const blocked = new Map<Element, boolean>();
		const all = body.querySelectorAll('*');
		const limit = Math.min(all.length, 6000);
		for (let i = 0; i < limit; i += 1) {
			const el = all[i];
			const rect = el.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) continue;
			const right = rect.right + window.scrollX;
			if (right <= viewportWidth + tolerancePx) continue;
			// Skip elements a clipping or fixed-position ancestor keeps out of the
			// page's scroll area; they do not make the page scroll sideways.
			// `blocked` caches, per ancestor, whether it or one of its ancestors clips.
			let contained = getComputedStyle(el).position === 'fixed';
			const visited: Element[] = [];
			let node: Element | null = el.parentElement;
			while (!contained && node && node !== body) {
				const known = blocked.get(node);
				if (known !== undefined) {
					contained = known;
					break;
				}
				visited.push(node);
				const style = getComputedStyle(node);
				if (style.position === 'fixed' || style.overflowX !== 'visible') contained = true;
				node = node.parentElement;
			}
			for (let j = 0; j < visited.length; j += 1) blocked.set(visited[j], contained);
			if (contained) continue;
			let label = el.tagName.toLowerCase();
			if (el.id) label += '#' + el.id;
			const classList = Array.from(el.classList).slice(0, 2);
			if (classList.length) label += '.' + classList.join('.');
			offenders.push({ el, label, right: Math.round(right) });
		}
	}
	// Report the outermost offenders: a child inside a wide parent adds nothing.
	const offenderSet = new Set(offenders.map((entry) => entry.el));
	const outermost = offenders.filter((entry) => {
		let parent = entry.el.parentElement;
		while (parent && parent !== body) {
			if (offenderSet.has(parent)) return false;
			parent = parent.parentElement;
		}
		return true;
	});
	outermost.sort((a, b) => b.right - a.right);

	return {
		viewportWidth,
		documentWidth,
		viewportOverflowX,
		overflowPx,
		offenders: outermost.slice(0, maxOffenders).map((entry) => ({ label: entry.label, right: entry.right }))
	};
}

/**
 * Links that a visitor sees more than once in the navbar: the same text and
 * the same target, both showing at this width. A second copy that shows only
 * at another width (a button for the mobile menu) is not on screen and does
 * not count; neither does a link in a closed dropdown. Footer navigation is
 * left out, because footers repeat links in columns on purpose.
 * Runs in the page. See the module comment for the constraints.
 */
export function findDuplicateNavLinksInPage(maxResults: number): DuplicateNavLink[] {
	// A page has a few navigation elements; the limit keeps the nested test below small on any page.
	const navs = Array.from(document.querySelectorAll('nav, [role="navigation"], .w-nav')).slice(0, 50);
	const found: DuplicateNavLink[] = [];
	for (let n = 0; n < navs.length; n += 1) {
		const nav = navs[n];
		if (nav.closest('footer, [role="contentinfo"]')) continue;
		// A navigation inside another one is read with its parent.
		let nested = false;
		for (let o = 0; o < navs.length; o += 1) {
			if (navs[o] !== nav && navs[o].contains(nav)) nested = true;
		}
		if (nested) continue;
		const groups = new Map<string, DuplicateNavLink>();
		const links = nav.querySelectorAll('a[href]');
		for (let i = 0; i < links.length; i += 1) {
			const link = links[i];
			// An SVG link has no string href.
			if (!(link instanceof HTMLAnchorElement)) continue;
			const rect = link.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) continue;
			const visible =
				typeof link.checkVisibility === 'function'
					? link.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
					: getComputedStyle(link).visibility === 'visible';
			if (!visible) continue;
			// The link must be what shows at its own centre. A closed menu that is
			// moved off the screen, clipped by its parent, or under another layer
			// has a size but is not there.
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;
			if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
			const top = document.elementFromPoint(x, y);
			if (!top || !(link === top || link.contains(top))) continue;
			const text = (link.innerText || link.textContent || '').replace(/\s+/g, ' ').trim();
			if (!text) continue;
			// The fragment stays: two links to different sections of one page are not a repeat.
			const href = link.href;
			const key = text.toLowerCase() + '\n' + href;
			const group = groups.get(key);
			if (group) group.count += 1;
			else groups.set(key, { text: text.slice(0, 60), href, count: 1 });
		}
		groups.forEach((group) => {
			if (group.count > 1 && found.length < maxResults) found.push(group);
		});
	}
	return found;
}

/**
 * Make the headless browser look like a visitor's browser to page scripts.
 * Runs in the page before any page script (evaluateOnNewDocument). See the
 * module comment for the constraints.
 *
 * - matchMedia hover and pointer queries answer as a mouse or a touch device
 *   would. Cloudflare's headless Chrome reports (hover: none) and
 *   (pointer: none) at every width and cannot emulate either, so a script
 *   that runs only for mouse users (for example, smooth scrolling) would never
 *   run and its errors would be missed. CSS media rules are not affected.
 * - navigator.webdriver reads false, as in a visitor's browser, so scripts
 *   that change behavior for automated browsers behave normally.
 */
export function emulateVisitorInPage(pointer: 'touch' | 'mouse'): void {
	try {
		Object.defineProperty(Navigator.prototype, 'webdriver', { value: false, configurable: true });
	} catch {
		// Leave the flag as it is if the browser refuses.
	}
	const original = window.matchMedia.bind(window);
	const mouse = pointer === 'mouse';
	const always = '(min-width: 0px)';
	const never = '(max-width: 0.001px)';
	window.matchMedia = function (query: string) {
		const rewritten = String(query)
			.replace(/\(\s*(?:any-)?hover\s*:\s*hover\s*\)/gi, mouse ? always : never)
			.replace(/\(\s*(?:any-)?hover\s*:\s*none\s*\)/gi, mouse ? never : always)
			.replace(/\(\s*(?:any-)?hover\s*\)/gi, mouse ? always : never)
			.replace(/\(\s*(?:any-)?pointer\s*:\s*fine\s*\)/gi, mouse ? always : never)
			.replace(/\(\s*(?:any-)?pointer\s*:\s*coarse\s*\)/gi, mouse ? never : always)
			.replace(/\(\s*(?:any-)?pointer\s*:\s*none\s*\)/gi, never)
			.replace(/\(\s*(?:any-)?pointer\s*\)/gi, always);
		return original(rewritten);
	} as typeof window.matchMedia;
}

/**
 * Scroll to the bottom and back so scroll-triggered scripts run. Runs in the
 * page. See the module comment for the constraints.
 */
export async function scrollSweepInPage(stepPx: number, delayMs: number, maxPx: number): Promise<void> {
	let y = 0;
	while (y < maxPx && y < Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)) {
		y += stepPx;
		window.scrollTo(0, y);
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}
	window.scrollTo(0, 0);
	await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Browser noise that is not a template defect. ResizeObserver loop notices are
 * reported through window.onerror but break nothing. Webflow's own checkout script
 * throws "no paypal order ID" when /paypal-checkout loads without an order,
 * which is every load on a template.
 */
const IGNORED_PAGE_ERRORS = [/ResizeObserver loop/i, /no paypal order ID/i];

export function isIgnoredPageError(message: string): boolean {
	return IGNORED_PAGE_ERRORS.some((pattern) => pattern.test(message));
}

/** First http(s) URL in an Error stack: the script that threw. */
export function scriptSourceFromStack(stack: string | undefined): string | undefined {
	const match = stack?.match(/https?:\/\/[^\s)]+?(?=:\d+:\d+|\)|\s|$)/);
	return match?.[0];
}

/**
 * Describe an uncaught page error. Cloudflare's puppeteer appends the throwing
 * location ("Lenis is not defined https://site/:66:17") to the message; split
 * it off and keep it as the source, since a line number helps the creator.
 */
export function describePageError(message: string, stack: string | undefined): PageErrorObservation {
	const located = message.match(/^([\s\S]*?)\s+(https?:\/\/\S+:\d+:\d+)$/);
	if (located) return { message: located[1], source: located[2] };
	const source = scriptSourceFromStack(stack);
	return source ? { message, source } : { message };
}

function pathOf(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.pathname || '/';
	} catch {
		return url;
	}
}

function truncate(value: string, max: number): string {
	const single = value.replace(/\s+/g, ' ').trim();
	return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

export function generateRenderingIssues(
	pages: PageRenderObservation[],
	context: { pagesRequested: number; unavailableReason?: string }
): ValidationIssue[] {
	if (context.unavailableReason) {
		return [
			{
				id: 'rendering-unavailable',
				category: RENDERING_CATEGORY,
				severity: 'error',
				message: 'The browser check could not run, so JavaScript errors and horizontal scrolling were not checked.',
				description: truncate(context.unavailableReason, 300),
				howToFix: 'Run validation again. If this keeps happening, contact the Marketplace team.'
			}
		];
	}

	const rendered = pages.filter((page) => page.status === 'ok');
	const failed = pages.filter((page) => page.status === 'failed');
	const issues: ValidationIssue[] = [];

	if (pages.length > 0 && rendered.length === 0) {
		return [
			{
				id: 'rendering-unavailable',
				category: RENDERING_CATEGORY,
				severity: 'error',
				message: 'No page loaded in the browser check, so JavaScript errors and horizontal scrolling were not checked.',
				description: truncate(failed[0]?.error ?? 'Every page failed to load.', 300),
				howToFix: 'Check that the published site loads, then run validation again.',
				details: { locations: failed.map((page) => `${pathOf(page.url)} — ${truncate(page.error ?? 'did not load', 160)}`) }
			}
		];
	}

	const errorPages = rendered.filter((page) => page.uncaughtErrors.length > 0);
	if (errorPages.length > 0) {
		issues.push({
			id: 'rendering-uncaught-errors',
			category: RENDERING_CATEGORY,
			severity: 'error',
			message: `${plural(errorPages.length, 'page throws', 'pages throw')} uncaught JavaScript errors.`,
			description:
				'An uncaught error stops the script that threw it, so the interactions or features it sets up can break for buyers.',
			howToFix:
				'Open the page with the browser console showing, reload, and fix the error in the script it names. Usually this is custom code that runs before the element it targets exists, or a library used before it loads.',
			details: {
				locations: errorPages.flatMap((page) =>
					page.uncaughtErrors.slice(0, 3).map((error) => {
						const source = error.source ? ` (${truncate(error.source, 120)})` : '';
						return `${pathOf(page.url)} — ${truncate(error.message, 200)}${source}`;
					})
				)
			}
		});
	}

	const overflowPages = rendered.filter((page) =>
		page.viewports.some((viewport) => viewport.overflowPx > OVERFLOW_TOLERANCE_PX)
	);
	if (overflowPages.length > 0) {
		const widths = new Set<number>();
		const lines: string[] = [];
		for (const page of overflowPages) {
			for (const viewport of page.viewports) {
				if (viewport.overflowPx <= OVERFLOW_TOLERANCE_PX) continue;
				widths.add(viewport.width);
				const culprit = viewport.offenders[0] ? ` (widest: ${truncate(viewport.offenders[0].label, 80)})` : '';
				lines.push(`${pathOf(page.url)} — ${viewport.width}px: scrolls ${viewport.overflowPx}px sideways${culprit}`);
			}
		}
		const widthList = [...widths].sort((a, b) => a - b).map((width) => `${width}px`).join(', ');
		issues.push({
			id: 'rendering-horizontal-overflow',
			category: RENDERING_CATEGORY,
			severity: 'error',
			message: `${plural(overflowPages.length, 'page scrolls', 'pages scroll')} sideways at ${widthList}.`,
			description:
				'Content wider than the screen lets the page scroll horizontally. The check loads each page at 375px, 768px, and 1440px and waits for load animations to finish first.',
			howToFix:
				'Find the element named for each page and keep it inside the screen: remove fixed widths or negative margins, or set overflow to hidden on its section. Elements that start off-screen for a scroll animation need a clipping parent.',
			details: { locations: lines }
		});
	}

	// The navbar is one component on every page, so each duplicate is listed once, with the first page that shows it.
	const duplicates = new Map<string, string>();
	for (const page of rendered) {
		for (const viewport of page.viewports) {
			for (const link of viewport.duplicateNavLinks ?? []) {
				const key = `${link.text.toLowerCase()}\n${link.href}`;
				if (!duplicates.has(key)) {
					duplicates.set(key, `${pathOf(page.url)} — "${truncate(link.text, 60)}" shows ${link.count} times in the navbar, each to ${pathOf(link.href)}`);
				}
			}
		}
	}
	if (duplicates.size > 0) {
		issues.push({
			id: 'nav-duplicate-links',
			category: RENDERING_CATEGORY,
			severity: 'warning',
			message: `${plural(duplicates.size, 'navbar link shows', 'navbar links show')} more than once at 1440px.`,
			description:
				'The navbar shows the same link text to the same page more than once at the desktop width. Reviewers ask creators to remove the repeat.',
			howToFix:
				'Keep one of the links. If the second link is for the mobile menu, hide it at the desktop breakpoint. If the two links must stay, give them different text or different targets.',
			details: { locations: [...duplicates.values()] }
		});
	}

	if (failed.length > 0) {
		issues.push({
			id: 'rendering-pages-not-checked',
			category: RENDERING_CATEGORY,
			severity: 'warning',
			message: `${plural(failed.length, 'page', 'pages')} did not load in the browser check and were not checked.`,
			howToFix: 'Check that these pages load on the published site, then run validation again.',
			details: { locations: failed.map((page) => `${pathOf(page.url)} — ${truncate(page.error ?? 'did not load', 160)}`) }
		});
	}

	return issues;
}

export function summarizeRendering(
	pages: PageRenderObservation[],
	context: { pagesRequested: number; unavailableReason?: string }
): RenderingAnalysisResult {
	const issues = generateRenderingIssues(pages, context);
	const rendered = pages.filter((page) => page.status === 'ok');
	return {
		issues,
		stats: {
			analysisComplete: !context.unavailableReason && rendered.length > 0,
			pagesRequested: context.pagesRequested,
			pagesRendered: rendered.length,
			pagesFailed: pages.length - rendered.length,
			pagesNotRendered: Math.max(0, context.pagesRequested - pages.length),
			viewports: RENDER_VIEWPORTS.map((viewport) => `${viewport.width}px`).join(', '),
			pagesWithUncaughtErrors: rendered.filter((page) => page.uncaughtErrors.length > 0).length,
			pagesWithHorizontalOverflow: rendered.filter((page) =>
				page.viewports.some((viewport) => viewport.overflowPx > OVERFLOW_TOLERANCE_PX)
			).length
		},
		pages
	};
}
