/**
 * SLA Notifications Worker
 *
 * Queries Airtable "All Assets SLA Over" view daily at 9am UTC.
 * Posts minimal counts to Zapier webhook.
 *
 * SLA Logic:
 * - 3 days exactly → "warning" (approaching SLA)
 * - >3 days → "overdue" (over SLA)
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

interface SlaPayload {
	warningCount: number;
	overdueCount: number;
	timestamp: string;
}

// Airtable configuration
const ASSETS_TABLE = 'tblRwzpWoLgE9MrUm';
const SLA_VIEW_ID = 'viwPPsq6O9tKDg9oZ';
// Correct field name from Airtable
const DAYS_FIELD = '⏱️Days in Current Review Stage';

/**
 * Find the "Days in Current..." field dynamically
 * The field name may vary, so we search for fields containing "Days"
 */
function findDaysField(fields: Record<string, unknown>): number | undefined {
	for (const [key, value] of Object.entries(fields)) {
		if (key.toLowerCase().includes('days') && typeof value === 'number') {
			return value;
		}
	}
	return undefined;
}

/**
 * Query Airtable for assets over SLA and categorize them
 * Uses filterByFormula since the SLA view is locked
 */
async function getSlaStats(env: Env): Promise<{ warning: number; overdue: number; debug?: string[] }> {
	const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);

	// Query the SLA view for assets over SLA
	const records = await base(ASSETS_TABLE)
		.select({
			view: SLA_VIEW_ID,
			fields: ['Name', DAYS_FIELD]
		})
		.all();

	let warning = 0;
	let overdue = 0;
	const debug: string[] = [];

	// Log first record's fields for debugging
	if (records.length > 0) {
		const firstFields = Object.keys(records[0].fields);
		debug.push(`Fields found: ${firstFields.join(', ')}`);
	}

	for (const record of records) {
		// Skip "Base." template items - these are internal templates, not real assets
		const name = record.fields['Name'] as string | undefined;
		if (name?.startsWith('Base.')) {
			continue;
		}

		// Use the specific field, fallback to dynamic search
		const days = (record.fields[DAYS_FIELD] as number | undefined) ?? findDaysField(record.fields as Record<string, unknown>);

		if (days === undefined || days === null) {
			continue;
		}

		if (days === 3) {
			warning++;
		} else if (days > 3) {
			overdue++;
		}
	}

	return { warning, overdue, debug };
}

/**
 * Send notification payload to Zapier webhook
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

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
	/**
	 * Scheduled handler - runs daily at 9am UTC
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`SLA notification check triggered at ${new Date(event.scheduledTime).toISOString()}`);

		try {
			// Query Airtable for SLA stats
			const { warning, overdue } = await getSlaStats(env);

			console.log(`SLA stats: ${warning} warning, ${overdue} overdue`);

			// Skip webhook if no assets need attention
			if (warning === 0 && overdue === 0) {
				console.log('No assets over SLA - skipping webhook notification');
				return;
			}

			const payload: SlaPayload = {
				warningCount: warning,
				overdueCount: overdue,
				timestamp: new Date().toISOString()
			};

			// Validate webhook URL
			if (!env.ZAPIER_SLA_WEBHOOK_URL) {
				console.error('ZAPIER_SLA_WEBHOOK_URL not configured');
				return;
			}

			// Send to Zapier with retry
			let success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);

			if (!success) {
				// Retry once after 5 seconds
				console.log('Retrying webhook after 5 seconds...');
				await delay(5000);
				success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);

				if (!success) {
					console.error('Zapier webhook failed after retry');
					// Future enhancement: store in KV for manual retry
				}
			}
		} catch (error) {
			console.error('SLA notification failed:', error);
			throw error; // Let Cloudflare log the failure
		}
	},

	/**
	 * HTTP handler for health checks and manual testing
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(
				JSON.stringify({
					service: 'webflow-sla-notifications',
					status: 'healthy',
					environment: env.ENVIRONMENT
				}),
				{
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Manual trigger endpoint (for testing)
		if (url.pathname === '/trigger' && request.method === 'POST') {
			// Verify secret header
			const secret = request.headers.get('X-SLA-Trigger-Secret');
			if (!secret || secret !== env.ZAPIER_SLA_WEBHOOK_URL?.slice(-16)) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				const { warning, overdue, debug } = await getSlaStats(env);

				if (warning === 0 && overdue === 0) {
					return new Response(
						JSON.stringify({
							success: true,
							message: 'No assets over SLA',
							warningCount: 0,
							overdueCount: 0,
							debug
						}),
						{ headers: { 'Content-Type': 'application/json' } }
					);
				}

				const payload: SlaPayload = {
					warningCount: warning,
					overdueCount: overdue,
					timestamp: new Date().toISOString()
				};

				const success = await sendToZapier(env.ZAPIER_SLA_WEBHOOK_URL, payload);

				return new Response(
					JSON.stringify({
						success,
						message: success ? 'Notification sent' : 'Webhook failed',
						...payload,
						debug
					}),
					{
						status: success ? 200 : 502,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			} catch (error: unknown) {
				console.error('Trigger error:', error);
				let errorMessage = 'Unknown error';
				let errorStack: string | undefined;

				if (error instanceof Error) {
					errorMessage = error.message;
					errorStack = error.stack;
				} else if (typeof error === 'object' && error !== null) {
					errorMessage = JSON.stringify(error);
				} else if (typeof error === 'string') {
					errorMessage = error;
				}

				return new Response(
					JSON.stringify({
						success: false,
						error: errorMessage,
						stack: errorStack,
						errorType: typeof error
					}),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
		}

		return new Response('Not found', { status: 404 });
	}
};
