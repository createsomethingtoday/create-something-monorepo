/**
 * Cron Cleanup API Endpoint
 *
 * Deletes R2 images older than 24 hours.
 * Triggered by Cloudflare cron: "0 0 * * *" (daily at midnight UTC)
 *
 * Security: Requires CRON_SECRET in production (Authorization: Bearer or x-cron-secret).
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAuthorizedCronRequest } from '$lib/server/security';

interface R2Object {
	key: string;
	uploaded: Date;
	size: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const GET: RequestHandler = async ({ platform, request }) => {
	const debugLogs = platform?.env?.DEBUG_LOGS === 'true';
	const debugLog = (...args: unknown[]) => {
		if (debugLogs) {
			console.log(...args);
		}
	};

	if (
		!isAuthorizedCronRequest(
			request,
			platform?.env?.CRON_SECRET,
			platform?.env?.ENVIRONMENT
		)
	) {
		throw error(401, 'Unauthorized');
	}

	const uploads = platform?.env?.UPLOADS;
	if (!uploads) {
		console.error('[Cron Cleanup] R2 UPLOADS binding not available');
		throw error(500, 'Storage not configured');
	}

	try {
		const now = Date.now();
		const cutoffTime = now - ONE_DAY_MS;

		let deleted = 0;
		let checked = 0;
		let cursor: string | undefined;

		// Paginate through all objects
		do {
			const listed = await uploads.list({
				cursor,
				limit: 1000
			});

			for (const object of listed.objects) {
				checked++;

				// Check if object is older than 24 hours
				const uploadedTime = object.uploaded.getTime();
				if (uploadedTime < cutoffTime) {
					try {
						await uploads.delete(object.key);
						deleted++;
						debugLog(`[Cron Cleanup] Deleted: ${object.key}`);
					} catch (deleteError) {
						console.error(`[Cron Cleanup] Failed to delete ${object.key}:`, deleteError);
					}
				}
			}

			cursor = listed.truncated ? listed.cursor : undefined;
		} while (cursor);

		debugLog(`[Cron Cleanup] Completed. Checked: ${checked}, Deleted: ${deleted}`);

		return json({
			success: true,
			checked,
			deleted,
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('[Cron Cleanup] Error:', err);
		throw error(500, 'Failed to cleanup old images');
	}
};

// Also support POST for manual triggers
export const POST: RequestHandler = async (event) => {
	return GET(event);
};
