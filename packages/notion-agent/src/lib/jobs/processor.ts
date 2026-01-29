/**
 * Job Processor - Handles large database operations
 * 
 * Processes jobs from the KV queue in chunks, enabling
 * operations on databases with thousands of items without
 * hitting timeout limits.
 * 
 * Called by the scheduler worker on a cron schedule.
 */

import { NotionClient } from '../notion/client.js';
import { decryptToken } from '../auth/crypto.js';

export interface Job {
	id: string;
	type: 'find_duplicates' | 'bulk_archive';
	status: 'pending' | 'running' | 'completed' | 'failed';
	agent_id: string;
	user_id: string;
	database_id: string;
	config: {
		keep_strategy?: 'oldest' | 'newest';
		page_ids?: string[];
	};
	progress: {
		pages_scanned: number;
		pages_total: number | null;
		current_cursor: string | null;
		phase: 'scanning' | 'analyzing' | 'archiving' | 'done';
	};
	results: {
		duplicate_groups: Array<{
			title: string;
			keep_id: string;
			archive_ids: string[];
		}>;
		pages_archived: number;
		pages_failed: number;
	} | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	error: string | null;
}

interface PageData {
	id: string;
	title: string;
	created_time: string;
}

const BATCH_SIZE = 100;
const CHUNKS_PER_RUN = 10;  // Process 1000 pages per worker invocation
const ARCHIVE_BATCH_SIZE = 5;

/**
 * Process pending jobs from the queue
 */
export async function processJobs(
	kv: KVNamespace,
	db: D1Database,
	encryptionKey: string
): Promise<{ processed: number; completed: number; failed: number }> {
	const stats = { processed: 0, completed: 0, failed: 0 };

	// Get pending jobs
	const pendingJobIds = await kv.get<string[]>('jobs:pending', 'json') || [];
	if (pendingJobIds.length === 0) {
		return stats;
	}

	// Process each pending job
	for (const jobId of pendingJobIds.slice(0, 3)) {  // Max 3 jobs per run
		try {
			const job = await kv.get<Job>(`job:${jobId}`, 'json');
			if (!job) {
				// Job expired or deleted, remove from queue
				await removeFromQueue(kv, jobId);
				continue;
			}

			// Get user's access token
			const userResult = await db.prepare(
				'SELECT notion_access_token FROM users WHERE id = ?'
			).bind(job.user_id).first<{ notion_access_token: string }>();

			if (!userResult) {
				job.status = 'failed';
				job.error = 'User not found';
				job.completed_at = new Date().toISOString();
				await kv.put(`job:${jobId}`, JSON.stringify(job));
				await removeFromQueue(kv, jobId);
				stats.failed++;
				continue;
			}

			const accessToken = await decryptToken(userResult.notion_access_token, encryptionKey);
			const client = new NotionClient({ accessToken });

			// Process based on job type
			if (job.type === 'find_duplicates') {
				await processFindDuplicatesJob(job, client, kv);
			} else if (job.type === 'bulk_archive') {
				await processBulkArchiveJob(job, client, kv);
			}

			stats.processed++;
			if (job.status === 'completed') {
				await removeFromQueue(kv, jobId);
				stats.completed++;
			} else if (job.status === 'failed') {
				await removeFromQueue(kv, jobId);
				stats.failed++;
			}
			// If still running, leave in queue for next invocation

		} catch (error) {
			console.error(`Error processing job ${jobId}:`, error);
			stats.failed++;
		}
	}

	return stats;
}

/**
 * Process find_duplicates job - scans database in chunks
 */
async function processFindDuplicatesJob(
	job: Job,
	client: NotionClient,
	kv: KVNamespace
): Promise<void> {
	job.status = 'running';
	if (!job.started_at) {
		job.started_at = new Date().toISOString();
	}

	try {
		// Get accumulated pages from KV
		let allPages = await kv.get<PageData[]>(`job:${job.id}:pages`, 'json') || [];

		// Phase 1: Scanning
		if (job.progress.phase === 'scanning') {
			for (let chunk = 0; chunk < CHUNKS_PER_RUN; chunk++) {
				const queryParams: Record<string, unknown> = { page_size: BATCH_SIZE };
				if (job.progress.current_cursor) {
					queryParams.start_cursor = job.progress.current_cursor;
				}

				const result = await client.queryDatabase(job.database_id, queryParams);

				// Extract titles
				for (const page of result.results) {
					let title = '';
					for (const propValue of Object.values(page.properties)) {
						if (propValue.type === 'title') {
							const titleArray = (propValue as { title?: Array<{ plain_text: string }> }).title;
							title = titleArray?.map(t => t.plain_text).join('') || '';
							break;
						}
					}
					allPages.push({
						id: page.id,
						title: title.toLowerCase().trim(),
						created_time: page.created_time
					});
				}

				job.progress.pages_scanned = allPages.length;
				job.progress.current_cursor = result.next_cursor;

				if (!result.has_more) {
					job.progress.pages_total = allPages.length;
					job.progress.phase = 'analyzing';
					break;
				}

				// Rate limit
				await sleep(350);
			}

			// Save progress
			await kv.put(`job:${job.id}:pages`, JSON.stringify(allPages), { expirationTtl: 3600 });
			await kv.put(`job:${job.id}`, JSON.stringify(job));

			// If still scanning, return (will continue on next worker run)
			if (job.progress.phase === 'scanning') {
				return;
			}
		}

		// Phase 2: Analyzing
		if (job.progress.phase === 'analyzing') {
			// Group by title (O(n))
			const titleGroups = new Map<string, PageData[]>();
			for (const page of allPages) {
				const existing = titleGroups.get(page.title) || [];
				existing.push(page);
				titleGroups.set(page.title, existing);
			}

			// Find duplicates
			const duplicateGroups: Job['results'] = {
				duplicate_groups: [],
				pages_archived: 0,
				pages_failed: 0
			};

			for (const [title, pages] of titleGroups) {
				if (pages.length > 1) {
					pages.sort((a, b) => 
						new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
					);

					const keepStrategy = job.config.keep_strategy || 'oldest';
					const keepIndex = keepStrategy === 'oldest' ? 0 : pages.length - 1;
					const keep = pages[keepIndex];
					const archive = pages.filter((_, i) => i !== keepIndex);

					duplicateGroups.duplicate_groups.push({
						title,
						keep_id: keep.id,
						archive_ids: archive.map(p => p.id)
					});
				}
			}

			job.results = duplicateGroups;
			job.progress.phase = 'archiving';
			await kv.put(`job:${job.id}`, JSON.stringify(job));
		}

		// Phase 3: Archiving
		if (job.progress.phase === 'archiving' && job.results) {
			const allArchiveIds = job.results.duplicate_groups.flatMap(g => g.archive_ids);
			const alreadyArchived = job.results.pages_archived + job.results.pages_failed;
			const remaining = allArchiveIds.slice(alreadyArchived);

			// Archive in batches
			const toArchive = remaining.slice(0, ARCHIVE_BATCH_SIZE * CHUNKS_PER_RUN);
			
			for (let i = 0; i < toArchive.length; i += ARCHIVE_BATCH_SIZE) {
				const batch = toArchive.slice(i, i + ARCHIVE_BATCH_SIZE);
				const results = await Promise.all(
					batch.map(async (id) => {
						try {
							await client.archivePage(id);
							return true;
						} catch {
							return false;
						}
					})
				);

				job.results.pages_archived += results.filter(r => r).length;
				job.results.pages_failed += results.filter(r => !r).length;

				await sleep(350);
			}

			// Check if done
			const totalProcessed = job.results.pages_archived + job.results.pages_failed;
			if (totalProcessed >= allArchiveIds.length) {
				job.progress.phase = 'done';
				job.status = 'completed';
				job.completed_at = new Date().toISOString();
				
				// Clean up temp data
				await kv.delete(`job:${job.id}:pages`);
			}

			await kv.put(`job:${job.id}`, JSON.stringify(job));
		}

	} catch (error) {
		job.status = 'failed';
		job.error = error instanceof Error ? error.message : 'Unknown error';
		job.completed_at = new Date().toISOString();
		await kv.put(`job:${job.id}`, JSON.stringify(job));
	}
}

/**
 * Process bulk_archive job
 */
async function processBulkArchiveJob(
	job: Job,
	client: NotionClient,
	kv: KVNamespace
): Promise<void> {
	job.status = 'running';
	if (!job.started_at) {
		job.started_at = new Date().toISOString();
	}

	try {
		const pageIds = job.config.page_ids || [];
		if (pageIds.length === 0) {
			job.status = 'completed';
			job.results = { duplicate_groups: [], pages_archived: 0, pages_failed: 0 };
			job.completed_at = new Date().toISOString();
			await kv.put(`job:${job.id}`, JSON.stringify(job));
			return;
		}

		if (!job.results) {
			job.results = { duplicate_groups: [], pages_archived: 0, pages_failed: 0 };
		}

		const alreadyProcessed = job.results.pages_archived + job.results.pages_failed;
		const remaining = pageIds.slice(alreadyProcessed);
		const toProcess = remaining.slice(0, ARCHIVE_BATCH_SIZE * CHUNKS_PER_RUN);

		for (let i = 0; i < toProcess.length; i += ARCHIVE_BATCH_SIZE) {
			const batch = toProcess.slice(i, i + ARCHIVE_BATCH_SIZE);
			const results = await Promise.all(
				batch.map(async (id) => {
					try {
						await client.archivePage(id);
						return true;
					} catch {
						return false;
					}
				})
			);

			job.results.pages_archived += results.filter(r => r).length;
			job.results.pages_failed += results.filter(r => !r).length;
			job.progress.pages_scanned = job.results.pages_archived + job.results.pages_failed;

			await sleep(350);
		}

		// Check if done
		const totalProcessed = job.results.pages_archived + job.results.pages_failed;
		if (totalProcessed >= pageIds.length) {
			job.status = 'completed';
			job.completed_at = new Date().toISOString();
		}

		await kv.put(`job:${job.id}`, JSON.stringify(job));

	} catch (error) {
		job.status = 'failed';
		job.error = error instanceof Error ? error.message : 'Unknown error';
		job.completed_at = new Date().toISOString();
		await kv.put(`job:${job.id}`, JSON.stringify(job));
	}
}

async function removeFromQueue(kv: KVNamespace, jobId: string): Promise<void> {
	const pendingJobs = await kv.get<string[]>('jobs:pending', 'json') || [];
	const updated = pendingJobs.filter(id => id !== jobId);
	await kv.put('jobs:pending', JSON.stringify(updated));
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
