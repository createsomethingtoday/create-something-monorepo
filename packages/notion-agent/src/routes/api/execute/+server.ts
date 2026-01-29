import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgentById, getUserById, createExecution, updateExecution, createAuditLog } from '$lib/db/queries';
import { decryptToken } from '$lib/notion/oauth';
import { executeAgent } from '$lib/agent/executor';

export const GET: RequestHandler = async ({ url, platform, cookies, request }) => {
	const agentId = url.searchParams.get('agent_id');

	if (!agentId) {
		throw error(400, 'Missing agent_id parameter');
	}

	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB || !platform?.env?.AI || !platform?.env?.ENCRYPTION_KEY) {
		throw error(500, 'Missing required environment configuration');
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
		details: JSON.stringify({ trigger: 'manual' }),
		ip_address: request.headers.get('CF-Connecting-IP')
	});

	try {
		// Decrypt access token
		const accessToken = decryptToken(user.notion_access_token, platform.env.ENCRYPTION_KEY);

		// Execute agent
		const result = await executeAgent(
			platform.env.AI,
			{
				userId,
				agentId,
				agentName: agent.name,
				userMessage: agent.user_message,
				allowedDatabases: JSON.parse(agent.databases || '[]'),
				accessToken
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

		return json({
			success: result.success,
			execution_id: executionId,
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

		throw error(500, `Execution failed: ${errorMessage}`);
	}
};

// POST for webhook triggers with payload
export const POST: RequestHandler = async ({ request, platform }) => {
	const body = await request.json() as { agent_id?: string; context?: string };
	const { agent_id: agentId, context: triggerContext } = body;

	if (!agentId) {
		throw error(400, 'Missing agent_id in request body');
	}

	if (!platform?.env?.DB || !platform?.env?.AI || !platform?.env?.ENCRYPTION_KEY) {
		throw error(500, 'Missing required environment configuration');
	}

	// Get agent
	const agent = await getAgentById(platform.env.DB, agentId);
	if (!agent) {
		throw error(404, 'Agent not found');
	}

	// Get user for access token
	const user = await getUserById(platform.env.DB, agent.user_id);
	if (!user) {
		throw error(404, 'User not found');
	}

	// Create execution record
	const executionId = crypto.randomUUID();
	await createExecution(platform.env.DB, {
		id: executionId,
		agent_id: agentId,
		trigger_type: 'webhook',
		status: 'running',
		input: triggerContext ? JSON.stringify({ context: triggerContext }) : null,
		output: null,
		error: null,
		tokens_used: null,
		started_at: new Date().toISOString()
	});

	// Log audit entry
	await createAuditLog(platform.env.DB, {
		id: crypto.randomUUID(),
		user_id: agent.user_id,
		agent_id: agentId,
		action: 'agent_execute',
		details: JSON.stringify({ trigger: 'webhook' }),
		ip_address: request.headers.get('CF-Connecting-IP')
	});

	try {
		// Decrypt access token
		const accessToken = decryptToken(user.notion_access_token, platform.env.ENCRYPTION_KEY);

		// Execute agent
		const result = await executeAgent(
			platform.env.AI,
			{
				userId: agent.user_id,
				agentId,
				agentName: agent.name,
				userMessage: agent.user_message,
				allowedDatabases: JSON.parse(agent.databases || '[]'),
				accessToken
			},
			triggerContext
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

		return json({
			success: result.success,
			execution_id: executionId,
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

		throw error(500, `Execution failed: ${errorMessage}`);
	}
};
