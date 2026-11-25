/**
 * The SEO title formats in the submission guidelines (seo-02).
 *
 * Home: "{Template Name} - Webflow HTML website template", or the Ecommerce
 * variant. Each other page: "{Page Name} - {Template Name} - Webflow HTML
 * website template". Case and the dash character are not judged; the names
 * must be present.
 */

const SUFFIX = 'webflow (html|ecommerce) website template';
const DASH = '\\s[-–—]\\s+';

const HOME_TITLE_FORMAT = new RegExp(`^(\\S.*)${DASH}${SUFFIX}$`, 'i');
const TITLE_SUFFIX = new RegExp(`${DASH}${SUFFIX}$`, 'i');
/** A Home label and its separator: "Home - ", "Home One | ", "Home V1 - ". */
const HOME_LABEL = /^home(page)?\b[^-–—|·:]*\s+[-–—|·:]\s+/i;

export interface HomeTitle {
	templateName: string;
	/** The suffix in its guideline spelling, for the fix text. */
	suffix: string;
}

/**
 * The parts of a Home title, or `null` when the title is not in the Home format.
 *
 * The Home format accepts a Home label before the name ("Home One | Acme -
 * Webflow HTML website template"). The label is not part of the template name.
 * All other text before the suffix is the name, with its separators ("Acme - Studio").
 */
export function parseHomeTitle(title: string): HomeTitle | null {
	const match = HOME_TITLE_FORMAT.exec(title.trim());
	if (!match) return null;
	const templateName = match[1].replace(HOME_LABEL, '').trim() || match[1].trim();
	const kind = match[2].toLowerCase() === 'ecommerce' ? 'Ecommerce' : 'HTML';
	return { templateName, suffix: `Webflow ${kind} website template` };
}

/** True when a title is "{Page Name} - {Template Name} - {suffix}". */
export function followsPageTitleFormat(title: string, templateName: string): boolean {
	const name = templateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`^\\S.*${DASH}${name}${DASH}${SUFFIX}$`, 'i').test(title.trim());
}

/**
 * True when a title ends with the required suffix. The suffix alone is 32
 * characters, so the 60-character title limit does not apply to such a title.
 */
export function hasTemplateTitleSuffix(title: string): boolean {
	return TITLE_SUFFIX.test(title.trim());
}
