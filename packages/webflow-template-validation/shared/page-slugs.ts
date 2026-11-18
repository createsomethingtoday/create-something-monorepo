/**
 * Which published pages a validation run must check. One rule, used by the
 * CLI (to build the run), and by the validation worker (to confirm that a run
 * it records covered every page).
 */

import { getSlugPathname, isInternalCmsTemplateSlug } from '../extension/src/utils';

export type DesignerPage = {
	publishPath?: string | null;
	path?: string | null;
	slug?: string | null;
	isHomePage?: boolean;
	isCmsTemplate?: boolean;
	isDraft?: boolean;
	collectionId?: string | null;
	collectionName?: string | null;
};

/** A page as Webflow's Data API (and the MCP `list_pages` tool) returns it. */
export type DataApiPageLike = {
	slug?: string;
	draft?: boolean;
	archived?: boolean;
	collectionId?: string | null;
	publishedPath?: string;
};

/**
 * Published pages to check, from the Designer page list. Same rule as the
 * Validator app (getPageSlugScope in extension/src/index.ts): the first usable
 * path of each page, without CMS template pages, drafts, or repeats. Page
 * discovery from the published site finds only linked pages, so a run with
 * Designer data must not use it. The home page is left out: it is the site
 * URL, which the worker always checks, and the worker does not remove a
 * repeated '/' (it would report each home page finding twice).
 */
export function pageSlugsFromDesigner(pages: DesignerPage[]): string[] {
	const slugs = new Set<string>();
	for (const page of pages) {
		const first = [page.publishPath, page.isHomePage ? '/' : null, page.path, page.slug].find(
			(value): value is string => typeof value === 'string' && value.trim() !== ''
		);
		if (!first) continue;
		const pathname = getSlugPathname(first);
		const cmsTemplate =
			page.isCmsTemplate ||
			page.collectionId ||
			page.collectionName ||
			[pathname, page.publishPath, page.path, page.slug].some((value) => Boolean(value) && isInternalCmsTemplateSlug(value as string));
		if (cmsTemplate || page.isDraft || pathname === '/') continue;
		slugs.add(pathname);
	}
	return [...slugs];
}

/** The same list, from raw Data API pages. Mirrors mapPages in spike/headless-collector/map.ts. */
export function pageSlugsFromDataApi(pages: DataApiPageLike[]): string[] {
	return pageSlugsFromDesigner(
		pages
			.filter((page) => !page.archived)
			.map((page) => {
				const slug = page.slug ?? '';
				const publishPath = page.publishedPath ?? null;
				return {
					slug,
					path: slug,
					publishPath,
					collectionId: page.collectionId ?? null,
					isCmsTemplate: Boolean(page.collectionId),
					isDraft: Boolean(page.draft),
					isHomePage: publishPath === '/' || slug === ''
				};
			})
	);
}

/** The pathname form used to compare a run's page list with the expected one. */
export function normalizePagePath(value: string): string {
	return getSlugPathname(value);
}
