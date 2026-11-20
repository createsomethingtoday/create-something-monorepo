import { StorefrontError } from './errors';
import type { DraftFields } from './types';

export const LIMITS = {
	positioning: 120,
	coverAlt: 160,
	supportText: 400,
	note: 240,
	selections: 3
} as const;

/** Path the dashboard's /api/upload returns (webflow-dashboard-core uploads-url). */
const UPLOADS_PATH_PREFIX = '/api/uploads/';

export interface FieldIssue {
	field: string;
	issue: string;
}

export interface ValidationOptions {
	/** Origins of the dashboard upload path that may host cover images. */
	allowedCoverOrigins: readonly string[];
}

function text(value: unknown, field: string, max: number, issues: FieldIssue[]): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== 'string') {
		issues.push({ field, issue: 'must_be_string' });
		return null;
	}
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.length > max) issues.push({ field, issue: `max_${max}_chars` });
	return trimmed;
}

function parseUrl(value: string): URL | null {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}

/** HTTPS with no embedded credentials. Returns the normalized href. */
export function safeHttpsUrl(value: string): string | null {
	const url = parseUrl(value);
	if (!url || url.protocol !== 'https:' || url.username || url.password) return null;
	return url.href;
}

function safeMailto(value: string): string | null {
	const url = parseUrl(value);
	if (!url || url.protocol !== 'mailto:') return null;
	let address: string;
	try {
		address = decodeURIComponent(url.pathname);
	} catch {
		// Malformed percent escapes such as mailto:%ZZ@a.com.
		return null;
	}
	// One plain address, no headers such as ?cc= or ?body=.
	if (url.search || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)) return null;
	return `mailto:${address}`;
}

function url(
	value: unknown,
	field: string,
	issues: FieldIssue[],
	check: (raw: string) => string | null,
	issue: string
): string | null {
	const raw = text(value, field, 2048, issues);
	if (raw === null) return null;
	const normalized = check(raw);
	if (!normalized) {
		issues.push({ field, issue });
		return null;
	}
	return normalized;
}

function coverUrlCheck(allowedOrigins: readonly string[]) {
	const origins = new Set(allowedOrigins);
	return (raw: string): string | null => {
		const href = safeHttpsUrl(raw);
		if (!href) return null;
		const parsed = new URL(href);
		if (!origins.has(parsed.origin)) return null;
		if (!parsed.pathname.startsWith(UPLOADS_PATH_PREFIX) || parsed.pathname.includes('..')) return null;
		return href;
	};
}

/**
 * Validates and normalizes owner-supplied draft fields. Unknown keys are
 * rejected so a caller cannot write service-owned fields through this path.
 */
export function validateDraftFields(input: unknown, options: ValidationOptions): DraftFields {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new StorefrontError('invalid_request', 'Draft fields must be an object');
	}
	const record = input as Record<string, unknown>;
	const allowed = new Set(['positioning', 'coverUrl', 'coverAlt', 'portfolioUrl', 'supportText', 'supportUrl']);
	const unknown = Object.keys(record).filter((key) => !allowed.has(key));
	if (unknown.length) {
		throw new StorefrontError('invalid_request', 'Unknown draft fields', { details: { fields: unknown } });
	}

	const issues: FieldIssue[] = [];
	const fields: DraftFields = {
		positioning: text(record.positioning, 'positioning', LIMITS.positioning, issues),
		coverUrl: url(record.coverUrl, 'coverUrl', issues, coverUrlCheck(options.allowedCoverOrigins), 'must_be_dashboard_upload'),
		coverAlt: text(record.coverAlt, 'coverAlt', LIMITS.coverAlt, issues),
		portfolioUrl: url(record.portfolioUrl, 'portfolioUrl', issues, safeHttpsUrl, 'must_be_https'),
		supportText: text(record.supportText, 'supportText', LIMITS.supportText, issues),
		supportUrl: url(
			record.supportUrl,
			'supportUrl',
			issues,
			(raw) => safeHttpsUrl(raw) ?? safeMailto(raw),
			'must_be_https_or_mailto'
		)
	};

	if (fields.coverUrl && !fields.coverAlt) issues.push({ field: 'coverAlt', issue: 'required_with_cover' });
	if (Boolean(fields.supportText) !== Boolean(fields.supportUrl)) {
		issues.push({ field: 'support', issue: 'text_and_url_required_together' });
	}

	if (issues.length) {
		throw new StorefrontError('validation_failed', 'Storefront fields are invalid', { details: { issues } });
	}
	return fields;
}

export interface SelectionInput {
	assetId: string;
	note: string | null;
}

/** Shape checks only. Ownership and eligibility need Airtable (writer.ts). */
export function validateSelectionInput(input: unknown): SelectionInput[] {
	if (!Array.isArray(input)) {
		throw new StorefrontError('invalid_request', 'Selections must be an array');
	}
	const issues: FieldIssue[] = [];
	if (input.length > LIMITS.selections) issues.push({ field: 'selections', issue: `max_${LIMITS.selections}` });

	const seen = new Set<string>();
	const selections = input.map((entry, index): SelectionInput => {
		const field = `selections[${index}]`;
		if (!entry || typeof entry !== 'object') {
			issues.push({ field, issue: 'must_be_object' });
			return { assetId: '', note: null };
		}
		const { assetId, note } = entry as Record<string, unknown>;
		if (typeof assetId !== 'string' || !/^rec[A-Za-z0-9]{14}$/.test(assetId)) {
			issues.push({ field: `${field}.assetId`, issue: 'invalid_asset_id' });
		} else if (seen.has(assetId)) {
			issues.push({ field: `${field}.assetId`, issue: 'duplicate' });
		} else {
			seen.add(assetId);
		}
		return {
			assetId: typeof assetId === 'string' ? assetId : '',
			note: text(note, `${field}.note`, LIMITS.note, issues)
		};
	});

	if (issues.length) {
		throw new StorefrontError('validation_failed', 'Selections are invalid', { details: { issues } });
	}
	return selections;
}

const LINK_LABELS: Record<string, string> = {
	'dribbble.com': 'View Dribbble portfolio',
	'behance.net': 'View Behance portfolio',
	'instagram.com': 'Instagram',
	'linkedin.com': 'LinkedIn',
	'youtube.com': 'YouTube',
	'x.com': 'X',
	'twitter.com': 'X'
};

/** Mirrors profileLinkLabel in wf-template-marketplace-source creator-storefront.mjs. */
export function linkLabel(href: string): string {
	const host = new URL(href).hostname.replace(/^www\./, '');
	return LINK_LABELS[host] ?? 'Visit website';
}
