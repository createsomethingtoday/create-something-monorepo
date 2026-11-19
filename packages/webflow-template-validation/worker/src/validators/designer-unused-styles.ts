/**
 * Unused styles from the Designer's own site data (guideline design-systems-21).
 *
 * A Webflow preview link loads the site data without a sign-in. The Designer
 * computes its "Clean up" list from that data in the browser, so the same
 * data gives the same list without a Designer session.
 *
 * The site data has no public contract, so its path is not in this code. It
 * is the worker secret `PREVIEW_SITE_DATA_PATH`. Without the secret, and on
 * every failure, the functions here return `null`, and the caller then uses
 * the published-site check in `unused-styles.ts`.
 *
 * Measured against the Clean up panel on 100 submitted templates
 * (2026-11-19): 91 preview links loaded, 86 gave the same list, and 5 gave a
 * shorter list. No run named a style that the panel did not list. So a
 * finding is reliable, and an empty result is not proof of a clean site.
 */

import type { UnusedStyle, UnusedStylesResult } from './unused-styles';

const PREVIEW_HOST = 'preview.webflow.com';
const SITE_DATA_TIMEOUT_MS = 20000;
const SITE_DATA_MAX_BYTES = 20 * 1024 * 1024;
// A headless-browser user agent gets a link-preview stub and not the data.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
const STYLE_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface StyleBlock {
	_id: string;
	data: {
		type?: string;
		name?: string;
		sel?: string;
		children?: string[];
		affects?: Record<string, unknown>;
	};
}

export interface PreviewLink {
	siteSlug: string;
	token: string;
}

/**
 * The site slug and preview token of a Webflow preview link. Only
 * `https://preview.webflow.com/preview/<slug>?preview=<token>` is accepted,
 * so the value from a client cannot point the worker at another host.
 */
export function parsePreviewLink(value: unknown): PreviewLink | null {
	if (typeof value !== 'string') return null;
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.hostname !== PREVIEW_HOST || url.port || url.username || url.password) return null;
	const path = /^\/preview\/([a-z0-9][a-z0-9-]{0,99})\/?$/.exec(url.pathname);
	const token = url.searchParams.get('preview') || '';
	if (!path || !/^[0-9a-f]{32}$/.test(token)) return null;
	return { siteSlug: path[1], token };
}

/**
 * The site data request for a preview link, or `null` for a path template
 * this check does not accept. The host is always the Webflow preview host;
 * the template gives only the path and query, with `{site}` and `{token}`.
 */
export function previewSiteDataUrl(link: PreviewLink, pathTemplate: unknown): string | null {
	if (typeof pathTemplate !== 'string') return null;
	const template = pathTemplate.trim();
	if (!/^\/[^/\\]/.test(template) || !template.includes('{site}') || !template.includes('{token}')) return null;
	const url = new URL(`https://${PREVIEW_HOST}${template.replaceAll('{site}', link.siteSlug).replaceAll('{token}', link.token)}`);
	return url.hostname === PREVIEW_HOST ? url.href : null;
}

/**
 * The site data behind a preview link, or `null` when it does not load.
 * @param pathTemplate The worker secret `PREVIEW_SITE_DATA_PATH`.
 */
export async function fetchPreviewSiteData(link: PreviewLink, pathTemplate: unknown): Promise<unknown | null> {
	const url = previewSiteDataUrl(link, pathTemplate);
	if (!url) return null;
	try {
		const response = await fetch(url, {
			headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
			// A redirect is not followed, so the request stays on the preview
			// host. Workers do not have `redirect: 'error'`.
			redirect: 'manual',
			signal: AbortSignal.timeout(SITE_DATA_TIMEOUT_MS)
		});
		// An expired preview link answers HTTP 404. A redirect is not `ok`.
		if (!response.ok) {
			console.warn(`Unused styles: the Designer site data answered HTTP ${response.status}.`);
			return null;
		}
		const text = await response.text();
		if (text.length > SITE_DATA_MAX_BYTES) {
			console.warn('Unused styles: the Designer site data is too large.');
			return null;
		}
		return JSON.parse(text);
	} catch (error) {
		// The message can hold the request URL, which has the preview token.
		console.warn(`Unused styles: the Designer site data request failed (${error instanceof Error ? error.name : 'unknown error'}).`);
		return null;
	}
}

/** Class names in a selector: `.card.is-dark` gives `card` and `is-dark`. */
function selectorClasses(selector: string | undefined): string[] {
	return [...(selector || '').matchAll(/\.((?:\\.|[^.\s:\[>+~,])+)/g)].map((match) => match[1]);
}

/**
 * The styles that the Designer's Clean up panel lists, or `null` when the
 * data does not have the expected shape.
 *
 * A class style is in direct use when a page uses it (`affects`), or when
 * its ID is anywhere in the site data outside the style list: on an element,
 * in a component, or as an interaction target. A style is also in use when
 * an element that has a style in direct use matches its selector. That
 * covers the parent of a combo class, two styles with one selector, and the
 * same combo classes in a different order.
 */
export function findUnusedStylesInSiteData(siteData: unknown): UnusedStylesResult | null {
	if (!siteData || typeof siteData !== 'object') return null;
	const record = siteData as Record<string, unknown>;
	const blocks = (record.styles as { blocks?: unknown } | undefined)?.blocks;
	if (!Array.isArray(blocks)) return null;
	// Without elements or pages, every style would look unused.
	if (!Array.isArray(record.pages) || record.pages.length === 0) return null;

	const styles: StyleBlock[] = [];
	for (const block of blocks as StyleBlock[]) {
		if (!block || typeof block._id !== 'string' || !block.data || typeof block.data !== 'object') return null;
		if (block.data.type === 'class') styles.push(block);
	}
	if (styles.length === 0) return null;

	const { styles: _styles, ...rest } = record;
	const restText = JSON.stringify(rest);
	const referenced = new Set(restText.match(STYLE_ID) || []);
	// Most style IDs are UUIDs. An older style has its class name as its ID,
	// and that is searched for as a whole JSON string.
	const isReferenced = (id: string) => referenced.has(id) || (!UUID.test(id) && restText.includes(JSON.stringify(id)));
	const inDirectUse = (style: StyleBlock) => Object.keys(style.data.affects || {}).length > 0 || isReferenced(style._id);

	const directIds = new Set<string>();
	const usedClassSets: Set<string>[] = [];
	for (const style of styles) {
		if (!inDirectUse(style)) continue;
		directIds.add(style._id);
		usedClassSets.push(new Set(selectorClasses(style.data.sel)));
	}
	// No style in use at all means the data is not what this check expects.
	if (directIds.size === 0) return null;

	const unused: UnusedStyle[] = [];
	for (const style of styles) {
		if (directIds.has(style._id)) continue;
		const classes = selectorClasses(style.data.sel);
		if (classes.length === 0) continue;
		if (usedClassSets.some((used) => classes.every((name) => used.has(name)))) continue;
		unused.push({ name: classes.join(' '), classes: classes.map(unescapeClass), isCombo: classes.length > 1 });
	}
	unused.sort((a, b) => a.name.localeCompare(b.name));
	return { unused, stylesChecked: styles.length };
}

function unescapeClass(name: string): string {
	return name.replace(/\\(.)/g, '$1');
}
