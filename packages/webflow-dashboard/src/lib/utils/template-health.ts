import type { Asset } from '$lib/server/airtable';
import { VIEWER_DATA_AVAILABLE } from '$lib/config/viewer-data';

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

export interface TemplateHealthModel {
	status: TemplateHealthStatus;
	label: string;
	tone: TemplateHealthTone;
	summary: string;
	conversionRate: number | null;
	daysLive: number | null;
	searchVisibility?: string;
	searchVisibilitySuppressed: boolean;
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

function normalizeText(value?: string | null): string {
	return String(value ?? '').toLowerCase();
}

export function isTemplateSearchSuppressed(visibility?: string | null): boolean {
	const normalized = normalizeText(visibility).trim();
	if (!normalized) return false;

	if (
		/\b(searchable|search\s*enabled|listed|marketplace\s*search)\b/.test(normalized) &&
		!normalized.includes('unlisted')
	) {
		return false;
	}

	return (
		normalized.includes('detail only') ||
		normalized.includes('detail-only') ||
		normalized.includes('unlisted') ||
		normalized.includes('hidden') ||
		normalized.includes('suppress') ||
		normalized.includes('not searchable') ||
		normalized.includes('no search') ||
		normalized.includes('remove from search')
	);
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

export function computeTemplateHealth(
	asset: Asset,
	now = new Date(),
	options?: { viewerDataAvailable?: boolean }
): TemplateHealthModel {
	// Viewer counts froze on 2026-07-21 (see $lib/config/viewer-data); while
	// unavailable, health must not judge templates on viewers or conversion.
	const viewersKnown = options?.viewerDataAvailable ?? VIEWER_DATA_AVAILABLE;
	const viewers = viewersKnown ? Math.max(0, asset.uniqueViewers ?? 0) : 0;
	const purchases = Math.max(0, asset.cumulativePurchases ?? 0);
	const conversionRate = viewersKnown && viewers > 0 ? (purchases / viewers) * 100 : null;
	const publishedDate =
		parseDate(asset.publishedDate) ||
		(asset.status === 'Published' ? parseDate(asset.decisionDate) : null);
	const daysLive = publishedDate ? daysBetween(publishedDate, now) : null;
	const isPublished = isPublishedForHealth(asset);
	const hasEnoughViewers = viewersKnown && viewers >= MIN_VIEWERS_FOR_HEALTH;
	const positiveQuality = hasPositiveQualitySignal(asset.qualityScore);
	const qualityIssue = hasNegativeQualitySignal(asset);
	const hasReviewFeedback = Boolean(asset.latestReviewFeedback || asset.rejectionFeedback);
	const searchVisibility = asset.searchVisibility;
	const searchVisibilitySuppressed = isTemplateSearchSuppressed(searchVisibility);
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

	if (isPublished && viewersKnown && viewers < MIN_VIEWERS_FOR_HEALTH) {
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

	if (!isPublished || (viewersKnown && !hasEnoughViewers)) {
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

	if (searchVisibilitySuppressed) {
		addActionOnce(actions, {
			title: 'Maintain direct-access readiness',
			description:
				'This template is out of marketplace search. Keep its detail page and buyer access accurate while it is detail-only.',
			priority: 'medium'
		});
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
			value: viewersKnown ? formatPercent(conversionRate) : 'Unavailable',
			tone:
				conversionRate === null || !hasEnoughViewers
					? 'neutral'
					: conversionRate >= STRONG_CONVERSION_RATE
						? 'positive'
						: conversionRate >= WATCH_CONVERSION_RATE
							? 'warning'
							: 'critical',
			description: !viewersKnown
				? 'Marketplace view tracking is being rebuilt; conversion returns once new view data is collected.'
				: conversionRate === null || !hasEnoughViewers
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
		}
	];

	return {
		status,
		...statusMeta[status],
		conversionRate,
		daysLive,
		searchVisibility,
		searchVisibilitySuppressed,
		signals,
		actions,
		hasQualityIssue: qualityIssue,
		hasReviewFeedback
	};
}
