import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgentsByUserId, getAgentById, createAgent, updateAgent, deleteAgent, getExecutionsByAgentId } from '$lib/db/queries';

// GET /api/agents - List all agents for user
export const GET: RequestHandler = async ({ platform, cookies, url }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not configured');
	}

	const agentId = url.searchParams.get('id');

	if (agentId) {
		// Get single agent with executions
		const agent = await getAgentById(platform.env.DB, agentId);
		if (!agent || agent.user_id !== userId) {
			throw error(404, 'Agent not found');
		}

		const executions = await getExecutionsByAgentId(platform.env.DB, agentId, 20);

		return json({ agent, executions });
	}

	// List all agents
	const agents = await getAgentsByUserId(platform.env.DB, userId);
	return json({ agents });
};

// POST /api/agents - Create new agent
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not configured');
	}

	const body = await request.json() as {
		name?: string;
		description?: string;
		user_message?: string;
		databases?: string[];
		schedule?: string;
	};

	const { name, description, user_message, databases, schedule } = body;

	if (!name || !user_message) {
		throw error(400, 'Name and user_message are required');
	}

	const agent = await createAgent(platform.env.DB, {
		id: crypto.randomUUID(),
		user_id: userId,
		name,
		description: description || null,
		user_message,
		databases: JSON.stringify(databases || []),
		schedule: schedule || null,
		enabled: 1
	});

	return json({ success: true, agent });
};

// PATCH /api/agents - Update agent
export const PATCH: RequestHandler = async ({ request, platform, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not configured');
	}

	const body = await request.json() as {
		id?: string;
		name?: string;
		description?: string;
		user_message?: string;
		databases?: string[];
		schedule?: string;
		enabled?: boolean;
	};

	const { id, name, description, user_message, databases, schedule, enabled } = body;

	if (!id) {
		throw error(400, 'Agent id is required');
	}

	// Verify ownership
	const agent = await getAgentById(platform.env.DB, id);
	if (!agent || agent.user_id !== userId) {
		throw error(404, 'Agent not found');
	}

	await updateAgent(platform.env.DB, id, {
		name,
		description,
		user_message,
		databases: databases ? JSON.stringify(databases) : undefined,
		schedule,
		enabled: enabled !== undefined ? (enabled ? 1 : 0) : undefined
	});

	return json({ success: true });
};

// DELETE /api/agents - Delete agent
export const DELETE: RequestHandler = async ({ url, platform, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not configured');
	}

	const agentId = url.searchParams.get('id');
	if (!agentId) {
		throw error(400, 'Agent id is required');
	}

	// Verify ownership
	const agent = await getAgentById(platform.env.DB, agentId);
	if (!agent || agent.user_id !== userId) {
		throw error(404, 'Agent not found');
	}

	await deleteAgent(platform.env.DB, agentId);

	return json({ success: true });
};
