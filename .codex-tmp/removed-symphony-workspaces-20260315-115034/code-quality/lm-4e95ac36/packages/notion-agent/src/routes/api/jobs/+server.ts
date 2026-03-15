/**
 * Async Job API - For large database operations
 * 
 * POST /api/jobs - Create a new job
 * GET /api/jobs?id=xxx - Get job status
 * 
 * Jobs are processed by the scheduler worker in the background,
 * enabling operations on databases with thousands of items.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgentById, getUserById } from '$lib/db/queries';

export interface Job {
	id: string;
	type: 'find_duplicates' | 'bulk_archive';
	status: 'pending' | 'running' | 'completed' | 'failed';
	agent_id: string;
	user_id: string;
	database_id: string;
	
	// Config
	config: {
		keep_strategy?: 'oldest' | 'newest';
		page_ids?: string[];
	};
	
	// Progress
	progress: {
		pages_scanned: number;
		pages_total: number | null;
		current_cursor: string | null;
		phase: 'scanning' | 'analyzing' | 'archiving' | 'done';
	};
	
	// Results
	results: {
		duplicate_groups: Array<{
			title: string;
			keep_id: string;
			archive_ids: string[];
		}>;
		pages_archived: number;
		pages_failed: number;
	} | null;
	
	// Timing
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	error: string | null;
}

const JOB_TTL = 60 * 60 * 24; // 24 hours

/**
 * POST - Create a new async job
 */
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	if (!platform?.env?.KV || !platform?.env?.DB) {
		throw error(500, 'Platform not configured');
	}

	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const user = await getUserById(platform.env.DB, userId);
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json() as {
		type: 'find_duplicates' | 'bulk_archive';
		agent_id: string;
		database_id: string;
		keep_strategy?: 'oldest' | 'newest';
		page_ids?: string[];
	};

	// Verify agent belongs to user
	const agent = await getAgentById(platform.env.DB, body.agent_id);
	if (!agent || agent.user_id !== user.id) {
		throw error(403, 'Agent not found or access denied');
	}

	// Create job
	const job: Job = {
		id: crypto.randomUUID(),
		type: body.type,
		status: 'pending',
		agent_id: body.agent_id,
		user_id: user.id,
		database_id: body.database_id,
		config: {
			keep_strategy: body.keep_strategy || 'oldest',
			page_ids: body.page_ids
		},
		progress: {
			pages_scanned: 0,
			pages_total: null,
			current_cursor: null,
			phase: 'scanning'
		},
		results: null,
		created_at: new Date().toISOString(),
		started_at: null,
		completed_at: null,
		error: null
	};

	// Store job in KV
	await platform.env.KV.put(
		`job:${job.id}`,
		JSON.stringify(job),
		{ expirationTtl: JOB_TTL }
	);

	// Add to pending jobs queue
	const pendingJobs = await platform.env.KV.get<string[]>('jobs:pending', 'json') || [];
	pendingJobs.push(job.id);
	await platform.env.KV.put('jobs:pending', JSON.stringify(pendingJobs));

	return json({
		job_id: job.id,
		status: 'pending',
		message: 'Job created. Processing will begin shortly.',
		poll_url: `/api/jobs?id=${job.id}`
	});
};

/**
 * GET - Get job status
 */
export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	if (!platform?.env?.KV || !platform?.env?.DB) {
		throw error(500, 'Platform not configured');
	}

	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const jobId = url.searchParams.get('id');
	if (!jobId) {
		throw error(400, 'Missing job ID');
	}

	const job = await platform.env.KV.get<Job>(`job:${jobId}`, 'json');
	if (!job) {
		throw error(404, 'Job not found');
	}

	// Verify job belongs to user
	if (job.user_id !== userId) {
		throw error(403, 'Access denied');
	}

	return json({
		id: job.id,
		type: job.type,
		status: job.status,
		progress: {
			...job.progress,
			percentage: job.progress.pages_total
				? Math.round((job.progress.pages_scanned / job.progress.pages_total) * 100)
				: null
		},
		results: job.status === 'completed' ? job.results : null,
		created_at: job.created_at,
		started_at: job.started_at,
		completed_at: job.completed_at,
		error: job.error
	});
};
