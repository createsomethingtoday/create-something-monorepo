import DOMPurify from 'isomorphic-dompurify';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

/**
 * One sanitizer per kind of rich text rendered with {@html}.
 *
 * Both fields used to be sanitized two different ways depending on which
 * component rendered them, which is how a gap in one path goes unnoticed.
 */

/** Reviewer-authored rejection/review feedback. Formatting only, no media. */
export function sanitizeFeedbackHtml(html: string | null | undefined): string {
	if (!html) return '';

	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
		ALLOWED_ATTR: ['href', 'target', 'rel']
	});
}

/** Creator-authored long description. Allows the marketplace subset. */
export function sanitizeLongDescription(html: string | null | undefined): string {
	return sanitizeLongDescriptionHtml(html);
}
