import { describe, expect, it } from 'vitest';
import {
	bucketOf,
	exitCodeFor,
	howToFix,
	incompleteReasons,
	parseChecks,
	recordSkipReason
} from '../src/decisions.ts';
import { DEFAULT_WORKER_BASE, PUBLISHED_SITE_CHECKS } from '../src/worker-client.ts';

describe('bucketOf', () => {
	it('treats every error as a blocker', () => {
		expect(bucketOf({ id: 'a', severity: 'error', message: '' })).toBe('blocker');
	});

	it('treats a policy-tagged issue as a blocker whatever its severity', () => {
		expect(bucketOf({ id: 'ix2', severity: 'info', message: '', details: { policy: 'ix2-rejected' } })).toBe('blocker');
		expect(bucketOf({ id: 'ix2', severity: 'warning', message: '', details: { policy: 'ix2-rejected' } })).toBe('blocker');
	});

	it('keeps warnings and info apart', () => {
		expect(bucketOf({ id: 'w', severity: 'warning', message: '' })).toBe('warning');
		expect(bucketOf({ id: 'i', severity: 'info', message: '' })).toBe('info');
		expect(bucketOf({ id: 'i', severity: 'info', message: '', details: { policy: 42 } })).toBe('info');
	});
});

describe('howToFix', () => {
	it('prefers details.howToFix and trims it', () => {
		expect(howToFix({ id: 'a', severity: 'error', message: '', howToFix: 'top', details: { howToFix: '  nested  ' } })).toBe('nested');
	});

	it('falls back to the top-level field and ignores blanks', () => {
		expect(howToFix({ id: 'a', severity: 'error', message: '', howToFix: 'top' })).toBe('top');
		expect(howToFix({ id: 'a', severity: 'error', message: '', howToFix: '   ' })).toBeUndefined();
	});
});

describe('parseChecks', () => {
	it('defaults to every published-site check', () => {
		expect(parseChecks(undefined)).toEqual([...PUBLISHED_SITE_CHECKS]);
	});

	it('normalizes case, whitespace, and duplicates', () => {
		expect(parseChecks(' Content, assets ,content')).toEqual(['content', 'assets']);
	});

	it('rejects unknown and empty lists', () => {
		expect(() => parseChecks('content,seo')).toThrow(/Unknown or unsupported check\(s\): seo/);
		expect(() => parseChecks(' , ')).toThrow(/\(none\)/);
	});

	it('explains that the designer check needs a login and --site', () => {
		expect(() => parseChecks('designer')).toThrow(/needs Designer data; run `wf-template-validate login`/);
	});
});

describe('recordSkipReason', () => {
	const ok = { mode: 'async' as const, collectionIncomplete: [], workerBase: DEFAULT_WORKER_BASE, trustWorker: false };

	it('allows a complete async run on the default worker', () => {
		expect(recordSkipReason(ok)).toBeNull();
	});

	it('never records the /validate fallback, which skips the Designer checks', () => {
		expect(recordSkipReason({ ...ok, mode: 'legacy' })).toMatch(/\/validate fallback/);
	});

	it('never records an incomplete Designer data collection', () => {
		const reason = recordSkipReason({ ...ok, collectionIncomplete: ['canvas checks could not read the page element tree (x)'] });
		expect(reason).toMatch(/collection was incomplete/);
		expect(reason).toMatch(/canvas checks could not read/);
	});

	it('keeps the access token away from a custom worker unless --trust-worker is set', () => {
		const custom = 'https://worker.example.dev';
		expect(recordSkipReason({ ...ok, workerBase: custom })).toMatch(/pass --trust-worker/);
		expect(recordSkipReason({ ...ok, workerBase: custom, trustWorker: true })).toBeNull();
	});

	it('checks the fallback before the worker trust', () => {
		expect(recordSkipReason({ ...ok, mode: 'legacy', workerBase: 'https://worker.example.dev' })).toMatch(/\/validate fallback/);
	});
});

describe('incompleteReasons and exitCodeFor', () => {
	const clean = {
		gsap: { status: 'complete' },
		designerCollected: true,
		mode: 'async' as const,
		collectionIncomplete: [],
		recordFailed: false
	};

	it('is empty for a run where every step finished', () => {
		expect(incompleteReasons(clean)).toEqual([]);
	});

	it('lists every unfinished step', () => {
		expect(
			incompleteReasons({
				gsap: { status: 'unavailable', reason: 'HTTP 503' },
				designerCollected: true,
				mode: 'legacy',
				collectionIncomplete: ['style collection truncated by the MCP server (x)'],
				recordFailed: true
			})
		).toEqual([
			'GSAP crawl unavailable: HTTP 503',
			'Designer checks did not run: the worker fell back to /validate',
			'style collection truncated by the MCP server (x)',
			'recording failed'
		]);
	});

	it('does not flag the fallback when no Designer data was collected', () => {
		expect(incompleteReasons({ ...clean, designerCollected: false, mode: 'legacy' })).toEqual([]);
	});

	it('exits 2 for any incomplete step, even with blockers, then 1 for blockers, else 0', () => {
		expect(exitCodeFor(['recording failed'], 3)).toBe(2);
		expect(exitCodeFor([], 1)).toBe(1);
		expect(exitCodeFor([], 0)).toBe(0);
	});
});
