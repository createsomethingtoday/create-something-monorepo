import { error } from '@sveltejs/kit';
import type {
	TemplateOfferPostOfferAction,
	TemplateOfferRequestInput,
	TemplateOfferStrategy
} from './airtable';
import { isRecoveryOfferStrategy } from '../utils/template-lifecycle-policy';

export interface TemplateOfferRequestBody {
	offerLabel?: unknown;
	offerPrice?: unknown;
	fulfillmentUrl?: unknown;
	startsAt?: unknown;
	endsAt?: unknown;
	offerStrategy?: unknown;
	postOfferAction?: unknown;
	notes?: unknown;
	termsAccepted?: unknown;
	visibilityTermsAccepted?: unknown;
}

export interface TemplateOfferPolicyContext {
	marketplacePrice?: number | null;
	recoveryOfferUsed?: boolean | null;
}

const OFFER_STRATEGIES = new Set<TemplateOfferStrategy>([
	'Limited-time sale',
	'Creator-managed price test',
	'Prune recovery test',
	'Exit sale before delist',
	'Retention save'
]);

const POST_OFFER_ACTIONS = new Set<TemplateOfferPostOfferAction>([
	'Return to standard checkout',
	'Review search visibility after expiry',
	'Move to detail-only after expiry',
	'Delist / archive after expiry'
]);

const MIN_PAID_OFFER_PRICE = 19;
const MIN_MARKETPLACE_PRICE_RATIO = 0.35;
const MIN_OFFER_DURATION_HOURS = 24;
const MAX_OFFER_DURATION_DAYS = 30;

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

function parseOfferPrice(value: unknown, policy: TemplateOfferPolicyContext): number {
	const price =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
				? Number(value)
				: Number.NaN;

	if (!Number.isFinite(price) || price < 0 || price > 10000) {
		throw error(400, 'Offer price must be a number between 0 and 10000');
	}

	const normalizedPrice = Number(price.toFixed(2));
	const marketplacePrice =
		typeof policy.marketplacePrice === 'number' && Number.isFinite(policy.marketplacePrice)
			? Number(policy.marketplacePrice.toFixed(2))
			: null;

	if (marketplacePrice !== null) {
		if (marketplacePrice <= 0) {
			if (normalizedPrice !== 0) {
				throw error(400, 'Free templates can only submit a free offer price');
			}
			return normalizedPrice;
		}

		if (normalizedPrice > marketplacePrice) {
			throw error(400, 'Offer price cannot exceed the marketplace price');
		}

		const ratioFloor = Number((marketplacePrice * MIN_MARKETPLACE_PRICE_RATIO).toFixed(2));
		const minimumPrice = Math.min(marketplacePrice, Math.max(MIN_PAID_OFFER_PRICE, ratioFloor));
		if (normalizedPrice < minimumPrice) {
			throw error(400, `Offer price must be at least $${minimumPrice.toFixed(2)}`);
		}

		return normalizedPrice;
	}

	if (normalizedPrice < MIN_PAID_OFFER_PRICE) {
		throw error(400, `Offer price must be at least $${MIN_PAID_OFFER_PRICE}`);
	}

	return normalizedPrice;
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

function parsePostOfferAction(value: unknown): TemplateOfferPostOfferAction {
	const action =
		optionalString(value, 'Post-offer action') || 'Review search visibility after expiry';
	if (!POST_OFFER_ACTIONS.has(action as TemplateOfferPostOfferAction)) {
		throw error(400, 'Post-offer action is not supported');
	}
	return action as TemplateOfferPostOfferAction;
}

function requiresVisibilityTerms(action: TemplateOfferPostOfferAction): boolean {
	return action === 'Move to detail-only after expiry' || action === 'Delist / archive after expiry';
}

function validateOfferWindow(startsAt: string | undefined, endsAt: string, now: Date): void {
	const endDate = new Date(endsAt);
	const startDate = startsAt ? new Date(startsAt) : now;
	const effectiveStart = startDate.getTime() > now.getTime() ? startDate : now;
	const durationHours = (endDate.getTime() - effectiveStart.getTime()) / (60 * 60 * 1000);

	if (durationHours < MIN_OFFER_DURATION_HOURS) {
		throw error(400, `Offer duration must be at least ${MIN_OFFER_DURATION_HOURS} hours`);
	}

	if (durationHours > MAX_OFFER_DURATION_DAYS * 24) {
		throw error(400, `Offer duration must be ${MAX_OFFER_DURATION_DAYS} days or fewer`);
	}
}

function validateRecoveryPolicy(
	offerStrategy: TemplateOfferStrategy,
	policy: TemplateOfferPolicyContext
): void {
	if (!isRecoveryOfferStrategy(offerStrategy)) return;

	if (policy.recoveryOfferUsed) {
		throw error(
			400,
			'Recovery offers are one-time. This template must meet the marketplace re-entry threshold before another recovery path is available.'
		);
	}
}

export function normalizeTemplateOfferRequestBody(
	body: TemplateOfferRequestBody,
	creatorEmail: string,
	now = new Date(),
	policy: TemplateOfferPolicyContext = {}
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

	const startsAt = parseOptionalDate(body.startsAt, 'Start date');
	const endsAt = parseFutureDate(body.endsAt, 'End date', now);
	validateOfferWindow(startsAt, endsAt, now);

	const postOfferAction = parsePostOfferAction(body.postOfferAction);
	if (requiresVisibilityTerms(postOfferAction) && body.visibilityTermsAccepted !== true) {
		throw error(400, 'Search visibility terms must be accepted for this post-offer action');
	}
	const offerStrategy = parseOfferStrategy(body.offerStrategy);
	validateRecoveryPolicy(offerStrategy, policy);

	return {
		creatorEmail,
		offerLabel,
		offerPrice: parseOfferPrice(body.offerPrice, policy),
		fulfillmentUrl: parseHttpsUrl(body.fulfillmentUrl),
		startsAt,
		endsAt,
		offerStrategy,
		postOfferAction,
		notes,
		termsAcceptedAt: now.toISOString(),
		visibilityTermsAcceptedAt: body.visibilityTermsAccepted === true ? now.toISOString() : undefined
	};
}
