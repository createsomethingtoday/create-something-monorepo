/**
 * Funnel Dashboard
 *
 * GTM Funnel tracking: Awareness → Consideration → Decision → Conversion
 */

export * from './types';

export function generateId(prefix: string = 'fn'): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `${prefix}_${timestamp}_${random}`;
}

export function calculateEngagementRate(
	impressions: number,
	likes: number,
	comments: number,
	shares: number
): number {
	if (impressions === 0) return 0;
	return ((likes + comments + shares) / impressions) * 100;
}

export function calculateConversionRate(numerator: number, denominator: number): number {
	if (denominator === 0) return 0;
	return (numerator / denominator) * 100;
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount);
}

export function formatNumber(num: number): string {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1) + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(1) + 'K';
	}
	return num.toString();
}

export function formatPercent(rate: number): string {
	return rate.toFixed(1) + '%';
}

export function getDeltaIndicator(delta: number): string {
	if (delta > 0) return `+${delta.toFixed(1)}%`;
	if (delta < 0) return `${delta.toFixed(1)}%`;
	return '0%';
}
