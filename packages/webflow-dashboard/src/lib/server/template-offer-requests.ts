import { error } from '@sveltejs/kit';
import type { TemplateOfferRequestInput, TemplateOfferStrategy } from './airtable';

export interface TemplateOfferRequestBody {
	offerLabel?: unknown;
	offerPrice?: unknown;
	fulfillmentUrl?: unknown;
	startsAt?: unknown;
	endsAt?: unknown;
	offerStrategy?: unknown;
	notes?: unknown;
	termsAccepted?: unknown;
}

const OFFER_STRATEGIES = new Set<TemplateOfferStrategy>([
	'Limited-time sale',
	'Creator-managed price test',
	'Prune recovery test',
	'Exit sale before delist',
	'Retention save'
]);

export function requireString(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw error(400, `${field} is required`);
	}
	return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') {
		throw error(400, `${field} must be a string`);
	}
	const trimmed = value.trim();
	return trimmed || undefined;
}

function parseHttpsUrl(value: unknown): string {
	const rawUrl = requireString(value, 'Fulfillment URL');

	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw error(400, 'Fulfillment URL must be a valid URL');
	}

	if (parsed.protocol !== 'https:') {
		throw error(400, 'Fulfillment URL must use HTTPS');
	}

	return parsed.toString();
}

function parseOfferPrice(value: unknown): number {
	const price =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
				? Number(value)
				: Number.NaN;

	if (!Number.isFinite(price) || price < 0 || price > 10000) {
		throw error(400, 'Offer price must be a number between 0 and 10000');
	}

	return Number(price.toFixed(2));
}

function parseFutureDate(value: unknown, field: string, now: Date): string {
	const rawValue = requireString(value, field);
	const date = new Date(rawValue);

	if (Number.isNaN(date.getTime())) {
		throw error(400, `${field} must be a valid date`);
	}

	if (date.getTime() <= now.getTime()) {
		throw error(400, `${field} must be in the future`);
	}

	return date.toISOString();
}

function parseOptionalDate(value: unknown, field: string): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const date = new Date(requireString(value, field));

	if (Number.isNaN(date.getTime())) {
		throw error(400, `${field} must be a valid date`);
	}

	return date.toISOString();
}

function parseOfferStrategy(value: unknown): TemplateOfferStrategy {
	const strategy = requireString(value, 'Offer strategy') as TemplateOfferStrategy;
	if (!OFFER_STRATEGIES.has(strategy)) {
		throw error(400, 'Offer strategy is not supported');
	}
	return strategy;
}

export function normalizeTemplateOfferRequestBody(
	body: TemplateOfferRequestBody,
	creatorEmail: string,
	now = new Date()
): TemplateOfferRequestInput {
	if (body.termsAccepted !== true) {
		throw error(400, 'Offer terms must be accepted before submitting');
	}

	const offerLabel = optionalString(body.offerLabel, 'Offer label') || 'Limited offer';
	if (offerLabel.length > 80) {
		throw error(400, 'Offer label must be 80 characters or fewer');
	}

	const notes = optionalString(body.notes, 'Notes');
	if (notes && notes.length > 1000) {
		throw error(400, 'Notes must be 1000 characters or fewer');
	}

	return {
		creatorEmail,
		offerLabel,
		offerPrice: parseOfferPrice(body.offerPrice),
		fulfillmentUrl: parseHttpsUrl(body.fulfillmentUrl),
		startsAt: parseOptionalDate(body.startsAt, 'Start date'),
		endsAt: parseFutureDate(body.endsAt, 'End date', now),
		offerStrategy: parseOfferStrategy(body.offerStrategy),
		notes,
		termsAcceptedAt: now.toISOString()
	};
}
