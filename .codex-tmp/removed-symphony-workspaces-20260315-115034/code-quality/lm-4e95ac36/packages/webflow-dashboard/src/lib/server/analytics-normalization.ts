const DAY_MS = 24 * 60 * 60 * 1000;

export interface CoverageWindow {
	requestedDays: number;
	observedDays: number;
	coveragePct: number;
	isPartial: boolean;
}

export function parseDays(rawDays: string | null): number {
	if (!rawDays) return 30;
	const parsed = Number.parseInt(rawDays, 10);
	if (!Number.isFinite(parsed)) return 30;
	return Math.max(7, Math.min(parsed, 365));
}

export function percentageLift(current: number, previous: number): number | null {
	if (previous <= 0) return null;
	return roundTo(((current - previous) / previous) * 100, 1);
}

export function safeRate(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return roundTo((numerator / denominator) * 100, 1);
}

export function safeRatio(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return roundTo(numerator / denominator, 2);
}

export function projectCount(
	value: number,
	observedDays: number,
	requestedDays: number
): number | null {
	if (requestedDays <= 0 || observedDays <= 0) return null;
	return Math.round((value / observedDays) * requestedDays);
}

export function buildCoverageWindows(
	requestedDays: number,
	firstSeenAtIso: string | null,
	now: Date = new Date()
): { current: CoverageWindow; previous: CoverageWindow } {
	const currentEnd = now;
	const currentStart = new Date(now.getTime() - requestedDays * DAY_MS);
	const previousEnd = currentStart;
	const previousStart = new Date(previousEnd.getTime() - requestedDays * DAY_MS);

	const firstSeenAt = parseIsoDate(firstSeenAtIso);

	return {
		current: buildCoverageWindow(currentStart, currentEnd, requestedDays, firstSeenAt),
		previous: buildCoverageWindow(previousStart, previousEnd, requestedDays, firstSeenAt)
	};
}

export function estimateConfidence(
	currentCoveragePct: number,
	previousCoveragePct: number
): 'high' | 'medium' | 'low' {
	const minCoverage = Math.min(currentCoveragePct, previousCoveragePct);
	if (minCoverage >= 90) return 'high';
	if (minCoverage >= 60) return 'medium';
	return 'low';
}

function buildCoverageWindow(
	start: Date,
	end: Date,
	requestedDays: number,
	firstSeenAt: Date | null
): CoverageWindow {
	const startMs = start.getTime();
	const endMs = end.getTime();
	const firstSeenMs = firstSeenAt?.getTime() ?? null;
	const effectiveStartMs = firstSeenMs === null ? endMs : Math.max(startMs, firstSeenMs);
	const observedMs = Math.max(0, endMs - effectiveStartMs);
	const observedDays = roundTo(observedMs / DAY_MS, 2);

	return {
		requestedDays,
		observedDays,
		coveragePct: safeRate(observedDays, requestedDays),
		isPartial: observedDays + 0.01 < requestedDays
	};
}

function parseIsoDate(isoDate: string | null): Date | null {
	if (!isoDate) return null;
	const parsed = new Date(isoDate);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function roundTo(value: number, decimals: number): number {
	const precision = 10 ** decimals;
	return Math.round(value * precision) / precision;
}
