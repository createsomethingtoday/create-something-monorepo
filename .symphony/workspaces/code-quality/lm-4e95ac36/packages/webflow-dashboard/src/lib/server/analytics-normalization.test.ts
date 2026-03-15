import { describe, expect, it } from 'vitest';
import {
	buildCoverageWindows,
	estimateConfidence,
	parseDays,
	percentageLift,
	projectCount,
	safeRate,
	safeRatio
} from './analytics-normalization';

describe('parseDays', () => {
	it('uses default when missing or invalid', () => {
		expect(parseDays(null)).toBe(30);
		expect(parseDays('abc')).toBe(30);
	});

	it('clamps range to 7..365', () => {
		expect(parseDays('1')).toBe(7);
		expect(parseDays('14')).toBe(14);
		expect(parseDays('999')).toBe(365);
	});
});

describe('basic math helpers', () => {
	it('calculates percentage lift', () => {
		expect(percentageLift(120, 100)).toBe(20);
		expect(percentageLift(100, 0)).toBeNull();
	});

	it('calculates safe rates and ratios', () => {
		expect(safeRate(9, 10)).toBe(90);
		expect(safeRate(1, 0)).toBe(0);
		expect(safeRatio(11, 4)).toBe(2.75);
		expect(safeRatio(1, 0)).toBe(0);
	});

	it('projects counts only with valid observed window', () => {
		expect(projectCount(140, 14, 30)).toBe(300);
		expect(projectCount(10, 0, 30)).toBeNull();
		expect(projectCount(10, 10, 0)).toBeNull();
	});
});

describe('coverage windows', () => {
	it('returns zero coverage when first seen is missing', () => {
		const now = new Date('2026-03-04T12:00:00.000Z');
		const windows = buildCoverageWindows(14, null, now);

		expect(windows.current.observedDays).toBe(0);
		expect(windows.current.coveragePct).toBe(0);
		expect(windows.previous.observedDays).toBe(0);
		expect(windows.previous.coveragePct).toBe(0);
	});

	it('handles partial current coverage and empty previous coverage', () => {
		const now = new Date('2026-03-04T12:00:00.000Z');
		const windows = buildCoverageWindows(14, '2026-02-20T12:00:00.000Z', now);

		expect(windows.current.observedDays).toBe(12);
		expect(windows.current.coveragePct).toBe(85.7);
		expect(windows.current.isPartial).toBe(true);

		expect(windows.previous.observedDays).toBe(0);
		expect(windows.previous.coveragePct).toBe(0);
		expect(windows.previous.isPartial).toBe(true);
	});
});

describe('estimateConfidence', () => {
	it('maps coverage to confidence buckets', () => {
		expect(estimateConfidence(95, 92)).toBe('high');
		expect(estimateConfidence(95, 75)).toBe('medium');
		expect(estimateConfidence(95, 40)).toBe('low');
	});
});
