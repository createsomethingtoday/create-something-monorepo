/**
 * Durable Object for processing large databases
 * 
 * Handles thousands of items without timeout issues.
 * State persists across requests, enabling:
 * - Progress tracking
 * - Resumable processing
 * - Long-running operations (minutes, not seconds)
 */

import { NotionClient } from '../notion/client.js';

export interface JobState {
	id: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	database_id: string;
	keep_strategy: 'oldest' | 'newest';
	access_token: string;
	
	// Progress
	pages_scanned: number;
	pages_total: number | null;  // null until first pass complete
	current_cursor: string | null;
	
	// Results
	duplicate_groups: Array<{
		title: string;
		keep_id: string;
		archive_ids: string[];
	}>;
	pages_archived: number;
	pages_failed: number;
	
	// Timing
	started_at: string | null;
	completed_at: string | null;
	error: string | null;
}

const BATCH_SIZE = 100;  // Notion API page size
const CHUNKS_PER_ALARM = 5;  // Process 500 pages per alarm cycle

export class DuplicateFinderDO implements DurableObject {
	private state: DurableObjectState;
	private job: JobState | null = null;

	constructor(state: DurableObjectState, env: unknown) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		if (request.method === 'POST' && url.pathname === '/start') {
			return this.handleStart(request);
		}
		
		if (request.method === 'GET' && url.pathname === '/status') {
			return this.handleStatus();
		}
		
		if (request.method === 'POST' && url.pathname === '/cancel') {
			return this.handleCancel();
		}
		
		return new Response('Not found', { status: 404 });
	}

	private async handleStart(request: Request): Promise<Response> {
		const body = await request.json() as {
			database_id: string;
			keep_strategy: 'oldest' | 'newest';
			access_token: string;
		};

		// Initialize job state
		this.job = {
			id: crypto.randomUUID(),
			status: 'pending',
			database_id: body.database_id,
			keep_strategy: body.keep_strategy || 'oldest',
			access_token: body.access_token,
			pages_scanned: 0,
			pages_total: null,
			current_cursor: null,
			duplicate_groups: [],
			pages_archived: 0,
			pages_failed: 0,
			started_at: new Date().toISOString(),
			completed_at: null,
			error: null
		};

		await this.state.storage.put('job', this.job);
		
		// Schedule first processing cycle
		await this.state.storage.setAlarm(Date.now() + 100);

		return Response.json({ 
			job_id: this.job.id, 
			status: 'started',
			message: 'Processing started. Poll /status for progress.'
		});
	}

	private async handleStatus(): Promise<Response> {
		const job = await this.state.storage.get<JobState>('job');
		
		if (!job) {
			return Response.json({ error: 'No job found' }, { status: 404 });
		}

		return Response.json({
			id: job.id,
			status: job.status,
			progress: {
				pages_scanned: job.pages_scanned,
				pages_total: job.pages_total,
				percentage: job.pages_total 
					? Math.round((job.pages_scanned / job.pages_total) * 100) 
					: null
			},
			results: job.status === 'completed' ? {
				duplicate_groups: job.duplicate_groups.length,
				pages_archived: job.pages_archived,
				pages_failed: job.pages_failed,
				details: job.duplicate_groups
			} : null,
			started_at: job.started_at,
			completed_at: job.completed_at,
			error: job.error
		});
	}

	private async handleCancel(): Promise<Response> {
		const job = await this.state.storage.get<JobState>('job');
		
		if (!job) {
			return Response.json({ error: 'No job found' }, { status: 404 });
		}

		job.status = 'failed';
		job.error = 'Cancelled by user';
		job.completed_at = new Date().toISOString();
		await this.state.storage.put('job', job);
		await this.state.storage.deleteAlarm();

		return Response.json({ status: 'cancelled' });
	}

	/**
	 * Alarm handler - processes pages in chunks
	 * This runs even after the HTTP request has returned
	 */
	async alarm(): Promise<void> {
		const job = await this.state.storage.get<JobState>('job');
		if (!job || job.status === 'completed' || job.status === 'failed') {
			return;
		}

		try {
			job.status = 'running';
			const client = new NotionClient({ accessToken: job.access_token });
			
			// Get accumulated pages from storage
			const allPages = await this.state.storage.get<Array<{
				id: string;
				title: string;
				created_time: string;
			}>>('pages') || [];

			// Process multiple chunks per alarm
			for (let chunk = 0; chunk < CHUNKS_PER_ALARM; chunk++) {
				const queryParams: Record<string, unknown> = { page_size: BATCH_SIZE };
				if (job.current_cursor) {
					queryParams.start_cursor = job.current_cursor;
				}

				const result = await client.queryDatabase(job.database_id, queryParams);
				
				// Extract titles from pages
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

				job.pages_scanned = allPages.length;
				job.current_cursor = result.next_cursor;

				// If no more pages, we're done scanning
				if (!result.has_more) {
					job.pages_total = allPages.length;
					break;
				}

				// Rate limit: ~3 requests per second
				await new Promise(resolve => setTimeout(resolve, 350));
			}

			// Save accumulated pages
			await this.state.storage.put('pages', allPages);

			// If scanning complete, find duplicates and archive
			if (job.pages_total !== null) {
				await this.processResults(job, client, allPages);
			} else {
				// More pages to scan - schedule next alarm
				await this.state.storage.put('job', job);
				await this.state.storage.setAlarm(Date.now() + 100);
			}

		} catch (error) {
			job.status = 'failed';
			job.error = error instanceof Error ? error.message : 'Unknown error';
			job.completed_at = new Date().toISOString();
			await this.state.storage.put('job', job);
		}
	}

	private async processResults(
		job: JobState,
		client: NotionClient,
		allPages: Array<{ id: string; title: string; created_time: string }>
	): Promise<void> {
		// Group by title using Map (O(n))
		const titleGroups = new Map<string, typeof allPages>();
		for (const page of allPages) {
			const existing = titleGroups.get(page.title) || [];
			existing.push(page);
			titleGroups.set(page.title, existing);
		}

		// Find duplicates
		const duplicateGroups: JobState['duplicate_groups'] = [];
		const pagesToArchive: string[] = [];

		for (const [title, pages] of titleGroups) {
			if (pages.length > 1) {
				// Sort by created_time
				pages.sort((a, b) => 
					new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
				);
				
				const keepIndex = job.keep_strategy === 'oldest' ? 0 : pages.length - 1;
				const keep = pages[keepIndex];
				const archive = pages.filter((_, i) => i !== keepIndex);
				
				duplicateGroups.push({
					title,
					keep_id: keep.id,
					archive_ids: archive.map(p => p.id)
				});
				pagesToArchive.push(...archive.map(p => p.id));
			}
		}

		job.duplicate_groups = duplicateGroups;

		// Archive duplicates in batches
		const batchSize = 3;
		for (let i = 0; i < pagesToArchive.length; i += batchSize) {
			const batch = pagesToArchive.slice(i, i + batchSize);
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
			
			job.pages_archived += results.filter(r => r).length;
			job.pages_failed += results.filter(r => !r).length;
			
			// Rate limit
			if (i + batchSize < pagesToArchive.length) {
				await new Promise(resolve => setTimeout(resolve, 350));
			}
		}

		// Complete
		job.status = 'completed';
		job.completed_at = new Date().toISOString();
		await this.state.storage.put('job', job);
		
		// Clean up pages from storage
		await this.state.storage.delete('pages');
	}
}
