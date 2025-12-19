/**
 * HTML Sanitization for Cloudflare Workers
 *
 * Strips dangerous HTML elements and attributes to prevent XSS attacks.
 * Works in edge runtime without DOM APIs.
 */

// Allowed HTML tags (safe for rich text content)
const ALLOWED_TAGS = new Set([
	'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'ul', 'ol', 'li',
	'a', 'blockquote', 'pre', 'code',
	'table', 'thead', 'tbody', 'tr', 'th', 'td',
	'div', 'hr'
]);

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
	'a': new Set(['href', 'title', 'target', 'rel']),
	'*': new Set(['class', 'id']) // Global attributes
};

// Dangerous patterns to remove completely
// Note: Using [\s\S] instead of . with 's' flag for cross-line matching
const DANGEROUS_PATTERNS = [
	// Script-related
	/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	// Event handlers
	/\s*on\w+\s*=\s*["'][^"']*["']/gi,
	/\s*on\w+\s*=\s*[^\s>]+/gi,
	// JavaScript URLs
	/javascript\s*:/gi,
	// Data URLs with scripts
	/data\s*:[^;]*;base64[^"']*/gi,
	// VBScript
	/vbscript\s*:/gi,
	// Expression (IE)
	/expression\s*\(/gi,
	// Style tags
	/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
	// Object/embed/iframe - using [\s\S] for cross-line matching
	/<(object|embed|iframe|frame|frameset|applet)\b[^>]*>[\s\S]*?<\/\1>/gi,
	/<(object|embed|iframe|frame|frameset|applet)\b[^>]*\/?>/gi,
	// SVG with scripts - using [\s\S] for cross-line matching
	/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
	// Form elements that could be used for phishing
	/<(form|input|button|select|textarea)\b[^>]*\/?>/gi,
	// Meta tags
	/<meta\b[^>]*\/?>/gi,
	// Link tags
	/<link\b[^>]*\/?>/gi,
	// Base tags
	/<base\b[^>]*\/?>/gi
];

/**
 * Helper to merge two Sets into a new Set
 */
function mergeSets<T>(set1: Set<T>, set2: Set<T>): Set<T> {
	const merged = new Set<T>();
	set1.forEach(item => merged.add(item));
	set2.forEach(item => merged.add(item));
	return merged;
}

/**
 * Sanitize an HTML attribute value
 */
function sanitizeAttributeValue(attrName: string, attrValue: string): string | null {
	const lowerValue = attrValue.toLowerCase().trim();

	// Block dangerous URL schemes in href/src
	if (attrName === 'href' || attrName === 'src') {
		if (
			lowerValue.startsWith('javascript:') ||
			lowerValue.startsWith('vbscript:') ||
			lowerValue.startsWith('data:')
		) {
			return null;
		}
	}

	// For target, only allow safe values
	if (attrName === 'target') {
		if (attrValue !== '_blank' && attrValue !== '_self') {
			return '_blank';
		}
	}

	// For rel on links, ensure noopener is present for _blank targets
	if (attrName === 'rel') {
		const rels = new Set(attrValue.toLowerCase().split(/\s+/));
		rels.add('noopener');
		rels.add('noreferrer');
		return Array.from(rels).join(' ');
	}

	return attrValue;
}

/**
 * Sanitize a single HTML tag
 */
function sanitizeTag(fullMatch: string, tagName: string, attributes: string): string {
	const lowerTagName = tagName.toLowerCase();

	// Remove disallowed tags entirely
	if (!ALLOWED_TAGS.has(lowerTagName)) {
		return '';
	}

	// Parse and filter attributes
	const allowedAttrs = ALLOWED_ATTRIBUTES[lowerTagName] || new Set<string>();
	const globalAttrs = ALLOWED_ATTRIBUTES['*'] || new Set<string>();
	const mergedAllowed = mergeSets(allowedAttrs, globalAttrs);

	const sanitizedAttrs: string[] = [];

	// Match attributes: name="value" or name='value' or name=value or just name
	const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))|(\w+)(?=\s|>|$)/g;
	let attrMatch;

	while ((attrMatch = attrRegex.exec(attributes)) !== null) {
		const attrName = (attrMatch[1] || attrMatch[5] || '').toLowerCase();
		const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

		// Skip event handlers and dangerous attributes
		if (attrName.startsWith('on') || attrName === 'style') {
			continue;
		}

		if (!mergedAllowed.has(attrName)) {
			continue;
		}

		const sanitizedValue = sanitizeAttributeValue(attrName, attrValue);
		if (sanitizedValue !== null) {
			sanitizedAttrs.push(`${attrName}="${sanitizedValue.replace(/"/g, '&quot;')}"`);
		}
	}

	const attrString = sanitizedAttrs.length > 0 ? ' ' + sanitizedAttrs.join(' ') : '';
	return `<${tagName}${attrString}>`;
}

/**
 * Sanitize HTML string to prevent XSS attacks
 *
 * @param html - Raw HTML string from untrusted source
 * @returns Sanitized HTML safe for rendering with {@html}
 */
export function sanitizeHtml(html: string | null | undefined): string {
	if (!html || typeof html !== 'string') {
		return '';
	}

	let sanitized = html;

	// Step 1: Remove dangerous patterns completely
	for (const pattern of DANGEROUS_PATTERNS) {
		sanitized = sanitized.replace(pattern, '');
	}

	// Step 2: Process remaining tags
	// Match opening tags with potential attributes
	sanitized = sanitized.replace(/<(\w+)([^>]*)>/g, sanitizeTag);

	// Step 3: Remove any closing tags for disallowed elements
	sanitized = sanitized.replace(/<\/(\w+)>/g, (match, tagName) => {
		return ALLOWED_TAGS.has(tagName.toLowerCase()) ? match : '';
	});

	// Step 4: Encode any remaining < or > that aren't part of valid tags
	// This catches malformed HTML that might have slipped through
	sanitized = sanitized
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		// Then restore the valid tags we processed
		.replace(/&lt;(\/?(?:p|br|b|i|u|strong|em|span|h[1-6]|ul|ol|li|a|blockquote|pre|code|table|thead|tbody|tr|th|td|div|hr))([^&]*)&gt;/gi,
			(_, tag, attrs) => `<${tag}${attrs.replace(/&quot;/g, '"')}>`
		);

	return sanitized;
}
