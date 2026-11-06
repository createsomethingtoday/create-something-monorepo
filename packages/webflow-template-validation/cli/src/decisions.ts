/**
 * Pure decisions behind `wf-template-validate validate`: how an issue is
 * bucketed, which checks run, whether a result may be recorded, and the exit
 * code. Kept apart from cli.ts (which runs on import) so they can be tested.
 */

import { DEFAULT_WORKER_BASE, PUBLISHED_SITE_CHECKS, type ValidationIssue } from './worker-client.ts';

export type Bucket = 'blocker' | 'warning' | 'info';

/** Same rule as the extension: any error, or any issue with a policy tag (for example ix2-rejected), blocks. */
export function bucketOf(issue: ValidationIssue): Bucket {
	if (issue.severity === 'error' || typeof issue.details?.policy === 'string') return 'blocker';
	return issue.severity === 'warning' ? 'warning' : 'info';
}

export function howToFix(issue: ValidationIssue): string | undefined {
	const value = issue.details?.howToFix ?? issue.howToFix;
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Parse --checks. Undefined means every published-site check. Throws on unknown or empty lists. */
export function parseChecks(value: string | undefined): string[] {
	if (!value) return [...PUBLISHED_SITE_CHECKS];
	const requested = value.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
	const allowed = new Set<string>(PUBLISHED_SITE_CHECKS);
	const bad = requested.filter((c) => !allowed.has(c));
	if (bad.length > 0 || requested.length === 0) {
		const extra = bad.includes('designer')
			? ' The designer check needs Designer data; run `wf-template-validate login`, then pass --site <siteId>, or run the Template Validator app.'
			: '';
		throw new Error(`Unknown or unsupported check(s): ${bad.join(', ') || '(none)'}. Allowed: ${PUBLISHED_SITE_CHECKS.join(', ')}.${extra}`);
	}
	return [...new Set(requested)];
}

/**
 * Why a run with Designer data must not be recorded, or null when it may be.
 * Recording posts the creator's Webflow access token as evidence, so a
 * non-default worker needs --trust-worker.
 */
export function recordSkipReason(params: {
	mode: 'async' | 'legacy';
	collectionIncomplete: string[];
	workerBase: string;
	trustWorker: boolean;
}): string | null {
	const { mode, collectionIncomplete, workerBase, trustWorker } = params;
	if (mode !== 'async') return 'the /validate fallback does not run the Designer checks, so this result was not recorded';
	if (collectionIncomplete.length > 0) {
		return `the Designer data collection was incomplete, so this result was not recorded (${collectionIncomplete.join('; ')})`;
	}
	if (workerBase !== DEFAULT_WORKER_BASE && !trustWorker) {
		return `recording sends your Webflow access token to the worker; pass --trust-worker to allow it for ${workerBase}`;
	}
	return null;
}

/**
 * Reasons the run is incomplete: a declared step (the GSAP crawl, the
 * Designer checks, the Designer data collection, or the recording) did not
 * finish, so a clean result must not read as a pass.
 */
export function incompleteReasons(params: {
	gsap: { status: string; reason?: string };
	designerCollected: boolean;
	mode: 'async' | 'legacy';
	collectionIncomplete: string[];
	recordFailed: boolean;
}): string[] {
	const { gsap, designerCollected, mode, collectionIncomplete, recordFailed } = params;
	return [
		...(gsap.status !== 'complete' ? [`GSAP crawl ${gsap.status}${gsap.reason ? `: ${gsap.reason}` : ''}`] : []),
		...(designerCollected && mode !== 'async' ? ['Designer checks did not run: the worker fell back to /validate'] : []),
		...collectionIncomplete,
		...(recordFailed ? ['recording failed'] : [])
	];
}

/** 2 when the run is incomplete, 1 when every step ran and blockers were found, else 0. */
export function exitCodeFor(incomplete: string[], blockers: number): 0 | 1 | 2 {
	return incomplete.length > 0 ? 2 : blockers > 0 ? 1 : 0;
}
