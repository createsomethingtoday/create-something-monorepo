/**
 * Review-note checks: published-site findings that reviewers wrote in
 * creator-facing review notes again and again (177 notes, November 2026) and
 * that no check reported.
 *
 * Eight of them block the submission gate (BLOCKING below). Each of those ran
 * on 118 reviewed sites, and two reviewers with no context judged every hit:
 * no wrong hit and no unsure hit. The others are warnings, because a published
 * page cannot settle them (a "#" link can be a control, a collection can be a
 * helper) or because review practice is not uniform.
 *
 * The page data is read from the tree the reviewer standards already parsed,
 * so a page is parsed once.
 */

import type { ReviewNoteCheckId, ReviewNotePageData, ReviewerPageAudit, ValidationIssue } from '../types';
import { ancestors, attr, classes, isFooter, isNav, normalize, text, type MarkupNode } from '../utils/markup';

const CATEGORY = 'Content & Accessibility';
const LICENSES_PATH = '/licenses';
const CHANGELOG_PATH = '/changelog';
const INSTRUCTIONS_PATH = '/instructions';
/** Pages that show sample components, or that the platform serves with an error status by design. */
const SPECIMEN_PATHS = new Set(['/style-guide', '/styleguide', '/instructions', '/licenses', '/changelog', '/401', '/404']);
/** Internal targets that answer with an error status by design. */
const ERROR_STATUS_PATHS = new Set(['/401', '/404']);
/** Webflow's own asset for the Background Video play/pause control. */
const PLATFORM_ASSET_PREFIX = '6022af993a6b2191db3ed10c';
/** A main collection holds 3 to 7 items (guideline cms-and-ecommerce-09). */
const COLLECTION_ITEM_LIMIT = 7;
const MAX_SAMPLES = 5;

/** Checks that block the submission gate. Every other check in this file is a warning. */
const BLOCKING = new Set<ReviewNoteCheckId>([
	'links-own-domain-absolute',
	'links-other-webflow-site',
	'links-internal-not-found',
	'changelog-future-date',
	'powered-by-webflow-target',
	'gsap-interactions-instructions-page',
	'licenses-flaticon-attribution',
	'assets-other-project'
]);

/** Link classes and attributes that mark a control, not a link that should go somewhere. */
const CONTROL_CLASS = /^(?:w-lightbox|w-tab-link|w-dropdown-toggle|w-nav-button|w-slider-.+|w-pagination-.+|w-commerce-.+)$/;
const CONTROL_ATTRIBUTES = [
	'data-wf-target', 'data-w-id', 'data-w-tab', 'data-wf-cart-action', 'data-node-type', 'data-wf-bindings', 'data-wf-sku-bindings',
	'aria-controls', 'aria-expanded', 'aria-haspopup', 'aria-pressed'
];
const CONTROL_ROLES = new Set(['button', 'tab', 'switch', 'menuitem']);
/** A data attribute that is not Webflow's own is a hook for custom code ("data-modal-open"). */
const CUSTOM_DATA_ATTRIBUTE = /^data-(?!wf-|w-)/;
const ICON_CONTROL_CLASS = /(?:^|[-_])(?:arrow|chevron|caret)s?(?:[-_]|$)/i;
/** Collections that sort or label other content. They can hold more than the item limit. */
const HELPER_COLLECTION = /(?:^|-)(?:tags?|categor(?:y|ies)|authors?|topics?|types?|labels?)(?:-|$)/i;
const HIDDEN_CLASS = /^(?:w-condition-invisible|w-dyn-hide)$/;
const BACK_TO_TOP = /\b(?:to|at)\s+(?:the\s+)?top\b|^(?:top|up)$|^[↑⬆▲]+$/i;
/**
 * A link that a script or an interaction uses as a control often has no role or
 * ARIA attribute. Its class or its label names the action, so those are read too.
 */
const CONTROL_CLASS_WORD = /(?:^|[-_])(?:menu|hamburger|burger|close|toggle|modal|popup|accordion|tabs?|slider|carousel|swiper|prev|previous|next|play|pause|search|filter|switch|trigger|dismiss|cookie)(?:[-_]|$)/i;
const CONTROL_LABEL = /^(?:open|close|menu|toggle|submit|send|search|play|pause|next|prev(?:ious)?|share|copy|print|filter|apply|add to cart|remove|clear|dismiss|accept|decline|show (?:more|less|all)|load more|view more|see more)\b/i;
/** A "Designed by" credit in the footer is allowed, and it can link to the creator's own site. */
const DESIGN_CREDIT = /\b(?:design|develop|ma[dk]e|built|build|creat|craft)\w*(?:\s*(?:&|and|\+)\s*\w+)?\s+by\b/i;
const SOCIAL = /facebook|instagram|twitter|linkedin|youtube|tiktok|dribbble|behance|pinterest|github|whatsapp|telegram|threads|social/i;
const BUTTON_CLASS = /(?:^|[-_])(?:button|btn|cta)(?:[-_]|$)/i;

const ASSET_URL = /cdn\.prod\.website-files\.com\/([0-9a-f]{24})\//gi;
const GSAP_SCRIPT = /(?:^|[/@._-])gsap(?:[/@._-][^?#]*)?\.js(?:[?#]|$)/i;

/** Image tools and libraries whose output is AI-generated. Names that are also fonts or common words are left out. */
const AI_SOURCE = /\blummi\b|\bmidjourney\b|\bchatgpt\b|\bdall[·\s-]?e\b|\bfirefly\b|\bnano banana\b|\bmagnific\b|\bkling\b|\bseedance\b|\bstable diffusion\b|\bideogram\b|\bleonardo\.?ai\b|\bgoogle gemini\b/i;
const AI_IDENTIFIED = new RegExp(
	`\\bgenerat(?:ed|ion|ive)\\b|\\bartificial intelligence\\b|\\bai[\\s-](?:images?|imagery|art|artwork|visuals?|photos?|photography|created|made)\\b` +
		// "made by the author with <tool>" also says how the image was made.
		`|\\b(?:made|created|produced|rendered|illustrated)\\b[^.]{0,80}\\b(?:with|using|by|in|through)\\b[^.]{0,30}(?:${AI_SOURCE.source})`,
	'i'
);
const FLATICON = /\bflaticon\b/i;
/** Words that show the page deals with the Flaticon license: a paid plan, or a credit to the icon author. */
const FLATICON_COVERED = /\bpremium\b|\bpaid\b|\bsubscription\b|\battribut|\bcredit|\b(?:made|designed|created)\s+by\b/i;
const VIDEO_WORDS = /\bvideos?\b|\bfootage\b|\bclips?\b|\bshowreel\b/i;
const LOTTIE_WORDS = /\blottie|\banimations?\b/i;

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_NAME = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_PATTERNS: Array<{ pattern: RegExp; read: (m: RegExpExecArray) => [number, number, number] }> = [
	{ pattern: new RegExp(`\\b${MONTH_NAME}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'), read: (m) => [Number(m[3]), monthIndex(m[1]), Number(m[2])] },
	{ pattern: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_NAME}\\.?,?\\s+(\\d{4})\\b`, 'gi'), read: (m) => [Number(m[3]), monthIndex(m[2]), Number(m[1])] },
	{ pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/g, read: (m) => [Number(m[1]), Number(m[2]) - 1, Number(m[3])] }
];

interface Check {
	message: (count: number) => string;
	description: string;
	howToFix: string;
}

const CHECKS: Record<ReviewNoteCheckId, Check> = {
	'links-placeholder-href': {
		message: (n) => `Links go nowhere ("#") on ${n} page(s)`,
		description: 'A button, navigation link, footer link or social icon with the link "#" does nothing for the buyer\'s visitors. Reviewers ask for a real target.',
		howToFix: 'Give each link a page, a section or an external URL. A social icon can link to the home page of its network. A link that only opens a menu or a pop-up through custom code can keep "#": ignore this warning for it.'
	},
	'links-own-domain-absolute': {
		message: (n) => `Links use the full address of this template's own site on ${n} page(s)`,
		description: 'A link that holds the full webflow.io address of the template sends the buyer\'s visitors back to the template, not to the buyer\'s site.',
		howToFix: 'Select the page in the link settings instead of pasting its full URL.'
	},
	'links-other-webflow-site': {
		message: (n) => `Links open a different webflow.io site on ${n} page(s)`,
		description: 'A link to another webflow.io site is usually left over from another template or project.',
		howToFix: 'Point the link to a page of this template, or remove it.'
	},
	'links-internal-not-found': {
		message: (n) => `${n} internal link target(s) do not exist`,
		description: 'These links open the 404 page.',
		howToFix: 'Publish the missing page, or change the link to a page that exists.'
	},
	'cms-collection-over-item-limit': {
		message: (n) => `${n} CMS collection(s) show more than ${COLLECTION_ITEM_LIMIT} items`,
		description: `A main content collection ships with 3 to ${COLLECTION_ITEM_LIMIT} items (guideline cms-and-ecommerce-09). The count is the number of different items linked on the published site, so the collection holds at least this many.`,
		howToFix: `Reduce the collection to ${COLLECTION_ITEM_LIMIT} items or fewer. A helper collection, for example categories, tags or schedule entries, can hold more: ignore this warning for it.`
	},
	'changelog-future-date': {
		message: () => 'The Changelog page shows a date in the future',
		description: 'A changelog records what was released, so its dates cannot be later than today.',
		howToFix: 'Correct the date on the Changelog page.'
	},
	'powered-by-webflow-target': {
		message: () => 'The "Powered by Webflow" link does not open the Webflow home page',
		description: 'The footer credit must link to https://webflow.com (guideline seo-03), not to a template, a profile or another page of webflow.com.',
		howToFix: 'Set the link to https://webflow.com.'
	},
	'gsap-interactions-instructions-page': {
		message: () => 'The site loads GSAP, but there is no Instructions page',
		description: 'A template that uses GSAP, also through Webflow Interactions, needs an Instructions page at /instructions that tells the buyer how to edit or remove the animations.',
		howToFix: 'Create a page at /instructions that lists the animated elements and how to change or remove each animation.'
	},
	'licenses-asset-type-not-listed': {
		message: () => 'The Licenses page does not list an asset type that the template uses',
		description: 'Each type of asset in the template needs its source and license on the Licenses page.',
		howToFix: 'Add the source and the license of each listed asset type to the Licenses page.'
	},
	'licenses-flaticon-attribution': {
		message: () => 'The Licenses page names Flaticon with no attribution and no Premium license',
		description: 'Free Flaticon icons require an attribution to the icon author. A Flaticon Premium license does not, and the page must then say that the license is Premium.',
		howToFix: 'Add the attribution for each free Flaticon icon, or state that the icons are used under a Flaticon Premium license.'
	},
	'licenses-ai-not-identified': {
		message: () => 'The Licenses page names an AI image source but does not say the images are AI-generated',
		description: 'AI-generated images must be identified as AI-generated on the Licenses page (guideline images-and-assets-15).',
		howToFix: 'State on the Licenses page which images are AI-generated and which tool or library made them.'
	},
	'assets-other-project': {
		message: (n) => `Images or videos load from ${n} other Webflow project(s)`,
		description: 'An asset that is stored in another project is not part of this template: the buyer cannot manage it, and it disappears when the other project changes.',
		howToFix: 'Upload the asset to this project and select it again in the Designer.'
	}
};

/** Read one published page. `elements` is the rendered element list of the parsed page. */
export function auditReviewNotes(elements: MarkupNode[], root: MarkupNode, pageUrl: URL, path: string): ReviewNotePageData {
	const data: ReviewNotePageData = {
		placeholderLinks: [],
		ownDomainLinks: [],
		otherWebflowSites: [],
		internalTargets: [],
		cmsItemPaths: [],
		footerWebflowLinks: [],
		assetPrefixes: {},
		loadsGsap: false,
		usesVideo: false,
		usesLottie: false
	};
	const internal = new Set<string>();
	const items = new Set<string>();
	const otherSites = new Set<string>();
	const specimenPage = SPECIMEN_PATHS.has(path);

	for (const el of elements) {
		if (el.name === 'html') data.siteId = attr(el, 'data-wf-site').toLowerCase() || undefined;
		if (el.name === 'script' && GSAP_SCRIPT.test(attr(el, 'src'))) data.loadsGsap = true;
		if (el.name === 'video' || classes(el).includes('w-background-video') || classes(el).includes('w-video')) data.usesVideo = true;
		if (attr(el, 'data-animation-type') === 'lottie' || el.name === 'lottie-player' || el.name === 'dotlottie-player') data.usesLottie = true;
		collectAssetPrefixes(el, data);
		if (el.name !== 'a') continue;

		const href = attr(el, 'href').trim();
		if (href === '#') {
			if (!specimenPage && !isControl(el)) data.placeholderLinks.push({ context: linkContext(el), label: linkLabel(el) });
			continue;
		}
		let target: URL;
		try {
			target = new URL(href, pageUrl);
		} catch {
			continue;
		}
		if (!/^https?:$/.test(target.protocol)) continue;
		const targetHost = target.hostname.toLowerCase();
		if (targetHost === pageUrl.hostname.toLowerCase()) {
			const targetPath = target.pathname.replace(/\/+$/, '') || '/';
			if (/^(?:https?:)?\/\//i.test(href) && data.ownDomainLinks.length < MAX_SAMPLES) data.ownDomainLinks.push(href.slice(0, 120));
			// A path that starts with "//" resolves to another host when it is joined to the site again, so it is not a target of this site.
			const sitePath = !targetPath.startsWith('//');
			if (sitePath && !ERROR_STATUS_PATHS.has(targetPath)) internal.add(targetPath);
			if (sitePath && targetPath.split('/').length === 3 && ancestors(el).some((parent) => classes(parent).includes('w-dyn-item'))) items.add(targetPath);
		} else if (/\.webflow\.io$/i.test(targetHost)) {
			// The Licenses and Instructions pages name sources and guides, and one of those can be a webflow.io site.
			if (!specimenPage && !isDesignCredit(el)) otherSites.add(targetHost);
		} else if (ancestors(el).some(isFooter)) {
			// The footer credit: a link to webflow.com, or a link that reads "Webflow" and opens another address.
			const label = normalize(text(el)).slice(0, 60);
			const isWebflow = /^(?:www\.)?webflow\.com$/i.test(targetHost);
			if (isWebflow || /\bwebflow\b/i.test(label)) {
				data.footerWebflowLinks.push({ text: label, target: isWebflow ? `webflow.com${target.pathname.replace(/\/+$/, '')}` : `${targetHost}${target.pathname.replace(/\/+$/, '')}` });
			}
		}
	}

	data.internalTargets = [...internal];
	data.cmsItemPaths = [...items];
	data.otherWebflowSites = [...otherSites];
	if (path === LICENSES_PATH || path === CHANGELOG_PATH) {
		// The page's own content: a word in the navbar or the footer does not list an asset.
		data.pageText = normalize(text(elements.find((el) => el.name === 'body') ?? root, (el) => isNav(el) || isFooter(el)));
	}
	return data;
}

/** Internal link targets of a run that no audited page covers. The caller asks the site for their status. */
export function uncheckedInternalTargets(audits: ReviewerPageAudit[], limit: number): string[] {
	const known = new Set(audits.map((audit) => audit.path));
	const targets = new Set<string>();
	for (const audit of audits) for (const path of audit.notes?.internalTargets ?? []) if (!known.has(path)) targets.add(path);
	return [...targets].sort().slice(0, limit);
}

export interface ReviewNoteContext {
	/** Utility paths the site answered with HTTP 404 (known only on a full-site run). */
	missingPaths?: string[];
	/** Internal link targets the site answered with HTTP 404. */
	notFoundTargets?: string[];
	/** Day the run was made. A date later than the next day counts as a future date. */
	now?: Date;
}

/** One issue per check, listing every page that shows the finding. A check in BLOCKING is an error; the others are warnings. */
export function generateReviewNoteIssues(audits: ReviewerPageAudit[], context: ReviewNoteContext = {}): ValidationIssue[] {
	const pages = audits.filter((audit) => audit.notes).map((audit) => ({ ...audit, notes: audit.notes! }));
	if (pages.length === 0) return [];
	const byPath = new Map(pages.map((page) => [page.path, page]));
	const found = new Map<ReviewNoteCheckId, Array<{ url: string; detail: string }>>();
	const add = (id: ReviewNoteCheckId, url: string, detail: string) => found.set(id, [...(found.get(id) ?? []), { url, detail }]);
	const home = byPath.get('/');
	const siteUrl = (home ?? pages[0]).url;

	for (const page of pages) {
		const { notes } = page;
		if (notes.placeholderLinks.length) add('links-placeholder-href', page.url, placeholderDetail(notes.placeholderLinks));
		if (notes.ownDomainLinks.length) add('links-own-domain-absolute', page.url, notes.ownDomainLinks.join(', '));
		if (notes.otherWebflowSites.length) add('links-other-webflow-site', page.url, notes.otherWebflowSites.slice(0, MAX_SAMPLES).join(', '));
	}

	const notFound = new Set(context.notFoundTargets ?? []);
	for (const target of [...notFound].sort()) {
		const sources = pages.filter((page) => page.notes.internalTargets.includes(target)).map((page) => page.path);
		if (sources.length) add('links-internal-not-found', new URL(target, siteUrl).href, `linked from ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` and ${sources.length - 3} more` : ''}`);
	}

	const collections = new Map<string, Set<string>>();
	for (const page of pages) {
		for (const item of page.notes.cmsItemPaths) {
			const collection = item.split('/')[1];
			collections.set(collection, (collections.get(collection) ?? new Set()).add(item));
		}
	}
	for (const [collection, items] of [...collections].sort()) {
		if (items.size > COLLECTION_ITEM_LIMIT && !HELPER_COLLECTION.test(collection)) add('cms-collection-over-item-limit', new URL(`/${collection}`, siteUrl).href, `at least ${items.size} items`);
	}

	const changelog = byPath.get(CHANGELOG_PATH);
	const futureDate = changelog?.notes.pageText ? firstFutureDate(changelog.notes.pageText, context.now ?? new Date()) : null;
	if (changelog && futureDate) add('changelog-future-date', changelog.url, futureDate);

	if (home) {
		// One footer link to the Webflow home page is the credit. A footer that names or links Webflow without it has the wrong target.
		const links = home.notes.footerWebflowLinks;
		if (links.length && !links.some((link) => link.target === 'webflow.com')) {
			const credit = links.find((link) => /webflow/i.test(link.text)) ?? links[0];
			add('powered-by-webflow-target', home.url, `the footer link opens ${credit.target}, not https://webflow.com`);
		}
	}

	if (context.missingPaths?.includes(INSTRUCTIONS_PATH) && !byPath.has(INSTRUCTIONS_PATH) && !pages.some((page) => page.usesCustomGsap)) {
		const loader = home?.notes.loadsGsap ? home : pages.find((page) => page.notes.loadsGsap);
		if (loader) add('gsap-interactions-instructions-page', loader.url, 'GSAP script found; /instructions was not found');
	}

	// An asset folder is this project's (the site id) or the CMS database's. The CMS folder shows in collection lists and
	// Rich Text, or only on CMS item pages (an image bound to the item). A folder that is neither is another project's.
	const siteId = home?.notes.siteId ?? pages.find((page) => page.notes.siteId)?.notes.siteId;
	if (siteId) {
		const itemPages = new Set(pages.flatMap((page) => page.notes.cmsItemPaths));
		const prefixes = new Map<string, { count: number; cms: boolean; offItemPages: boolean; page: string }>();
		for (const page of pages) {
			for (const [prefix, use] of Object.entries(page.notes.assetPrefixes)) {
				const entry = prefixes.get(prefix) ?? { count: 0, cms: false, offItemPages: false, page: page.url };
				prefixes.set(prefix, {
					count: entry.count + use.count,
					cms: entry.cms || use.inCollectionList,
					offItemPages: entry.offItemPages || !itemPages.has(page.path),
					page: entry.page
				});
			}
		}
		for (const [prefix, use] of [...prefixes].sort()) {
			if (prefix !== siteId && !use.cms && use.offItemPages) add('assets-other-project', use.page, `${use.count} asset reference(s) in cdn.prod.website-files.com/${prefix}/`);
		}
	}

	const licenses = byPath.get(LICENSES_PATH);
	const licensesText = licenses?.notes.pageText;
	if (licenses && licensesText) {
		const missing = [
			...(pages.some((page) => page.notes.usesVideo) && !VIDEO_WORDS.test(licensesText) ? ['video'] : []),
			...(pages.some((page) => page.notes.usesLottie) && !LOTTIE_WORDS.test(licensesText) ? ['Lottie animation'] : [])
		];
		if (missing.length) add('licenses-asset-type-not-listed', licenses.url, `used in the template, not named on the page: ${missing.join(', ')}`);
		if (FLATICON.test(licensesText) && !FLATICON_COVERED.test(licensesText)) add('licenses-flaticon-attribution', licenses.url, 'Flaticon is named; no attribution and no Premium license found');
		const aiSource = AI_SOURCE.exec(licensesText);
		if (aiSource && !AI_IDENTIFIED.test(licensesText)) add('licenses-ai-not-identified', licenses.url, `"${aiSource[0]}" is named; the page does not say which images are AI-generated`);
	}

	return (Object.keys(CHECKS) as ReviewNoteCheckId[]).flatMap((id) => {
		const failing = found.get(id);
		if (!failing?.length) return [];
		const check = CHECKS[id];
		return [
			{
				id,
				category: CATEGORY,
				severity: BLOCKING.has(id) ? ('error' as const) : ('warning' as const),
				message: check.message(failing.length),
				description: check.description,
				howToFix: check.howToFix,
				details: { pages: failing }
			}
		];
	});
}

function isControl(link: MarkupNode): boolean {
	if (classes(link).some((name) => CONTROL_CLASS.test(name))) return true;
	if (CONTROL_ATTRIBUTES.some((name) => link.attribs?.[name] !== undefined)) return true;
	if (CONTROL_ROLES.has(attr(link, 'role').toLowerCase()) || attr(link, 'type').toLowerCase() === 'button') return true;
	if (attr(link, 'aria-hidden') === 'true') return true;
	if ([link, ...ancestors(link)].some((el) => classes(el).some((name) => HIDDEN_CLASS.test(name)))) return true;
	if (Object.keys(link.attribs ?? {}).some((name) => CUSTOM_DATA_ATTRIBUTE.test(name))) return true;
	const label = linkLabel(link);
	if (CONTROL_LABEL.test(label) || CONTROL_LABEL.test(attr(link, 'aria-label').trim())) return true;
	const ownClasses = classes(link).filter((name) => !name.startsWith('w-'));
	if (ownClasses.some((name) => CONTROL_CLASS_WORD.test(name))) return true;
	// An arrow with no text is the control of a slider or a carousel. An arrow next to text is a link with an icon.
	if (!normalize(text(link)) && !attr(link, 'aria-label').trim() && ownClasses.some((name) => ICON_CONTROL_CLASS.test(name))) return true;
	// "#" is a valid target for a link that returns to the top of the page.
	return BACK_TO_TOP.test(label);
}

function isDesignCredit(link: MarkupNode): boolean {
	if (!ancestors(link).some(isFooter)) return false;
	return DESIGN_CREDIT.test(normalize(text(link))) || (link.parent ? DESIGN_CREDIT.test(normalize(text(link.parent)).slice(0, 240)) : false);
}

function linkLabel(link: MarkupNode): string {
	return (normalize(text(link)) || attr(link, 'aria-label').trim() || classes(link).filter((name) => !name.startsWith('w-'))[0] || 'link').slice(0, 40);
}

function linkContext(link: MarkupNode): ReviewNotePageData['placeholderLinks'][number]['context'] {
	const parents = ancestors(link);
	const names = [link, ...parents.slice(0, 1)].map((el) => `${attr(el, 'class')} ${attr(el, 'aria-label')}`).join(' ');
	if (SOCIAL.test(`${names} ${normalize(text(link))}`)) return 'social';
	if (parents.some(isNav)) return 'navigation';
	if (parents.some(isFooter)) return 'footer';
	if (classes(link).some((name) => name === 'w-button' || BUTTON_CLASS.test(name))) return 'button';
	return 'other';
}

function placeholderDetail(links: ReviewNotePageData['placeholderLinks']): string {
	const counts = new Map<string, number>();
	for (const link of links) counts.set(link.context, (counts.get(link.context) ?? 0) + 1);
	const groups = [...counts].map(([context, count]) => `${count} ${context === 'other' ? 'other link(s)' : `${context} link(s)`}`).join(', ');
	const samples = [...new Set(links.map((link) => `"${link.label}"`))].slice(0, 3).join(', ');
	return `${groups}: ${samples}`;
}

function collectAssetPrefixes(el: MarkupNode, data: ReviewNotePageData): void {
	if (el.name !== 'img' && el.name !== 'source' && el.name !== 'video') return;
	const sources = `${attr(el, 'src')} ${attr(el, 'srcset')} ${attr(el, 'poster')}`;
	const inCollectionList = ancestors(el).some((parent) => classes(parent).some((name) => name === 'w-dyn-item' || name === 'w-richtext'));
	for (const match of sources.matchAll(ASSET_URL)) {
		const prefix = match[1].toLowerCase();
		if (prefix === PLATFORM_ASSET_PREFIX) continue;
		const entry = (data.assetPrefixes[prefix] ??= { count: 0, inCollectionList: false });
		entry.count++;
		entry.inCollectionList ||= inCollectionList;
	}
}

function monthIndex(name: string): number {
	return MONTHS.findIndex((month) => month.startsWith(name.toLowerCase().replace(/^sept$/, 'sep')));
}

/** The first date on the page that is later than the day after `now`, as written on the page. */
function firstFutureDate(pageText: string, now: Date): string | null {
	const limit = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59);
	for (const { pattern, read } of DATE_PATTERNS) {
		for (const match of pageText.matchAll(pattern)) {
			const [year, month, day] = read(match as RegExpExecArray);
			if (month < 0 || month > 11 || day < 1 || day > 31 || year < 2000 || year > 2100) continue;
			if (Date.UTC(year, month, day) > limit) return `"${match[0]}"`;
		}
	}
	return null;
}
