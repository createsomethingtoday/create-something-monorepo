/**
 * Uploaded fonts and the Licenses page. A font file that the creator uploads
 * ships to every buyer, so the Licenses page must name the font and link to
 * its license. Reviewers ask for this by hand ("confirm the uploaded font
 * license allows redistribution"); the check finds the fonts the page does
 * not name. It is a warning, because the reviewer decides whether the page
 * says enough about its fonts.
 *
 * Uploaded fonts are the `@font-face` rules in the site stylesheet whose files
 * are on Webflow's asset hosts. Google Fonts and Adobe Fonts load through
 * their own services and have no such rule. The check cannot read a license:
 * a font that the page names can still have a license that forbids
 * redistribution, and that stays with the reviewer.
 */

import type { ValidationIssue } from '../types';
import { fetchHTML } from '../utils/fetch-utils';
import { pageText } from './reviewer-standards';

const UPLOAD_HOST = /^(?:cdn\.prod\.website-files\.com|assets\.website-files\.com|assets-global\.website-files\.com|uploads-ssl\.webflow\.com)$/i;
const LICENSES_PATH = '/licenses';
/** Weight, style and format words that a family name can end with and a Licenses page can leave out. */
const DESCRIPTORS = new Set([
	'variable', 'vf', 'var', 'regular', 'italic', 'oblique', 'roman', 'book', 'thin', 'hairline', 'light', 'extralight', 'ultralight',
	'medium', 'semibold', 'demibold', 'bold', 'extrabold', 'ultrabold', 'black', 'heavy', 'web', 'webfont'
]);

/** A larger stylesheet is not read: the scan is linear, but the file is the site's own and has no size limit. */
const MAX_STYLESHEET_CHARS = 5_000_000;

/** CSS without comments. An unclosed comment ends the text. Index scans only, so the time is linear. */
function withoutComments(css: string): string {
	let out = '';
	for (let at = 0; at < css.length; ) {
		const open = css.indexOf('/*', at);
		if (open === -1) return out + css.slice(at);
		out += css.slice(at, open);
		const close = css.indexOf('*/', open + 2);
		if (close === -1) return out;
		at = close + 2;
	}
	return out;
}

/** Values of every `url(...)` in a declaration block. */
function urlValues(body: string): string[] {
	const values: string[] = [];
	for (let at = body.indexOf('url('); at !== -1; at = body.indexOf('url(', at + 4)) {
		const close = body.indexOf(')', at + 4);
		if (close === -1) break;
		values.push(body.slice(at + 4, close).trim().replace(/^['"]|['"]$/g, '').trim());
	}
	return values;
}

/** Family names of the `@font-face` rules whose files are on a Webflow asset host. */
export function extractUploadedFontFamilies(css: string, stylesheetUrl: string): string[] {
	const families = new Map<string, string>();
	if (css.length > MAX_STYLESHEET_CHARS) return [];
	const source = withoutComments(css);
	const lower = source.toLowerCase();
	for (let at = lower.indexOf('@font-face'); at !== -1; at = lower.indexOf('@font-face', at + 1)) {
		const open = source.indexOf('{', at);
		const close = open === -1 ? -1 : source.indexOf('}', open);
		if (close === -1) break;
		// Only white space can stand between the at-rule name and its block.
		if (source.slice(at + 10, open).trim() !== '') continue;
		const body = source.slice(open + 1, close);
		at = close;
		const declaration = body.split(';').find((part) => part.trim().toLowerCase().startsWith('font-family'));
		const family = declaration?.slice(declaration.indexOf(':') + 1).trim().replace(/^(['"])(.*)\1$/, '$2').trim();
		if (!family || !declaration?.includes(':')) continue;
		const uploaded = urlValues(body).some((value) => {
			try {
				const url = new URL(value, stylesheetUrl);
				return url.protocol === 'https:' && UPLOAD_HOST.test(url.hostname);
			} catch {
				return false;
			}
		});
		if (uploaded && !families.has(family.toLowerCase())) families.set(family.toLowerCase(), family);
	}
	return [...families.values()];
}

function words(value: string): string[] {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
}

/** Names a Licenses page uses for a font whose family name in the stylesheet is an abbreviation. */
const ALIASES: Record<string, string> = { fa: 'fontawesome' };
/** Format words that Webflow joins to the end of a one-word family name. */
const GLUED_SUFFIXES = ['variable', 'webfont', 'vf'];
/** Longest run of words on the page that is compared with a name as one word. */
const MAX_NAME_WORDS = 5;

/**
 * Forms of the family name to look for, each as one word without spaces.
 * Webflow often writes an uploaded family as one word made from the file name
 * ("Instrumentserif", "Aspektavf"), and a stylesheet name can end with weight
 * and style words that a Licenses page leaves out ("Switzer Variable",
 * "Fa Solid 900"). A short foundry prefix can also be left out when two words
 * or more stay ("PP Neue Montreal" is named by "Neue Montreal").
 */
function nameForms(family: string): string[] {
	const all = words(family);
	let end = all.length;
	while (end > 1 && (DESCRIPTORS.has(all[end - 1]) || /^[1-9]00$/.test(all[end - 1]))) end--;
	const base = all.slice(0, end);
	const forms = new Set<string>();
	const add = (parts: string[]) => {
		const joined = parts.join('');
		if (!joined) return;
		forms.add(joined);
		// A format word at the end of a one-word name: "aspektavf", "switzervariable".
		// Weight words are not cut from one word: "Highlight" is not "High".
		for (const suffix of GLUED_SUFFIXES) {
			if (joined.length - suffix.length >= 3 && joined.endsWith(suffix)) forms.add(joined.slice(0, -suffix.length));
		}
	};
	add(base);
	// The rest must be two words or more: "DM Sans" is not named by "Sans".
	if (base.length > 2 && base[0].length <= 3) add(base.slice(1));
	if (ALIASES[base[0]]) forms.add(ALIASES[base[0]]);
	return [...forms];
}

/**
 * True when the text names the font. Spaces are not compared ("Libre Caslon
 * Condensed" names "Librecasloncondensed"), but the name must start and end
 * at a word boundary ("International" does not name "Inter").
 */
export function isFontNamed(family: string, text: string): boolean {
	const forms = new Set(nameForms(family));
	if (forms.size === 0) return true; // A name with no letters or digits cannot be looked for.
	const page = words(text);
	for (let start = 0; start < page.length; start++) {
		let run = '';
		for (let length = 0; length < MAX_NAME_WORDS && start + length < page.length; length++) {
			run += page[start + length];
			if (forms.has(run)) return true;
		}
	}
	return false;
}

export function generateFontLicenseIssues(families: string[], licensesText: string): ValidationIssue[] {
	const missing = families.filter((family) => !isFontNamed(family, licensesText));
	if (missing.length === 0) return [];
	return [
		{
			id: 'font-license-missing',
			category: 'Content & Accessibility',
			// A warning: reviewers accept a Licenses page that names the source of its fonts and links to it.
			severity: 'warning',
			message: `${missing.length} uploaded font(s) are not named on the Licenses page`,
			description: `The site stylesheet loads these uploaded font files, and the Licenses page does not name them: ${missing.join(', ')}. An uploaded font ships to every buyer of the template.`,
			howToFix: 'Add each font to the Licenses page with its name and a link to its license. The license must let you ship the font files in a template; if it does not, replace the font. Remove an uploaded font that the template does not use.',
			details: { fonts: missing, uploadedFonts: families, locations: missing.map((family) => `${LICENSES_PATH} — "${family}" is not named`) }
		}
	];
}

/**
 * Compare the uploaded fonts with the Licenses page. A stylesheet or page
 * that does not load ends the check without a finding; a site with no
 * Licenses page already fails the required pages check.
 */
export async function auditFontLicenses(siteUrl: string, stylesheetUrls: Iterable<string>): Promise<ValidationIssue[]> {
	try {
		const urls = [...stylesheetUrls];
		if (urls.length === 0) return [];
		const sheets = await Promise.all(
			urls.map(async (url) => {
				const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
				if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
				return extractUploadedFontFamilies(await response.text(), url);
			})
		);
		const families = [...new Map(sheets.flat().map((family) => [family.toLowerCase(), family])).values()];
		if (families.length === 0) return [];
		const licenses = await fetchHTML(new URL(LICENSES_PATH, siteUrl).href);
		return generateFontLicenseIssues(families, pageText(licenses.html));
	} catch (error) {
		console.warn('Font license check skipped:', error);
		return [];
	}
}
