/**
 * CREATE SOMETHING Agent Gateway Worker
 *
 * Routes requests from Cloudflare edge to Python agent server.
 * Handles authentication, logging, and async task queuing.
 */

export interface Env {
	AGENT_SERVER_URL: string;
	AGENT_API_KEY: string;
	DB: D1Database;
	CACHE: KVNamespace;
	AGENT_QUEUE: Queue<AgentTask>;
}

interface AgentRequest {
	task: string;
	agent_type?: string;
	model?: string;
	skills?: string[];
	max_turns?: number;
	client_config?: Record<string, unknown>;
	ralph_config?: Record<string, unknown>;
}

interface AgentResponse {
	success: boolean;
	output: string;
	model: string;
	input_tokens: number;
	output_tokens: number;
	cost_usd: number;
	tool_calls: Record<string, unknown>[];
	iterations: number;
	run_id: string;
	timestamp: string;
}

interface AgentTask {
	task: string;
	agentType: string;
	issueId?: string;
	requestId: string;
	timestamp: string;
}

interface QueueMessage<T> {
	body: T;
	ack(): void;
	retry(options?: { delaySeconds?: number }): void;
}

interface MessageBatch<T> {
	messages: QueueMessage<T>[];
}

export default {
	/**
	 * Handle HTTP requests
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// Handle preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Route handling
			if (url.pathname === '/agent/run' && request.method === 'POST') {
				return await handleAgentRun(request, env, corsHeaders);
			}

			if (url.pathname === '/agent/queue' && request.method === 'POST') {
				return await handleAgentQueue(request, env, corsHeaders);
			}

			if (url.pathname === '/agent/status' && request.method === 'GET') {
				return await handleAgentStatus(request, env, corsHeaders);
			}

			if (url.pathname === '/health') {
				return new Response(
					JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
					{
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					}
				);
			}

			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Gateway error:', error);
			return new Response(
				JSON.stringify({
					error: 'Internal server error',
					message: error instanceof Error ? error.message : 'Unknown error',
				}),
				{
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}
	},

	/**
	 * Process queued agent tasks
	 */
	async queue(batch: MessageBatch<AgentTask>, env: Env): Promise<void> {
		for (const message of batch.messages) {
			const { task, agentType, issueId, requestId } = message.body;

			try {
				console.log(`Processing queued task: ${requestId}`);

				const response = await fetch(`${env.AGENT_SERVER_URL}/run`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.AGENT_API_KEY}`,
					},
					body: JSON.stringify({
						task,
						agent_type: agentType,
					}),
				});

				const result = (await response.json()) as AgentResponse;

				// Log result to D1
				await env.DB.prepare(
					`INSERT INTO agent_runs (
            request_id, issue_id, success, output, cost_usd, model,
            input_tokens, output_tokens, iterations, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
					.bind(
						requestId,
						issueId || null,
						result.success ? 1 : 0,
						result.output.slice(0, 10000), // Truncate for storage
						result.cost_usd,
						result.model,
						result.input_tokens,
						result.output_tokens,
						result.iterations,
						new Date().toISOString()
					)
					.run();

				console.log(`Task ${requestId} completed: success=${result.success}`);
				message.ack();
			} catch (error) {
				console.error(`Task ${requestId} failed:`, error);

				// Retry with backoff
				message.retry({ delaySeconds: 60 });
			}
		}
	},
};

/**
 * Handle synchronous agent execution
 */
async function handleAgentRun(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const body = (await request.json()) as AgentRequest;
	const requestId = crypto.randomUUID();

	// Forward to Python agent server
	const response = await fetch(`${env.AGENT_SERVER_URL}/run`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.AGENT_API_KEY}`,
		},
		body: JSON.stringify(body),
	});

	const result = (await response.json()) as AgentResponse;

	// Log to D1 (non-blocking)
	try {
		await env.DB.prepare(
			`INSERT INTO agent_runs (
        request_id, success, output, cost_usd, model,
        input_tokens, output_tokens, iterations, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				requestId,
				result.success ? 1 : 0,
				result.output.slice(0, 10000),
				result.cost_usd,
				result.model,
				result.input_tokens,
				result.output_tokens,
				result.iterations,
				new Date().toISOString()
			)
			.run();
	} catch (dbError) {
		console.error('Failed to log to D1:', dbError);
	}

	return new Response(JSON.stringify(result), {
		status: response.status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

/**
 * Handle async agent task queuing
 */
async function handleAgentQueue(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const body = (await request.json()) as AgentRequest & { issueId?: string };
	const requestId = crypto.randomUUID();

	// Queue the task
	await env.AGENT_QUEUE.send({
		task: body.task,
		agentType: body.agent_type || 'default',
		issueId: body.issueId,
		requestId,
		timestamp: new Date().toISOString(),
	});

	return new Response(
		JSON.stringify({
			queued: true,
			requestId,
			message: 'Task queued for processing',
		}),
		{
			status: 202,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Get status of agent runs
 */
async function handleAgentStatus(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const url = new URL(request.url);
	const requestId = url.searchParams.get('requestId');

	if (requestId) {
		// Get specific run
		const result = await env.DB.prepare(`SELECT * FROM agent_runs WHERE request_id = ?`)
			.bind(requestId)
			.first();

		if (!result) {
			return new Response(JSON.stringify({ error: 'Run not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(result), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Get recent runs
	const { results } = await env.DB.prepare(
		`SELECT request_id, success, cost_usd, model, iterations, created_at
     FROM agent_runs
     ORDER BY created_at DESC
     LIMIT 50`
	).all();

	return new Response(JSON.stringify({ runs: results }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}
