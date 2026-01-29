/**
 * Notion Agent Scheduler Worker
 * 
 * Cron-triggered worker that executes scheduled agents.
 * Runs every 5 minutes to check for agents with due schedules.
 */

interface Env {
	DB: D1Database;
	KV: KVNamespace;
	AI: Ai;
	ENCRYPTION_KEY: string;
	ENVIRONMENT: string;
}

interface Agent {
	id: string;
	user_id: string;
	name: string;
	user_message: string;
	databases: string;
	schedule: string;
	enabled: number;
}

interface User {
	id: string;
	notion_access_token: string;
}

/**
 * Parse cron expression and check if it should run now.
 * Supports basic cron: minute hour day-of-month month day-of-week
 */
function shouldRunNow(cronExpression: string): boolean {
	const now = new Date();
	const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

	const matches = (pattern: string, value: number): boolean => {
		if (pattern === '*') return true;
		if (pattern.includes('/')) {
			const [, interval] = pattern.split('/');
			return value % parseInt(interval) === 0;
		}
		if (pattern.includes(',')) {
			return pattern.split(',').map(Number).includes(value);
		}
		return parseInt(pattern) === value;
	};

	return (
		matches(minute, now.getUTCMinutes()) &&
		matches(hour, now.getUTCHours()) &&
		matches(dayOfMonth, now.getUTCDate()) &&
		matches(month, now.getUTCMonth() + 1) &&
		matches(dayOfWeek, now.getUTCDay())
	);
}

/**
 * Decrypt token (must match oauth.ts implementation)
 */
function decryptToken(encrypted: string, key: string): string {
	const keyBytes = new TextEncoder().encode(key);
	const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
	const decrypted = new Uint8Array(encryptedBytes.length);

	for (let i = 0; i < encryptedBytes.length; i++) {
		decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
	}

	return new TextDecoder().decode(decrypted);
}

/**
 * Execute a single agent (simplified version for the worker)
 */
async function executeScheduledAgent(
	env: Env,
	agent: Agent,
	user: User
): Promise<{ success: boolean; error?: string }> {
	const executionId = crypto.randomUUID();
	const startedAt = new Date().toISOString();

	// Create execution record
	await env.DB.prepare(`
		INSERT INTO executions (id, agent_id, trigger_type, status, input, output, error, tokens_used, started_at, completed_at)
		VALUES (?, ?, 'scheduled', 'running', NULL, NULL, NULL, NULL, ?, NULL)
	`).bind(executionId, agent.id, startedAt).run();

	try {
		const accessToken = decryptToken(user.notion_access_token, env.ENCRYPTION_KEY);
		const allowedDatabases = JSON.parse(agent.databases || '[]');

		// Build system prompt
		const systemPrompt = `You are a Notion automation agent. Execute the following task for the user.

AUTHORIZED DATABASES: ${allowedDatabases.join(', ') || 'None'}

Only access the databases listed above. Summarize what you accomplished.`;

		// Call Workers AI
		const response = await env.AI.run('@cf/qwen/qwen2.5-coder-32b-instruct', {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: agent.user_message }
			],
			max_tokens: 1024
		}) as { response?: string };

		const output = response.response || 'Agent completed without response';

		// Update execution as completed
		await env.DB.prepare(`
			UPDATE executions 
			SET status = 'completed', output = ?, completed_at = ?
			WHERE id = ?
		`).bind(JSON.stringify({ response: output }), new Date().toISOString(), executionId).run();

		// Log audit
		await env.DB.prepare(`
			INSERT INTO audit_logs (id, user_id, agent_id, action, details, ip_address, created_at)
			VALUES (?, ?, ?, 'agent_execute', ?, NULL, ?)
		`).bind(
			crypto.randomUUID(),
			user.id,
			agent.id,
			JSON.stringify({ trigger: 'scheduled', execution_id: executionId }),
			new Date().toISOString()
		).run();

		return { success: true };

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		// Update execution as failed
		await env.DB.prepare(`
			UPDATE executions 
			SET status = 'failed', error = ?, completed_at = ?
			WHERE id = ?
		`).bind(errorMessage, new Date().toISOString(), executionId).run();

		return { success: false, error: errorMessage };
	}
}

/**
 * Process pending async jobs (for large databases)
 */
async function processPendingJobs(env: Env): Promise<void> {
	const pendingJobIds = await env.KV.get<string[]>('jobs:pending', { type: 'json' }) || [];
	
	if (pendingJobIds.length === 0) {
		return;
	}
	
	console.log(`[Jobs] Processing ${pendingJobIds.length} pending jobs`);
	
	for (const jobId of pendingJobIds.slice(0, 3)) {  // Max 3 jobs per run
		const job = await env.KV.get<Job>(`job:${jobId}`, { type: 'json' });
		if (!job) {
			// Job expired, remove from queue
			const updated = pendingJobIds.filter(id => id !== jobId);
			await env.KV.put('jobs:pending', JSON.stringify(updated));
			continue;
		}
		
		console.log(`[Jobs] Processing job ${jobId}: ${job.type}`);
		
		try {
			// Get user's access token
			const userResult = await env.DB.prepare(
				'SELECT notion_access_token FROM users WHERE id = ?'
			).bind(job.user_id).first<{ notion_access_token: string }>();
			
			if (!userResult) {
				job.status = 'failed';
				job.error = 'User not found';
				job.completed_at = new Date().toISOString();
				await env.KV.put(`job:${jobId}`, JSON.stringify(job));
				continue;
			}
			
			const accessToken = decryptToken(userResult.notion_access_token, env.ENCRYPTION_KEY);
			
			// Process based on job type
			if (job.type === 'find_duplicates') {
				await processFindDuplicatesJob(job, accessToken, env);
			}
			
			// If completed/failed, remove from queue
			if (job.status === 'completed' || job.status === 'failed') {
				const updated = (await env.KV.get<string[]>('jobs:pending', { type: 'json' }) || [])
					.filter(id => id !== jobId);
				await env.KV.put('jobs:pending', JSON.stringify(updated));
			}
			
		} catch (error) {
			console.error(`[Jobs] Error processing job ${jobId}:`, error);
			job.status = 'failed';
			job.error = error instanceof Error ? error.message : 'Unknown error';
			job.completed_at = new Date().toISOString();
			await env.KV.put(`job:${jobId}`, JSON.stringify(job));
		}
	}
}

interface Job {
	id: string;
	type: 'find_duplicates' | 'bulk_archive';
	status: 'pending' | 'running' | 'completed' | 'failed';
	agent_id: string;
	user_id: string;
	database_id: string;
	config: { keep_strategy?: 'oldest' | 'newest' };
	progress: {
		pages_scanned: number;
		pages_total: number | null;
		current_cursor: string | null;
		phase: 'scanning' | 'analyzing' | 'archiving' | 'done';
	};
	results: {
		duplicate_groups: Array<{ title: string; keep_id: string; archive_ids: string[] }>;
		pages_archived: number;
		pages_failed: number;
	} | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	error: string | null;
}

interface PageData { id: string; title: string; created_time: string; }

const BATCH_SIZE = 100;
const CHUNKS_PER_RUN = 10;
const ARCHIVE_BATCH = 5;

async function processFindDuplicatesJob(job: Job, accessToken: string, env: Env): Promise<void> {
	const NOTION_API = 'https://api.notion.com/v1';
	const headers = {
		'Authorization': `Bearer ${accessToken}`,
		'Notion-Version': '2022-06-28',
		'Content-Type': 'application/json'
	};
	
	job.status = 'running';
	if (!job.started_at) job.started_at = new Date().toISOString();
	
	// Get accumulated pages
	let allPages = await env.KV.get<PageData[]>(`job:${job.id}:pages`, { type: 'json' }) || [];
	
	// Phase 1: Scanning
	if (job.progress.phase === 'scanning') {
		for (let chunk = 0; chunk < CHUNKS_PER_RUN; chunk++) {
			const body: Record<string, unknown> = { page_size: BATCH_SIZE };
			if (job.progress.current_cursor) body.start_cursor = job.progress.current_cursor;
			
			const res = await fetch(`${NOTION_API}/databases/${job.database_id}/query`, {
				method: 'POST',
				headers,
				body: JSON.stringify(body)
			});
			
			if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
			const result = await res.json() as { results: Array<{ id: string; created_time: string; properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }> }>; next_cursor: string | null; has_more: boolean };
			
			for (const page of result.results) {
				let title = '';
				for (const prop of Object.values(page.properties)) {
					if (prop.type === 'title' && prop.title) {
						title = prop.title.map(t => t.plain_text).join('');
						break;
					}
				}
				allPages.push({ id: page.id, title: title.toLowerCase().trim(), created_time: page.created_time });
			}
			
			job.progress.pages_scanned = allPages.length;
			job.progress.current_cursor = result.next_cursor;
			
			if (!result.has_more) {
				job.progress.pages_total = allPages.length;
				job.progress.phase = 'analyzing';
				break;
			}
			
			await new Promise(r => setTimeout(r, 350));
		}
		
		await env.KV.put(`job:${job.id}:pages`, JSON.stringify(allPages), { expirationTtl: 3600 });
		await env.KV.put(`job:${job.id}`, JSON.stringify(job));
		
		if (job.progress.phase === 'scanning') return;  // Continue next run
	}
	
	// Phase 2: Analyzing
	if (job.progress.phase === 'analyzing') {
		const groups = new Map<string, PageData[]>();
		for (const page of allPages) {
			const existing = groups.get(page.title) || [];
			existing.push(page);
			groups.set(page.title, existing);
		}
		
		const duplicates: Job['results'] = { duplicate_groups: [], pages_archived: 0, pages_failed: 0 };
		for (const [title, pages] of groups) {
			if (pages.length > 1) {
				pages.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
				const keepIdx = job.config.keep_strategy === 'newest' ? pages.length - 1 : 0;
				duplicates.duplicate_groups.push({
					title,
					keep_id: pages[keepIdx].id,
					archive_ids: pages.filter((_, i) => i !== keepIdx).map(p => p.id)
				});
			}
		}
		
		job.results = duplicates;
		job.progress.phase = 'archiving';
		await env.KV.put(`job:${job.id}`, JSON.stringify(job));
	}
	
	// Phase 3: Archiving
	if (job.progress.phase === 'archiving' && job.results) {
		const allIds = job.results.duplicate_groups.flatMap(g => g.archive_ids);
		const processed = job.results.pages_archived + job.results.pages_failed;
		const remaining = allIds.slice(processed);
		const toProcess = remaining.slice(0, ARCHIVE_BATCH * CHUNKS_PER_RUN);
		
		for (let i = 0; i < toProcess.length; i += ARCHIVE_BATCH) {
			const batch = toProcess.slice(i, i + ARCHIVE_BATCH);
			const results = await Promise.all(batch.map(async id => {
				try {
					const res = await fetch(`${NOTION_API}/pages/${id}`, {
						method: 'PATCH',
						headers,
						body: JSON.stringify({ archived: true })
					});
					return res.ok;
				} catch { return false; }
			}));
			
			job.results.pages_archived += results.filter(r => r).length;
			job.results.pages_failed += results.filter(r => !r).length;
			await new Promise(r => setTimeout(r, 350));
		}
		
		if (job.results.pages_archived + job.results.pages_failed >= allIds.length) {
			job.progress.phase = 'done';
			job.status = 'completed';
			job.completed_at = new Date().toISOString();
			await env.KV.delete(`job:${job.id}:pages`);
		}
		
		await env.KV.put(`job:${job.id}`, JSON.stringify(job));
	}
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[Scheduler] Running at ${new Date().toISOString()}`);

		try {
			// First, process any pending async jobs
			await processPendingJobs(env);
			
			// Get all enabled agents with schedules
			const agentsResult = await env.DB.prepare(`
				SELECT * FROM agents WHERE schedule IS NOT NULL AND enabled = 1
			`).all<Agent>();

			const agents = agentsResult.results;
			console.log(`[Scheduler] Found ${agents.length} scheduled agents`);

			// Check which agents should run now
			const agentsToRun = agents.filter(agent => {
				try {
					return shouldRunNow(agent.schedule);
				} catch {
					console.error(`[Scheduler] Invalid cron for agent ${agent.id}: ${agent.schedule}`);
					return false;
				}
			});

			console.log(`[Scheduler] ${agentsToRun.length} agents due to run`);

			// Execute each agent
			for (const agent of agentsToRun) {
				// Check rate limit (max 1 execution per agent per 5 minutes)
				const rateLimitKey = `scheduler:${agent.id}:${Math.floor(Date.now() / 300000)}`;
				const alreadyRun = await env.KV.get(rateLimitKey);

				if (alreadyRun) {
					console.log(`[Scheduler] Agent ${agent.id} already ran this period, skipping`);
					continue;
				}

				// Get user for access token
				const user = await env.DB.prepare(`
					SELECT id, notion_access_token FROM users WHERE id = ?
				`).bind(agent.user_id).first<User>();

				if (!user) {
					console.error(`[Scheduler] User not found for agent ${agent.id}`);
					continue;
				}

				// Mark as running this period
				await env.KV.put(rateLimitKey, '1', { expirationTtl: 300 });

				// Execute agent
				console.log(`[Scheduler] Executing agent ${agent.id}: ${agent.name}`);
				const result = await executeScheduledAgent(env, agent, user);

				if (result.success) {
					console.log(`[Scheduler] Agent ${agent.id} completed successfully`);
				} else {
					console.error(`[Scheduler] Agent ${agent.id} failed: ${result.error}`);
				}
			}

		} catch (error) {
			console.error('[Scheduler] Error:', error);
		}
	},

	// Also support HTTP requests for manual testing
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'GET') {
			return new Response(JSON.stringify({
				service: 'notion-agent-scheduler',
				status: 'running',
				timestamp: new Date().toISOString()
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response('Method not allowed', { status: 405 });
	}
};
