/**
 * SLA Notifications Worker
 *
 * Counts the reviews that wait on the review team and posts the counts to a
 * Zapier webhook on weekdays at 14:00 UTC.
 *
 * The counts follow the "Pending review team action" tiles on the Airtable
 * Operational Metrics page, so reviewers see the same numbers in both places:
 * - one row per asset version
 * - review type is New Asset
 * - review status is Ready for Review, In Review, or Response to Review
 *
 * SLA states, per asset type. The day count is whole days, rounded down.
 * - days <  limit → "within SLA": no action, not reported
 * - days == limit → "on SLA": at the limit, act now
 * - days >  limit → "overdue": the dashboard calls this "Over SLA"
 *
 * Limits are set in SLA_DAYS_BY_TYPE. The dashboard uses 3 days for every
 * type; the report uses 10 days for apps. A type with no limit is not counted.
 *
 * Canon: The tool recedes; only the alert remains.
 */

import Airtable from 'airtable';

interface Env {
	AIRTABLE_API_KEY: string;
	AIRTABLE_BASE_ID: string;
	ZAPIER_SLA_WEBHOOK_URL: string;
	ENVIRONMENT: string;
}

interface TypeStats {
	label: string;
	slaDays: number;
	/** Not reported. Kept for logs and the dry run. */
	withinSla: number;
	onSla: number;
	overdue: number;
}

interface SlaPayload {
	/** Totals across all counted types. Kept for the earlier Zap format. */
	warningCount: number;
	overdueCount: number;
	byType: TypeStats[];
	timestamp: string;
}

// Airtable configuration
const VERSIONS_TABLE = 'tblHxZ2hgSFLZxsZu';
const DAYS_FIELD = '⏱️Days in Current Stage';
const STATUS_FIELD = '📝Review Status';
const REVIEW_TYPE_FIELD = '📝Review Type';
const TYPE_ID_FIELD = '⚙️🆎Asset Type Record ID';

/** Review statuses that wait on the review team. Same set as the dashboard filter. */
const OPEN_STATUSES = ['Ready for Review', 'In Review', 'Response to Review'];

/** The dashboard counts first submissions only. */
const REVIEW_TYPE = 'New Asset';

/** SLA in days per asset type. The key is the record ID in the Asset Types table. */
const SLA_DAYS_BY_TYPE: { key: string; label: string; slaDays: number }[] = [
	{ key: 'recA2YsPEHSuAHOLD', label: 'Templates', slaDays: 3 },
	{ key: 'rec8UQzOkwrwQr7bf', label: 'Apps', slaDays: 10 },
	{ key: 'recU07tAbkf8OjzXO', label: 'Libraries', slaDays: 3 }
];

function openReviewFormula(): string {
	const anyOpen = OPEN_STATUSES.map((name) => `FIND('${name}', {${STATUS_FIELD}})`).join(', ');
	return `AND({${REVIEW_TYPE_FIELD}} = '${REVIEW_TYPE}', OR(${anyOpen}))`;
}

function asText(value: unknown): string {
	if (Array.isArray(value)) return value.map(asText).join(',');
	return value === undefined || value === null ? '' : String(value);
}

/**
 * Query Airtable for pending new-asset reviews and count them against each type's SLA.
 */
async function getSlaStats(env: Env): Promise<{ byType: TypeStats[]; skipped: number }> {
	const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);

	const records = await base(VERSIONS_TABLE)
		.select({
			filterByFormula: openReviewFormula(),
			fields: [DAYS_FIELD, TYPE_ID_FIELD]
		})
		.all();

	const byType: TypeStats[] = SLA_DAYS_BY_TYPE.map(({ label, slaDays }) => ({
		label,
		slaDays,
		withinSla: 0,
		onSla: 0,
		overdue: 0
	}));
	let skipped = 0;

	for (const record of records) {
		const days = record.fields[DAYS_FIELD];
		const type = asText(record.fields[TYPE_ID_FIELD]);
		const index = SLA_DAYS_BY_TYPE.findIndex(({ key }) => type.includes(key));

		if (index === -1 || typeof days !== 'number') {
			skipped++;
			continue;
		}

		const { slaDays } = byType[index];
		if (days > slaDays) {
			byType[index].overdue++;
		} else if (days === slaDays) {
			byType[index].onSla++;
		} else {
			byType[index].withinSla++;
		}
	}

	return { byType, skipped };
}

function buildPayload(byType: TypeStats[]): SlaPayload {
	return {
		warningCount: byType.reduce((sum, t) => sum + t.onSla, 0),
		overdueCount: byType.reduce((sum, t) => sum + t.overdue, 0),
		byType,
		timestamp: new Date().toISOString()
	};
}

/**
 * Send payload to Zapier webhook
 */
async function sendToZapier(webhookUrl: string, payload: SlaPayload): Promise<boolean> {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			console.error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
			return false;
		}

		console.log('Zapier webhook succeeded');
		return true;
	} catch (error) {
		console.error('Zapier webhook error:', error);
		return false;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
	/**
	 * Scheduled handler - see wrangler.toml for the schedule
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`SLA notification check triggered at ${new Date(event.scheduledTime).toISOString()}`);

		try {
			const { byType, skipped } = await getSlaStats(env);
			const payload = buildPayload(byType);
			console.log(`SLA stats: ${JSON.stringify(byType)}, skipped ${skipped}`);

			if (payload.warningCount === 0 && payload.overdueCount === 0) {
				console.log('No review on SLA or overdue - skipping webhook notification');
				return;
			}

			if (!env.ZAPIER_SLA_WEBHOOK_URL) {
				console.error('ZAPIER_SLA_WEBHOOK_URL not configured');
				return;
			}

			let success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);
			if (!success) {
				console.log('Retrying webhook after 5 seconds...');
				await delay(5000);
				success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);
				if (!success) {
					console.error('Zapier webhook failed after retry');
				}
			}
		} catch (error) {
			console.error('SLA notification failed:', error);
			throw error;
		}
	},

	/**
	 * HTTP handler for health checks and manual testing
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const json = (body: unknown, status = 200) =>
			new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

		if (url.pathname === '/health') {
			return json({
				service: 'webflow-sla-notifications',
				status: 'healthy',
				environment: env.ENVIRONMENT
			});
		}

		// Manual trigger. Requires the secret header.
		// Add ?dry=1 to return the counts without posting to Zapier.
		if (url.pathname === '/trigger' && request.method === 'POST') {
			const secret = request.headers.get('X-SLA-Trigger-Secret');
			if (!secret || secret !== env.ZAPIER_SLA_WEBHOOK_URL?.slice(-16)) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				const { byType, skipped } = await getSlaStats(env);
				const payload = buildPayload(byType);

				if (url.searchParams.get('dry') === '1') {
					return json({ success: true, message: 'Dry run, nothing sent', ...payload, skipped });
				}

				if (payload.warningCount === 0 && payload.overdueCount === 0) {
					return json({ success: true, message: 'No review on SLA or overdue', ...payload, skipped });
				}

				const success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);
				return json(
					{ success, message: success ? 'Notification sent' : 'Webhook failed', ...payload, skipped },
					success ? 200 : 502
				);
			} catch (error) {
				console.error('Trigger error:', error);
				const message = error instanceof Error ? error.message : JSON.stringify(error);
				return json({ success: false, error: message }, 500);
			}
		}

		return new Response('Not found', { status: 404 });
	}
};
