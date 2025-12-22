/**
 * Arena Sync Scheduled Worker
 *
 * Runs daily at 6am UTC to trigger Are.na channel sync.
 * Cron: 0 6 * * *
 *
 * This worker simply calls the sync API endpoint on createsomething.ltd.
 * The actual sync logic lives in the Pages Function.
 */

interface Env {
	// Optional: Add API key for authenticated calls if needed
	SYNC_API_KEY?: string;
}

interface SyncResult {
	success: boolean;
	duration: number;
	channels: number;
	blocksProcessed: number;
	examplesCreated: number;
	examplesUpdated: number;
	resourcesCreated: number;
	resourcesUpdated: number;
	errors: string[];
}

export default {
	async scheduled(
		event: ScheduledEvent,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(`Arena sync triggered at ${new Date().toISOString()}`);
		console.log(`Cron pattern: ${event.cron}`);

		try {
			const response = await fetch('https://createsomething.ltd/api/arena/sync', {
				method: 'GET',
				headers: {
					'User-Agent': 'arena-sync-worker/1.0',
					...(env.SYNC_API_KEY && { 'X-Sync-Key': env.SYNC_API_KEY })
				}
			});

			if (!response.ok) {
				throw new Error(`Sync failed with status ${response.status}`);
			}

			const result: SyncResult = await response.json();

			console.log(`Sync complete:`, {
				duration: `${result.duration}ms`,
				channels: result.channels,
				blocks: result.blocksProcessed,
				examples: `${result.examplesCreated} created, ${result.examplesUpdated} updated`,
				resources: `${result.resourcesCreated} created, ${result.resourcesUpdated} updated`,
				errors: result.errors.length
			});

			if (result.errors.length > 0) {
				console.warn('Sync errors:', result.errors);
			}
		} catch (error) {
			console.error('Arena sync failed:', error);
			throw error; // Re-throw to mark the scheduled event as failed
		}
	}
};
