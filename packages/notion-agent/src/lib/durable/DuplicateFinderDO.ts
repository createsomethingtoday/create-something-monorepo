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
	max_pages?: number;
	deadline_at?: number;
	seen_cursors?: string[];
	archive_index?: number;
	in_flight?: 'query' | 'archive';
}

const BATCH_SIZE = 100;
const MAX_STATE_BYTES = 96 * 1024; // Stay below the per-value DO storage limit.
const CHUNKS_PER_ALARM = 5;
type PageSummary = { id: string; title: string; created_time: string };
interface Env { DUPLICATE_SCAN_MAX_PAGES?: string; DUPLICATE_SCAN_MAX_DURATION_MS?: string }

function positiveInteger(value: unknown): number | null {
	const parsed = typeof value === 'string' && value.trim() ? Number(value) : NaN;
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export class DuplicateFinderDO implements DurableObject {
	private active = false;
	private controller: AbortController | null = null;

	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === 'POST' && url.pathname === '/start') return this.handleStart(request);
		if (request.method === 'GET' && url.pathname === '/status') return this.handleStatus();
		if (request.method === 'POST' && url.pathname === '/cancel') return this.handleCancel();
		return new Response('Not found', { status: 404 });
	}

	private async handleStart(request: Request): Promise<Response> {
		const maxPages = positiveInteger(this.env.DUPLICATE_SCAN_MAX_PAGES);
		const maxDuration = positiveInteger(this.env.DUPLICATE_SCAN_MAX_DURATION_MS);
		if (!maxPages || !maxDuration || !Number.isSafeInteger(Date.now() + maxDuration)) {
			return Response.json({ error: 'Configure positive finite DUPLICATE_SCAN_MAX_PAGES and DUPLICATE_SCAN_MAX_DURATION_MS before starting scans' }, { status: 503 });
		}
		const body = await request.json() as { database_id?: string; keep_strategy?: 'oldest' | 'newest'; access_token?: string };
		if (typeof body.database_id !== 'string' || !body.database_id || body.database_id.length > 128 ||
			typeof body.access_token !== 'string' || !body.access_token || body.access_token.length > 16_384 || (body.keep_strategy && !['oldest', 'newest'].includes(body.keep_strategy))) {
			return Response.json({ error: 'database_id, access_token and valid keep_strategy required' }, { status: 400 });
		}
		const job: JobState = {
			id: crypto.randomUUID(), status: 'pending', database_id: body.database_id,
			keep_strategy: body.keep_strategy || 'oldest', access_token: body.access_token,
			pages_scanned: 0, pages_total: null, current_cursor: null, duplicate_groups: [],
			pages_archived: 0, pages_failed: 0, started_at: new Date().toISOString(), completed_at: null, error: null,
			max_pages: maxPages, deadline_at: Date.now() + maxDuration, seen_cursors: [], archive_index: 0
		};
		const started = await this.state.storage.transaction(async tx => {
			const current = await tx.get<JobState>('job');
			if (current && ['pending', 'running'].includes(current.status)) return false;
			// Cancellation can finish while its external request is still settling.
			if (this.active) return false;
			await tx.delete('pages');
			await tx.put('job', job);
			await tx.setAlarm(Date.now() + 100);
			return true;
		});
		return started
			? Response.json({ job_id: job.id, status: 'started', message: 'Processing started. Poll /status for progress.' })
			: Response.json({ error: 'A job is already active' }, { status: 409 });
	}

	private async handleStatus(): Promise<Response> {
		const job = await this.state.storage.get<JobState>('job');
		if (!job) return Response.json({ error: 'No job found' }, { status: 404 });
		return Response.json({
			id: job.id, status: job.status,
			progress: { pages_scanned: job.pages_scanned, pages_total: job.pages_total,
				percentage: job.pages_total ? Math.round(job.pages_scanned / job.pages_total * 100) : null },
			results: job.status === 'completed' ? { duplicate_groups: job.duplicate_groups.length,
				pages_archived: job.pages_archived, pages_failed: job.pages_failed, details: job.duplicate_groups } : null,
			started_at: job.started_at, completed_at: job.completed_at, error: job.error
		});
	}

	private async handleCancel(): Promise<Response> {
		const found = await this.state.storage.transaction(async tx => {
			const job = await tx.get<JobState>('job');
			if (!job) return false;
			if (job.status === 'pending' || job.status === 'running') {
				job.status = 'failed'; job.error = 'Cancelled by user'; job.completed_at = new Date().toISOString();
				job.access_token = '';
				await tx.put('job', job);
			}
			await tx.deleteAlarm();
			return true;
		});
		this.controller?.abort();
		return found ? Response.json({ status: 'cancelled' }) : Response.json({ error: 'No job found' }, { status: 404 });
	}

	private assertBounds(job: JobState): void {
		if (!Number.isSafeInteger(job.max_pages) || !job.max_pages || job.max_pages < 1 ||
			!Number.isSafeInteger(job.deadline_at) || !job.deadline_at || Date.now() >= job.deadline_at) {
			throw new Error('Scan limits missing or deadline exceeded');
		}
	}

	// Compare-and-save prevents an in-flight result from reviving a cancelled/replaced job.
	private async save(job: JobState, pages?: PageSummary[], rearm = false): Promise<boolean> {
		if (new TextEncoder().encode(JSON.stringify(job)).byteLength > MAX_STATE_BYTES ||
			pages && new TextEncoder().encode(JSON.stringify(pages)).byteLength > MAX_STATE_BYTES) {
			throw new Error('Scan state exceeds storage capacity; narrow the database scope');
		}
		return this.state.storage.transaction(async tx => {
			const current = await tx.get<JobState>('job');
			if (!current || current.id !== job.id || !['pending', 'running'].includes(current.status)) return false;
			await tx.put('job', job);
			if (pages) await tx.put('pages', pages);
			if (rearm) await tx.setAlarm(Math.min(Date.now() + 350, job.deadline_at!));
			if (job.status === 'completed' || job.status === 'failed') {
				await tx.deleteAlarm();
				await tx.delete('pages');
			}
			return true;
		});
	}

	async alarm(): Promise<void> {
		if (this.active) return;
		this.active = true;
		let job: JobState | undefined;
		try {
			job = await this.state.storage.get<JobState>('job');
			if (!job || !['pending', 'running'].includes(job.status)) return;
			this.assertBounds(job);
			// A crash after a provider request has an uncertain outcome. Never replay it blindly.
			if (job.in_flight) throw new Error(`Interrupted ${job.in_flight}; reconcile provider outcome before starting a new job`);
			job.status = 'running';
			let pages = await this.state.storage.get<PageSummary[]>('pages') || [];
			for (let chunk = 0; chunk < CHUNKS_PER_ALARM; chunk++) {
				this.assertBounds(job);
				if (job.pages_total !== null) {
					const ids = job.duplicate_groups.flatMap(group => group.archive_ids);
					const index = job.archive_index || 0;
					if (index >= ids.length) {
						job.status = 'completed'; job.completed_at = new Date().toISOString(); job.access_token = '';
						await this.save(job);
						return;
					}
					job.in_flight = 'archive';
					if (!await this.save(job)) return;
					await this.provider(job, client => client.archivePage(ids[index]));
					this.assertBounds(job);
					job.pages_archived++; job.archive_index = index + 1;
				} else {
					if (pages.length >= job.max_pages!) throw new Error('Scan page limit exceeded');
					job.in_flight = 'query';
					if (!await this.save(job)) return;
					const result = await this.provider(job, client => client.queryDatabase(job!.database_id, {
						page_size: Math.min(BATCH_SIZE, job!.max_pages! - pages.length),
						...(job!.current_cursor ? { start_cursor: job!.current_cursor } : {})
					}));
					delete job.in_flight;
					this.assertBounds(job);
					const seen = new Set(job.seen_cursors || []);
					if (result.has_more && (typeof result.next_cursor !== 'string' || !result.next_cursor.trim() ||
						result.next_cursor === job.current_cursor || seen.has(result.next_cursor))) {
						throw new Error('Pagination failed to advance: missing or repeated cursor');
					}
					const existingIds = new Set(pages.map(page => page.id));
					const added = result.results.filter(page => {
						if (existingIds.has(page.id)) return false;
						existingIds.add(page.id); return true;
					}).map(page => {
						const title = Object.values(page.properties).find(prop => prop.type === 'title')?.title as Array<{ plain_text: string }> | undefined;
						return { id: page.id, title: (title?.map(part => part.plain_text).join('') || '').toLowerCase().trim(), created_time: page.created_time };
					});
					if (result.has_more && !added.length) throw new Error('Pagination made no page progress');
					pages = [...pages, ...added];
					if (pages.length > job.max_pages!) throw new Error('Scan page limit exceeded');
					if (result.has_more) seen.add(result.next_cursor!);
					job.seen_cursors = [...seen]; job.current_cursor = result.next_cursor; job.pages_scanned = pages.length;
					if (!result.has_more) {
						job.pages_total = pages.length;
						job.duplicate_groups = this.groupDuplicates(pages, job.keep_strategy);
					}
				}
				delete job.in_flight;
				// Every completed call is checkpointed before another request can be issued.
				if (!await this.save(job, pages, true)) return;
				if (chunk + 1 < CHUNKS_PER_ALARM) await new Promise(resolve => setTimeout(resolve, 350));
			}
		} catch (error) {
			if (job) {
				job.status = 'failed';
				// Do not persist provider error bodies, which may contain sensitive content.
				job.error = job.in_flight ? `Stopped during ${job.in_flight}; reconcile provider outcome before retrying` :
					(error instanceof Error ? error.message : 'Scan failed');
				job.completed_at = new Date().toISOString(); job.access_token = '';
				job.duplicate_groups = []; job.seen_cursors = [];
				await this.save(job);
			}
		} finally { this.active = false; this.controller = null; }
	}

	private async provider<T>(job: JobState, call: (client: NotionClient) => Promise<T>): Promise<T> {
		this.controller = new AbortController();
		const controller = this.controller;
		// Per-call timeout is an engineering timeout, always bounded by the job deadline.
		const timer = setTimeout(() => controller.abort(), Math.min(30_000, job.deadline_at! - Date.now()));
		try {
			const current = await this.state.storage.get<JobState>('job');
			if (controller.signal.aborted || !current || current.id !== job.id || !['pending', 'running'].includes(current.status)) {
				throw new Error('Job no longer active');
			}
			return await call(new NotionClient({ accessToken: job.access_token, signal: controller.signal }));
		}
		finally { clearTimeout(timer); this.controller = null; }
	}

	private groupDuplicates(pages: PageSummary[], strategy: 'oldest' | 'newest'): JobState['duplicate_groups'] {
		const groups = new Map<string, PageSummary[]>();
		for (const page of pages) {
			const group = groups.get(page.title);
			if (group) group.push(page);
			else groups.set(page.title, [page]);
		}
		return [...groups.entries()].filter(([, values]) => values.length > 1).map(([title, values]) => {
			values.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
			const keep = strategy === 'oldest' ? values[0] : values[values.length - 1];
			return { title, keep_id: keep.id, archive_ids: values.filter(page => page.id !== keep.id).map(page => page.id) };
		});
	}
}
