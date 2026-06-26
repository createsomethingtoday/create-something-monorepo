import type { Asset } from '$lib/server/airtable';
import {
	RECOVERY_REENTRY_QUALIFIED_SALES_30D,
	hasReachedRecoveryReentryThreshold,
	isReentryReviewRequested,
	isRecoveryOfferStrategy,
	isTemplateSearchSuppressed,
	recoverySalesRemaining
} from './template-lifecycle-policy';

export { isTemplateSearchSuppressed } from './template-lifecycle-policy';

export type TemplateHealthStatus = 'strong' | 'watch' | 'needs_attention' | 'limited_data';
export type TemplateHealthTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface TemplateHealthSignal {
	label: string;
	value: string;
	tone: TemplateHealthTone;
	description: string;
}

export interface TemplateHealthAction {
	title: string;
	description: string;
	priority: 'high' | 'medium' | 'low';
}

export type TemplateLifecycleAutomationCode =
	| 'collect_more_signal'
	| 'keep_searchable'
	| 'run_recovery_offer'
	| 'review_offer_outcome'
	| 'move_detail_only'
	| 'eligible_for_reentry'
	| 'reentry_review_requested'
	| 'detail_only_recovery';

export interface TemplateLifecycleAutomationSignal {
	code: TemplateLifecycleAutomationCode;
	label: string;
	summary: string;
	confidence: 'low' | 'medium' | 'high';
	recommendedOfferStrategy?: string;
	recommendedPostOfferAction?: string;
	searchVisibilityTarget?: string;
	signals: string[];
}

export type TemplateOfferState = 'none' | 'live' | 'expired' | 'internal';

export interface TemplateOfferLifecycle {
	hasOffer: boolean;
	state: TemplateOfferState;
	label: string;
	tone: TemplateHealthTone;
	summary: string;
	price: number | null;
	endsAt: Date | null;
	pruneReviewAt: Date | null;
	daysUntilEnd: number | null;
	daysUntilReview: number | null;
	ctaUrl?: string;
	visibility?: string;
	strategy?: string;
	postOfferAction?: string;
}

export interface TemplateHealthModel {
	status: TemplateHealthStatus;
	label: string;
	tone: TemplateHealthTone;
	summary: string;
	conversionRate: number | null;
	daysLive: number | null;
	searchVisibility?: string;
	searchVisibilitySuppressed: boolean;
	qualifiedSales30d: number | null;
	reentrySalesThreshold: number;
	recoveryOfferUsed: boolean;
	automation: TemplateLifecycleAutomationSignal;
	offer: TemplateOfferLifecycle;
	signals: TemplateHealthSignal[];
	actions: TemplateHealthAction[];
	hasQualityIssue: boolean;
	hasReviewFeedback: boolean;
}

const MIN_VIEWERS_FOR_HEALTH = 100;
const WATCH_DAYS_WITHOUT_PURCHASE = 180;
const NEEDS_ATTENTION_DAYS_WITHOUT_PURCHASE = 365;
const STRONG_CONVERSION_RATE = 2;
const WATCH_CONVERSION_RATE = 1;
const MEANINGFUL_PURCHASE_COUNT = 10;

function parseDate(value?: string): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start: Date, end = new Date()): number {
	return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

function daysUntil(target: Date, now = new Date()): number {
	return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function normalizeText(value?: string | null): string {
	return String(value ?? '').toLowerCase();
}

function hasPositiveQualitySignal(qualityScore?: string): boolean {
	const quality = normalizeText(qualityScore);
	if (!quality) return false;
	return quality.includes('good') || quality.includes('strong') || quality.includes('pass');
}

function hasNegativeQualitySignal(asset: Asset): boolean {
	const combined = [asset.qualityScore, asset.latestReviewStatus, asset.latestReviewFeedback]
		.map(normalizeText)
		.join(' ');

	return [
		'needs attention',
		'poor',
		'fail',
		'failed',
		'low',
		'issue',
		'issues',
		'changes requested',
		'rejected'
	].some((token) => combined.includes(token));
}

function isPublishedForHealth(asset: Asset): boolean {
	return asset.status === 'Published' || Boolean(asset.publishedDate);
}

function formatPercent(value: number | null): string {
	if (value === null) return 'Not enough data';
	return `${value.toFixed(1)}%`;
}

function formatDays(daysLive: number | null): string {
	if (daysLive === null) return 'Not published';
	if (daysLive < 30) return `${daysLive} days`;
	const months = Math.floor(daysLive / 30);
	if (months < 24) return `${months} mo`;
	return `${Math.floor(months / 12)} yr ${months % 12} mo`;
}

function addActionOnce(actions: TemplateHealthAction[], action: TemplateHealthAction): void {
	if (actions.some((existing) => existing.title === action.title)) return;
	actions.push(action);
}

function lifecycleAutomationSignal(input: {
	status: TemplateHealthStatus;
	isPublished: boolean;
	hasEnoughViewers: boolean;
	purchases: number;
	qualifiedSales30d: number | null;
	conversionRate: number | null;
	daysLive: number | null;
	qualityIssue: boolean;
	hasReviewFeedback: boolean;
	searchVisibility?: string | null;
	searchVisibilitySuppressed: boolean;
	recoveryOfferUsed: boolean;
	offer: TemplateOfferLifecycle;
}): TemplateLifecycleAutomationSignal {
	const qualifiedSales30d = input.qualifiedSales30d ?? 0;
	const remainingSales = recoverySalesRemaining(qualifiedSales30d);
	const reentryReviewRequested = isReentryReviewRequested(input.searchVisibility);
	const signals = [
		input.hasEnoughViewers ? 'enough_viewers' : 'limited_viewers',
		input.conversionRate === null ? 'conversion_unknown' : `conversion_${input.conversionRate.toFixed(1)}pct`,
		`purchases_${input.purchases}`,
		input.qualifiedSales30d === null ? 'qualified_sales_30d_unknown' : `qualified_sales_30d_${qualifiedSales30d}`,
		input.daysLive === null ? 'not_live' : `days_live_${input.daysLive}`,
		input.qualityIssue || input.hasReviewFeedback ? 'review_issue' : 'quality_clear',
		input.searchVisibilitySuppressed
			? reentryReviewRequested
				? 'reentry_review_requested'
				: 'detail_only'
			: 'searchable',
		input.recoveryOfferUsed ? 'recovery_used' : 'recovery_available',
		input.offer.hasOffer ? `offer_${input.offer.state}` : 'no_offer'
	];

	if (input.searchVisibilitySuppressed) {
		if (hasReachedRecoveryReentryThreshold(input.qualifiedSales30d) && !input.qualityIssue && !input.hasReviewFeedback) {
			if (reentryReviewRequested) {
				return {
					code: 'reentry_review_requested',
					label: 'Re-entry review pending',
					summary:
						'This detail-only template has reached the re-entry threshold and is queued for marketplace review. Keep it out of search until approval.',
					confidence: 'high',
					searchVisibilityTarget: 'Review requested',
					signals
				};
			}

			return {
				code: 'eligible_for_reentry',
				label: 'Eligible for search re-entry',
				summary:
					'This detail-only template has reached the 4 qualified sales in 30 days threshold. Review quality, then restore marketplace search if the listing is current.',
				confidence: 'high',
				searchVisibilityTarget: 'Searchable after review',
				signals
			};
		}

		return {
			code: 'detail_only_recovery',
			label: 'Detail-only recovery',
			summary:
				`Keep direct access intact. This template needs ${remainingSales} more qualified ${remainingSales === 1 ? 'sale' : 'sales'} in the rolling 30-day window before marketplace search re-entry.`,
			confidence: 'high',
			recommendedPostOfferAction: 'Review search visibility after expiry',
			searchVisibilityTarget: `${qualifiedSales30d}/${RECOVERY_REENTRY_QUALIFIED_SALES_30D} qualified sales`,
			signals
		};
	}

	if (input.offer.state === 'expired') {
		if (
			isRecoveryOfferStrategy(input.offer.strategy) &&
			hasReachedRecoveryReentryThreshold(input.qualifiedSales30d) &&
			!input.qualityIssue &&
			!input.hasReviewFeedback
		) {
			return {
				code: 'keep_searchable',
				label: 'Keep searchable',
				summary:
					'The one-time recovery window reached the 4 qualified sales in 30 days threshold. Keep the template searchable if the listing is current.',
				confidence: 'high',
				searchVisibilityTarget: 'Searchable',
				signals
			};
		}

		return {
			code: 'review_offer_outcome',
			label: 'Review offer outcome',
			summary:
				'The offer window ended. Compare conversion against the baseline before returning to search, moving detail-only, or archiving.',
			confidence: isRecoveryOfferStrategy(input.offer.strategy) ? 'high' : 'medium',
			recommendedPostOfferAction: input.offer.postOfferAction || 'Review search visibility after expiry',
			searchVisibilityTarget: 'Decide from offer-period performance',
			signals
		};
	}

	if (
		input.isPublished &&
		input.hasEnoughViewers &&
		!input.offer.hasOffer &&
		input.recoveryOfferUsed &&
		(input.status === 'needs_attention' ||
			input.purchases === 0 ||
			(input.conversionRate !== null && input.conversionRate < WATCH_CONVERSION_RATE))
	) {
		return {
			code: 'move_detail_only',
			label: 'Move detail-only',
			summary:
				'The one-time recovery path has already been used and the template is still underperforming. Preserve direct access and remove it from marketplace search.',
			confidence: 'high',
			searchVisibilityTarget: 'Detail only',
			signals
		};
	}

	if (
		input.isPublished &&
		input.hasEnoughViewers &&
		!input.offer.hasOffer &&
		!input.recoveryOfferUsed &&
		(input.status === 'needs_attention' ||
			input.purchases === 0 ||
			(input.conversionRate !== null && input.conversionRate < WATCH_CONVERSION_RATE))
	) {
		return {
			code: 'run_recovery_offer',
			label: 'Run recovery offer',
			summary:
				'Use a time-boxed creator offer to test price sensitivity before reducing search visibility.',
			confidence: input.daysLive !== null && input.daysLive > WATCH_DAYS_WITHOUT_PURCHASE ? 'high' : 'medium',
			recommendedOfferStrategy: 'Prune recovery test',
			recommendedPostOfferAction: 'Review search visibility after expiry',
			searchVisibilityTarget: 'Keep searchable during test',
			signals
		};
	}

	if (input.isPublished && (input.status === 'strong' || input.status === 'watch')) {
		return {
			code: 'keep_searchable',
			label: 'Keep searchable',
			summary: 'This template has enough quality or buyer signal to stay in marketplace search.',
			confidence: input.status === 'strong' ? 'high' : 'medium',
			searchVisibilityTarget: 'Searchable',
			signals
		};
	}

	return {
		code: 'collect_more_signal',
		label: 'Collect more signal',
		summary: 'Keep the listing accurate until there is enough viewer, quality, or offer data to automate a lifecycle decision.',
		confidence: 'low',
		searchVisibilityTarget: input.isPublished ? 'Searchable' : 'Not applicable until published',
		signals
	};
}

function computeTemplateOfferLifecycle(asset: Asset, now = new Date()): TemplateOfferLifecycle {
	const endsAt = parseDate(asset.activeOfferEndsAt);
	const pruneReviewAt = parseDate(asset.offerPruneReviewAt);
	const visibility = asset.activeOfferVisibility;
	const strategy = asset.activeOfferStrategy;
	const postOfferAction = asset.postOfferAction;
	const label = asset.activeOfferLabel || strategy || 'Limited offer';
	const hasOffer = Boolean(
		asset.activeOfferLabel ||
			asset.activeOfferPrice !== undefined ||
			asset.activeOfferEndsAt ||
			asset.activeOfferCtaUrl ||
			visibility ||
			strategy ||
			pruneReviewAt ||
			postOfferAction
	);

	if (!hasOffer) {
		return {
			hasOffer: false,
			state: 'none',
			label: 'No active offer',
			tone: 'neutral',
			summary:
				'No limited offer is currently mirrored onto this asset. Use one selectively for recovery tests, not as a default discount.',
			price: null,
			endsAt: null,
			pruneReviewAt: null,
			daysUntilEnd: null,
			daysUntilReview: null
		};
	}

	const normalizedVisibility = normalizeText(visibility);
	const state: TemplateOfferState =
		normalizedVisibility.includes('internal') || normalizedVisibility.includes('hidden')
			? 'internal'
			: endsAt && endsAt.getTime() < now.getTime()
				? 'expired'
				: 'live';

	const tone: TemplateHealthTone =
		state === 'expired'
			? isRecoveryOfferStrategy(strategy) || normalizeText(postOfferAction).includes('delist')
				? 'critical'
				: 'warning'
			: state === 'live'
				? 'positive'
				: 'neutral';

	let summary = 'A limited offer is available for this template.';

	if (state === 'internal') {
		summary = 'This offer is staged internally and is not intended for public marketplace surfaces yet.';
	} else if (state === 'expired') {
		summary =
			"The offer window has ended. Review buyer response before changing this template's marketplace visibility.";
	} else if (normalizeText(strategy).includes('creator-managed')) {
		summary =
			'Creator-managed pricing is being tested through an approved offer link. Watch conversion before making a lifecycle decision.';
	} else if (normalizeText(strategy).includes('recovery')) {
		summary =
			'This is a recovery offer before a marketplace visibility review. Measure whether the discount changes buyer response.';
	} else if (normalizeText(strategy).includes('exit sale')) {
		summary =
			'This is an exit-sale window before a marketplace lifecycle review. Keep buyer access and creator communication clear.';
	}

	return {
		hasOffer,
		state,
		label,
		tone,
		summary,
		price: typeof asset.activeOfferPrice === 'number' ? asset.activeOfferPrice : null,
		endsAt,
		pruneReviewAt,
		daysUntilEnd: endsAt ? daysUntil(endsAt, now) : null,
		daysUntilReview: pruneReviewAt ? daysUntil(pruneReviewAt, now) : null,
		ctaUrl: asset.activeOfferCtaUrl,
		visibility,
		strategy,
		postOfferAction
	};
}

export function computeTemplateHealth(asset: Asset, now = new Date()): TemplateHealthModel {
	const viewers = Math.max(0, asset.uniqueViewers ?? 0);
	const purchases = Math.max(0, asset.cumulativePurchases ?? 0);
	const conversionRate = viewers > 0 ? (purchases / viewers) * 100 : null;
	const publishedDate =
		parseDate(asset.publishedDate) ||
		(asset.status === 'Published' ? parseDate(asset.decisionDate) : null);
	const daysLive = publishedDate ? daysBetween(publishedDate, now) : null;
	const isPublished = isPublishedForHealth(asset);
	const hasEnoughViewers = viewers >= MIN_VIEWERS_FOR_HEALTH;
	const positiveQuality = hasPositiveQualitySignal(asset.qualityScore);
	const qualityIssue = hasNegativeQualitySignal(asset);
	const hasReviewFeedback = Boolean(asset.latestReviewFeedback || asset.rejectionFeedback);
	const offer = computeTemplateOfferLifecycle(asset, now);
	const searchVisibility = asset.searchVisibility;
	const searchVisibilitySuppressed = isTemplateSearchSuppressed(searchVisibility);
	const qualifiedSales30d =
		typeof asset.qualifiedSales30d === 'number' && Number.isFinite(asset.qualifiedSales30d)
			? Math.max(0, Math.floor(asset.qualifiedSales30d))
			: null;
	const recoveryOfferUsed = Boolean(asset.recoveryOfferUsed);
	const actions: TemplateHealthAction[] = [];

	if (qualityIssue || hasReviewFeedback) {
		addActionOnce(actions, {
			title: 'Address review feedback first',
			description:
				'Resolve the latest quality or review note before optimizing copy, imagery, or performance signals.',
			priority: 'high'
		});
	}

	if (!isPublished) {
		addActionOnce(actions, {
			title: 'Finish the publishing checklist',
			description:
				'Analytics and buyer-performance guidance become useful after this template is live in the marketplace.',
			priority: 'high'
		});
	}

	if (isPublished && viewers < MIN_VIEWERS_FOR_HEALTH) {
		addActionOnce(actions, {
			title: 'Improve listing clarity',
			description:
				'Clarify the category, style, thumbnail, and short description so buyers can quickly understand the template.',
			priority: 'medium'
		});
	}

	if (isPublished && hasEnoughViewers && purchases === 0) {
		addActionOnce(actions, {
			title: 'Tighten the buyer decision path',
			description:
				'Refresh the thumbnail, preview clarity, and value statement so viewers can decide whether this template fits.',
			priority: daysLive !== null && daysLive > WATCH_DAYS_WITHOUT_PURCHASE ? 'high' : 'medium'
		});
	}

	if (isPublished && hasEnoughViewers && conversionRate !== null && conversionRate < WATCH_CONVERSION_RATE) {
		addActionOnce(actions, {
			title: 'Rework the first impression',
			description:
				'Low conversion usually means the marketplace card or preview is not matching buyer expectations.',
			priority: 'high'
		});
	}

	if (isPublished && daysLive !== null && daysLive > WATCH_DAYS_WITHOUT_PURCHASE) {
		addActionOnce(actions, {
			title: 'Refresh stale listing assets',
			description:
				'Review the preview link, live URL, screenshots, and description so the listing still represents current Webflow quality.',
			priority: purchases === 0 ? 'high' : 'medium'
		});
	}

	let status: TemplateHealthStatus = 'limited_data';

	if (!isPublished || !hasEnoughViewers) {
		status = 'limited_data';
	} else if (
		qualityIssue ||
		(daysLive !== null && daysLive > NEEDS_ATTENTION_DAYS_WITHOUT_PURCHASE && purchases === 0) ||
		(conversionRate !== null && conversionRate < WATCH_CONVERSION_RATE)
	) {
		status = 'needs_attention';
	} else if (
		(conversionRate !== null &&
			conversionRate >= WATCH_CONVERSION_RATE &&
			conversionRate < STRONG_CONVERSION_RATE) ||
		(daysLive !== null && daysLive > WATCH_DAYS_WITHOUT_PURCHASE && purchases < MEANINGFUL_PURCHASE_COUNT)
	) {
		status = 'watch';
	} else if (
		(positiveQuality && conversionRate !== null && conversionRate >= STRONG_CONVERSION_RATE) ||
		purchases >= MEANINGFUL_PURCHASE_COUNT
	) {
		status = 'strong';
	}

	if (offer.hasOffer) {
		if (offer.state === 'expired') {
			addActionOnce(actions, {
				title: 'Complete the offer lifecycle review',
				description:
					'Compare offer-period buyer response against the baseline before returning to standard checkout, lowering visibility, or archiving the listing.',
				priority: isRecoveryOfferStrategy(offer.strategy) ? 'high' : 'medium'
			});
		} else if (isRecoveryOfferStrategy(offer.strategy)) {
			addActionOnce(actions, {
				title: 'Measure the recovery window',
				description:
					'Use the limited offer as the last buyer-response signal before a marketplace visibility review.',
				priority: offer.daysUntilReview !== null && offer.daysUntilReview <= 7 ? 'high' : 'medium'
			});
		} else {
			addActionOnce(actions, {
				title: 'Measure offer impact',
				description:
					'Track whether the offer improves viewer-to-purchase conversion before making a permanent pricing or visibility change.',
				priority: 'medium'
			});
		}
	} else if (isPublished && status === 'needs_attention') {
		addActionOnce(actions, {
			title: 'Try a limited recovery offer',
			description:
				'After fixing quality or listing issues, use a time-boxed creator-managed offer to test whether price changes buyer response before any visibility review.',
			priority: 'medium'
		});
	}

	if (recoveryOfferUsed && !offer.hasOffer && isPublished && status === 'needs_attention' && !searchVisibilitySuppressed) {
		addActionOnce(actions, {
			title: 'Move underperforming template detail-only',
			description:
				'The one-time recovery path is already used. Keep direct access, but remove this template from search unless it reaches the re-entry threshold.',
			priority: 'high'
		});
	}

	if (searchVisibilitySuppressed) {
		if (hasReachedRecoveryReentryThreshold(qualifiedSales30d) && !qualityIssue && !hasReviewFeedback) {
			if (isReentryReviewRequested(searchVisibility)) {
				addActionOnce(actions, {
					title: 'Await marketplace re-entry review',
					description:
						'This template has requested search re-entry. Keep it detail-only until marketplace review approves restoration.',
					priority: 'high'
				});
			} else {
				addActionOnce(actions, {
					title: 'Review for search re-entry',
					description:
						'This detail-only template has reached 4 qualified sales in 30 days. Confirm quality before restoring search visibility.',
					priority: 'high'
				});
			}
		} else {
			addActionOnce(actions, {
				title: 'Maintain direct-access readiness',
				description:
					'This template is out of marketplace search. Keep its detail page, fulfillment link, and buyer access accurate while it is detail-only.',
				priority: 'medium'
			});
		}
	}

	if (actions.length === 0) {
		addActionOnce(actions, {
			title: 'Keep the listing current',
			description:
				'Continue maintaining screenshots, preview links, and descriptions so buyers see an accurate template.',
			priority: 'low'
		});
	}

	const statusMeta: Record<
		TemplateHealthStatus,
		Pick<TemplateHealthModel, 'label' | 'tone' | 'summary'>
	> = {
		strong: {
			label: 'Strong',
			tone: 'positive',
			summary:
				'This template has healthy quality or performance signals. Keep it maintained so buyers continue to trust it.'
		},
		watch: {
			label: 'Watch',
			tone: 'warning',
			summary:
				'This template has some useful signal, but one or more buyer-performance indicators could be improved.'
		},
		needs_attention: {
			label: 'Needs attention',
			tone: 'critical',
			summary:
				'This template has a quality, review, or buyer-performance signal that should be addressed first.'
		},
		limited_data: {
			label: 'Limited data',
			tone: 'neutral',
			summary:
				'There is not enough buyer-performance data yet. Use the checklist below to keep the listing ready.'
		}
	};

	const automation = lifecycleAutomationSignal({
		status,
		isPublished,
		hasEnoughViewers,
		purchases,
		conversionRate,
		daysLive,
		qualityIssue,
		hasReviewFeedback,
		searchVisibility,
		searchVisibilitySuppressed,
		qualifiedSales30d,
		recoveryOfferUsed,
		offer
	});

	const signals: TemplateHealthSignal[] = [
		{
			label: 'Quality signal',
			value: asset.qualityScore || 'Not available',
			tone: qualityIssue ? 'critical' : positiveQuality ? 'positive' : 'neutral',
			description: qualityIssue
				? 'Resolve the latest quality or review note before tuning performance.'
				: positiveQuality
					? 'This is a useful trust signal for buyers.'
					: 'A verified quality signal will make guidance more precise.'
		},
		{
			label: 'Conversion',
			value: formatPercent(conversionRate),
			tone:
				conversionRate === null || !hasEnoughViewers
					? 'neutral'
					: conversionRate >= STRONG_CONVERSION_RATE
						? 'positive'
						: conversionRate >= WATCH_CONVERSION_RATE
							? 'warning'
							: 'critical',
			description:
				conversionRate === null || !hasEnoughViewers
					? 'Conversion becomes meaningful after at least 100 viewers.'
					: 'Purchases divided by unique viewers, used as a buyer-fit signal.'
		},
		{
			label: 'Purchases',
			value: purchases.toLocaleString(),
			tone: purchases >= MEANINGFUL_PURCHASE_COUNT ? 'positive' : purchases > 0 ? 'warning' : 'neutral',
			description: 'Lifetime purchases from marketplace analytics.'
		},
		{
			label: 'Time live',
			value: formatDays(daysLive),
			tone:
				daysLive !== null && purchases === 0 && daysLive > NEEDS_ATTENTION_DAYS_WITHOUT_PURCHASE
					? 'critical'
					: daysLive !== null && purchases === 0 && daysLive > WATCH_DAYS_WITHOUT_PURCHASE
						? 'warning'
						: 'neutral',
			description: 'Older listings should be refreshed periodically so they stay accurate.'
		},
		{
			label: 'Discovery',
			value: searchVisibilitySuppressed ? 'Detail only' : searchVisibility || 'Searchable',
			tone: searchVisibilitySuppressed ? 'warning' : 'positive',
			description: searchVisibilitySuppressed
				? 'This template is preserved for direct access but removed from marketplace search.'
				: 'This template is eligible for marketplace search discovery.'
		},
		{
			label: 'Re-entry signal',
			value: `${qualifiedSales30d ?? 0}/${RECOVERY_REENTRY_QUALIFIED_SALES_30D} sales`,
			tone: hasReachedRecoveryReentryThreshold(qualifiedSales30d) ? 'positive' : searchVisibilitySuppressed ? 'warning' : 'neutral',
			description: 'Detail-only templates need 4 qualified sales in 30 days before marketplace search re-entry.'
		}
	];

	return {
		status,
		...statusMeta[status],
		conversionRate,
		daysLive,
		searchVisibility,
		searchVisibilitySuppressed,
		qualifiedSales30d,
		reentrySalesThreshold: RECOVERY_REENTRY_QUALIFIED_SALES_30D,
		recoveryOfferUsed,
		automation,
		offer,
		signals,
		actions,
		hasQualityIssue: qualityIssue,
		hasReviewFeedback
	};
}
