import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgentById, getUserById, createExecution, updateExecution, createAuditLog } from '$lib/db/queries';
import { decryptToken } from '$lib/notion/oauth';
import { executeAgentWithStreaming } from '$lib/agent/executor';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '$lib/security/rate-limit';

export const GET: RequestHandler = async ({ url, platform, cookies, request }) => {
	const agentId = url.searchParams.get('agent_id');

	if (!agentId) {
		throw error(400, 'Missing agent_id parameter');
	}

	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB || !platform?.env?.AI || !platform?.env?.ENCRYPTION_KEY || !platform?.env?.KV) {
		throw error(500, 'Missing required environment configuration');
	}

	// Rate limiting
	const rateLimit = await checkRateLimit(platform.env.KV, userId, 'execute', RATE_LIMITS.execute);
	if (!rateLimit.allowed) {
		return rateLimitResponse(rateLimit);
	}

	// Get agent and verify ownership
	const agent = await getAgentById(platform.env.DB, agentId);
	if (!agent) {
		throw error(404, 'Agent not found');
	}

	if (agent.user_id !== userId) {
		throw error(403, 'Forbidden');
	}

	// Get user for access token
	const user = await getUserById(platform.env.DB, userId);
	if (!user) {
		throw error(404, 'User not found');
	}

	// Create execution record
	const executionId = crypto.randomUUID();
	await createExecution(platform.env.DB, {
		id: executionId,
		agent_id: agentId,
		trigger_type: 'manual',
		status: 'running',
		input: null,
		output: null,
		error: null,
		tokens_used: null,
		started_at: new Date().toISOString()
	});

	// Log audit entry
	await createAuditLog(platform.env.DB, {
		id: crypto.randomUUID(),
		user_id: userId,
		agent_id: agentId,
		action: 'agent_execute',
		details: JSON.stringify({ trigger: 'manual', streaming: true }),
		ip_address: request.headers.get('CF-Connecting-IP')
	});

	// Decrypt access token (AES-GCM)
	const accessToken = await decryptToken(user.notion_access_token, platform.env.ENCRYPTION_KEY);

	// Create SSE stream
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			
			const sendEvent = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
			};

			try {
				// Send start event
				sendEvent('start', { execution_id: executionId });

				// Execute with streaming
				const result = await executeAgentWithStreaming(
					platform.env.AI,
					{
						userId,
						agentId,
						agentName: agent.name,
						userMessage: agent.user_message,
						allowedDatabases: JSON.parse(agent.databases || '[]'),
						accessToken
					},
					(step) => {
						// Send each step as it happens
						sendEvent('step', {
							type: step.type,
							content: step.content,
							toolName: step.toolName,
							timestamp: step.timestamp.toISOString()
						});
					}
				);

				// Update execution record
				await updateExecution(platform.env.DB, executionId, {
					status: result.success ? 'completed' : 'failed',
					output: JSON.stringify({
						response: result.response,
						steps: result.steps.map(s => ({
							type: s.type,
							content: s.content,
							timestamp: s.timestamp.toISOString()
						}))
					}),
					error: result.error || null,
					tokens_used: result.tokensUsed,
					completed_at: new Date().toISOString()
				});

				// Send complete event
				sendEvent('complete', {
					success: result.success,
					response: result.response,
					steps: result.steps.length,
					tokens_used: result.tokensUsed
				});

			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error';

				// Update execution as failed
				await updateExecution(platform.env.DB, executionId, {
					status: 'failed',
					error: errorMessage,
					completed_at: new Date().toISOString()
				});

				sendEvent('error', { message: errorMessage });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};
