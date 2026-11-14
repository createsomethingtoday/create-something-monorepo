/**
 * The "feedback is ready" email. Knock sends it; this file queues it with the
 * release and delivers it afterwards. The recipient comes from the reviewer's
 * caller, which reads it from the review record. The link is built here from
 * the pinned asset, so a caller cannot put its own link in a Webflow email.
 */

import { CommentError } from './comments';
import type { Actor } from './comments';

export type ReviewOutcome = 'changes_requested' | 'approved' | 'rejected';

export interface ReleaseNotice {
	recipientEmail: string;
	recipientName: string | null;
	assetName: string;
	assetType: string | null;
	versionNumber: number | null;
	outcome: ReviewOutcome | null;
}

export interface NotifyConfig {
	apiKey: string;
	workflowKey: string;
	dashboardUrl: string;
	fetch?: typeof fetch;
}

export type NotificationResult =
	| { status: 'sent'; sent: number }
	| { status: 'none'; reason: 'not_configured' | 'nothing_released' | 'no_recipient' | 'send_in_progress' }
	| { status: 'failed'; sent: number; pending: number; error: string };

const KNOCK_TRIGGER_URL = 'https://api.knock.app/v1/workflows';
const DEFAULT_WORKFLOW_KEY = 'marketplace-review-feedback-released';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OUTCOMES: readonly ReviewOutcome[] = ['changes_requested', 'approved', 'rejected'];
// Knock remembers an idempotency key for 24 hours. A retry inside that window
// cannot send twice; an older row is left unsent, never delivered late.
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEND_TIMEOUT_MS = 10_000;
// Longer than one send can take. A second release call inside the lease leaves the row to the first.
const CLAIM_LEASE_MS = 60_000;

/** Null unless the Knock key and an https dashboard address are both set. */
export function notifyConfig(env: {
	KNOCK_API_KEY?: string;
	KNOCK_FEEDBACK_WORKFLOW_KEY?: string;
	ASSET_DASHBOARD_URL?: string;
}): NotifyConfig | null {
	const apiKey = env.KNOCK_API_KEY?.trim();
	const dashboardUrl = env.ASSET_DASHBOARD_URL?.trim().replace(/\/+$/, '');
	if (!apiKey || !dashboardUrl || !/^https:\/\/[^\s/]+/.test(dashboardUrl)) return null;
	return { apiKey, dashboardUrl, workflowKey: env.KNOCK_FEEDBACK_WORKFLOW_KEY?.trim() || DEFAULT_WORKFLOW_KEY };
}

function optionalText(value: unknown, field: string, max: number): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== 'string' || value.length > max) throw new CommentError(400, `notify.${field} is not valid`);
	return value.trim() || null;
}

/** The `notify` part of a release request; null when the caller sent none. */
export function parseNotice(input: unknown): ReleaseNotice | null {
	const raw = (input as { notify?: unknown } | null)?.notify;
	if (raw === undefined || raw === null) return null;
	if (typeof raw !== 'object') throw new CommentError(400, 'notify must be an object');
	const notice = raw as Record<string, unknown>;

	const recipientEmail = typeof notice.recipientEmail === 'string' ? notice.recipientEmail.trim().toLowerCase() : '';
	if (recipientEmail.length > 254 || !EMAIL_PATTERN.test(recipientEmail)) {
		throw new CommentError(400, 'notify.recipientEmail is not valid');
	}
	const assetName = optionalText(notice.assetName, 'assetName', 200);
	if (!assetName) throw new CommentError(400, 'notify.assetName is required');

	const versionNumber = notice.versionNumber ?? null;
	if (versionNumber !== null && (!Number.isInteger(versionNumber) || (versionNumber as number) < 0)) {
		throw new CommentError(400, 'notify.versionNumber is not valid');
	}
	const outcome = notice.outcome ?? null;
	if (outcome !== null && !OUTCOMES.includes(outcome as ReviewOutcome)) {
		throw new CommentError(400, 'notify.outcome is not valid');
	}

	return {
		recipientEmail,
		recipientName: optionalText(notice.recipientName, 'recipientName', 120),
		assetName,
		assetType: optionalText(notice.assetType, 'assetType', 40),
		versionNumber: versionNumber as number | null,
		outcome: outcome as ReviewOutcome | null
	};
}

/**
 * Statement that queues the email, to run in the same batch as the release
 * and before it. It writes a row only when the version, inside the caller's
 * scope, still has a draft to release. The asset comes from the pin.
 */
export function queueStatement(
	db: D1Database,
	versionRef: string,
	notice: ReleaseNotice,
	actor: Actor,
	now: string,
	/** The same condition as the release it is queued with: no release, no email. */
	guard: { sql: string; params: Array<string | number | null> } = { sql: '', params: [] }
): D1PreparedStatement {
	const scoped = actor.scope ? ' AND rv.scope = ?' : '';
	return db
		.prepare(
			`INSERT INTO review_notifications (id, version_ref, asset_ref, payload, created_at)
			 SELECT ?, rv.version_ref, rv.asset_ref, ?, ?
			 FROM review_versions rv
			 WHERE rv.version_ref = ?${scoped}
			   AND EXISTS (SELECT 1 FROM review_comments c WHERE c.version_ref = rv.version_ref AND c.visibility = 'draft')${guard.sql}`
		)
		.bind(crypto.randomUUID(), JSON.stringify(notice), now, versionRef, ...(actor.scope ? [actor.scope] : []), ...guard.params);
}

interface PendingRow {
	id: string;
	asset_ref: string;
	payload: string;
}

async function trigger(config: NotifyConfig, row: PendingRow): Promise<string> {
	const notice = JSON.parse(row.payload) as ReleaseNotice;
	const response = await (config.fetch ?? fetch)(
		`${KNOCK_TRIGGER_URL}/${encodeURIComponent(config.workflowKey)}/trigger`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				'Content-Type': 'application/json',
				'Idempotency-Key': `review-feedback:${row.id}`
			},
			body: JSON.stringify({
				// The email address is the recipient id, so a send never rewrites the
				// email on a Knock user that is keyed by a Webflow user id.
				recipients: [{ id: notice.recipientEmail, email: notice.recipientEmail }],
				data: {
					creator_name: notice.recipientName,
					asset_name: notice.assetName,
					asset_type: notice.assetType,
					version_number: notice.versionNumber,
					outcome: notice.outcome,
					thread_url: `${config.dashboardUrl}/assets/${encodeURIComponent(row.asset_ref)}?tab=timeline`
				}
			}),
			signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
		}
	);
	if (!response.ok) throw new Error(`Knock returned HTTP ${response.status}`);
	const body = (await response.json().catch(() => null)) as { workflow_run_id?: string } | null;
	return body?.workflow_run_id ?? '';
}

/** Record keeping after a send. A failure here must not look like a failed send or a failed release. */
async function record(statement: D1PreparedStatement, id: string): Promise<void> {
	try {
		await statement.run();
	} catch (cause) {
		console.error(
			JSON.stringify({
				level: 'error',
				message: 'review notification record failed',
				notificationId: id,
				error: cause instanceof Error ? cause.message : String(cause)
			})
		);
	}
}

/**
 * Send every queued email for the version that is still inside the retry
 * window. Runs after the release, and again on any later release call, so a
 * failed send is retried by repeating the release. Send errors are recorded
 * and reported, never thrown: the feedback is already released.
 */
export async function deliverPending(
	db: D1Database,
	config: NotifyConfig,
	versionRef: string,
	actor: Actor,
	now: Date = new Date()
): Promise<{ sent: number; pending: number; inProgress: number; error: string | null }> {
	const nowIso = now.toISOString();
	const cutoff = new Date(now.getTime() - RETRY_WINDOW_MS).toISOString();

	// An email that could not go out inside the window is dropped, and its recipient with it.
	await db
		.prepare(
			`UPDATE review_notifications SET payload = '{}', last_error = 'expired'
			 WHERE sent_at IS NULL AND payload != '{}' AND created_at < ?`
		)
		.bind(cutoff)
		.run();

	const scoped = actor.scope
		? ' AND version_ref IN (SELECT version_ref FROM review_versions WHERE scope = ?)'
		: '';
	const { results } = await db
		.prepare(
			`SELECT id, asset_ref, payload FROM review_notifications
			 WHERE version_ref = ? AND sent_at IS NULL AND payload != '{}' AND created_at >= ?${scoped}
			 ORDER BY created_at, id`
		)
		.bind(versionRef, cutoff, ...(actor.scope ? [actor.scope] : []))
		.all<PendingRow>();

	let sent = 0;
	let pending = 0;
	let inProgress = 0;
	let error: string | null = null;
	for (const row of results) {
		// Claim the row first, so two release calls at the same moment send it once.
		const claim = await db
			.prepare(
				`UPDATE review_notifications SET attempts = attempts + 1, claimed_at = ?
				 WHERE id = ? AND sent_at IS NULL AND (claimed_at IS NULL OR claimed_at < ?)`
			)
			.bind(nowIso, row.id, new Date(now.getTime() - CLAIM_LEASE_MS).toISOString())
			.run();
		if (!claim.meta.changes) {
			inProgress += 1;
			continue;
		}

		let runId: string;
		try {
			runId = await trigger(config, row);
		} catch (cause) {
			// Status or network error only; never the recipient. The claim is dropped so a retry can run at once.
			error = cause instanceof Error ? cause.message : 'send failed';
			pending += 1;
			await record(
				db.prepare('UPDATE review_notifications SET last_error = ?, claimed_at = NULL WHERE id = ?').bind(error.slice(0, 200), row.id),
				row.id
			);
			continue;
		}
		// Knock has the message, so the recipient is no longer needed here. If this
		// write fails, a later retry repeats the send with the same key and Knock drops it.
		sent += 1;
		await record(
			db
				.prepare(`UPDATE review_notifications SET sent_at = ?, workflow_run_id = ?, payload = '{}', last_error = NULL WHERE id = ?`)
				.bind(nowIso, runId, row.id),
			row.id
		);
	}
	return { sent, pending, inProgress, error };
}
