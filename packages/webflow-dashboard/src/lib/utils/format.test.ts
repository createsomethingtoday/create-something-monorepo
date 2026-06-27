import { describe, expect, it } from 'vitest';
import {
	formatDateTime,
	formatLongDate,
	formatRelativeAge,
	formatRelativeFutureDate,
	formatRelativePastDate,
	formatRelativeScheduleDate,
	formatShortDate
} from './format';

describe('format utilities', () => {
	const now = new Date('2026-06-27T12:00:00.000Z');

	it('formats recent past dates as relative labels', () => {
		expect(formatRelativePastDate('2026-06-27T18:00:00.000Z', now)).toBe('today');
		expect(formatRelativePastDate('2026-06-26T18:00:00.000Z', now)).toBe('yesterday');
		expect(formatRelativePastDate('2026-06-24T18:00:00.000Z', now)).toBe('3 days ago');
	});

	it('formats older past dates with the long date format', () => {
		expect(formatRelativePastDate('2026-06-10T18:00:00.000Z', now)).toBe('Jun 10, 2026');
	});

	it('formats upcoming dates as relative labels', () => {
		expect(formatRelativeFutureDate('2026-06-27T18:00:00.000Z', now)).toBe('today');
		expect(formatRelativeFutureDate('2026-06-28T18:00:00.000Z', now)).toBe('tomorrow');
		expect(formatRelativeFutureDate('2026-06-30T18:00:00.000Z', now)).toBe('in 3 days');
	});

	it('formats later upcoming dates with the short date format', () => {
		expect(formatRelativeFutureDate('2026-07-10T18:00:00.000Z', now)).toBe('Jul 10');
	});

	it('formats date and time labels for version metadata', () => {
		expect(formatDateTime(new Date(2026, 5, 27, 9, 5))).toBe('Jun 27, 2026, 09:05 AM');
	});

	it('formats relative age labels for timeline milestones', () => {
		expect(formatRelativeAge('2026-06-27T11:00:00.000Z', now)).toBe('Today');
		expect(formatRelativeAge('2026-06-26T11:00:00.000Z', now)).toBe('Yesterday');
		expect(formatRelativeAge('2026-06-21T11:00:00.000Z', now)).toBe('6 days ago');
		expect(formatRelativeAge('2026-06-10T11:00:00.000Z', now)).toBe('2 weeks ago');
		expect(formatRelativeAge('2026-04-10T11:00:00.000Z', now)).toBe('2 months ago');
		expect(formatRelativeAge('2025-04-10T11:00:00.000Z', now)).toBe('1 years ago');
	});

	it('formats relative schedule labels for freshness messaging', () => {
		expect(formatRelativeScheduleDate('2026-06-27T11:00:00.000Z', now)).toBe('Today');
		expect(formatRelativeScheduleDate('2026-06-27T13:00:00.000Z', now)).toBe('in 1 hour');
		expect(formatRelativeScheduleDate('2026-06-27T15:00:00.000Z', now)).toBe('in 3 hours');
		expect(formatRelativeScheduleDate('2026-06-28T12:00:00.000Z', now)).toBe('Tomorrow');
		expect(formatRelativeScheduleDate('2026-06-26T12:00:00.000Z', now)).toBe('Yesterday');
		expect(formatRelativeScheduleDate('2026-06-24T12:00:00.000Z', now)).toBe('3 days ago');
		expect(formatRelativeScheduleDate('2026-06-30T12:00:00.000Z', now)).toBe('in 3 days');
	});

	it('returns fallbacks for missing or invalid dates', () => {
		expect(formatShortDate('not-a-date')).toBe('—');
		expect(formatLongDate('not-a-date')).toBe('');
		expect(formatDateTime('not-a-date')).toBe('');
		expect(formatRelativeAge('not-a-date', now)).toBe('');
		expect(formatRelativePastDate('not-a-date', now)).toBe('');
		expect(formatRelativeFutureDate(undefined, now)).toBe('');
		expect(formatRelativeScheduleDate(null, now)).toBe('');
	});
});
