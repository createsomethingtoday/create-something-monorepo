import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getAgentsByUserId, createAgent, updateAgent, deleteAgent, getAgentWithLastExecution } from '$lib/db/queries';
import { createNotionClient } from '$lib/notion/client';
import { decryptToken } from '$lib/notion/oauth';
import type { NotionDatabase } from '$lib/db/types';

export const load: PageServerLoad = async ({ platform, cookies }) => {
	const userId = cookies.get('user_id');

	if (!userId) {
		throw redirect(302, '/');
	}

	if (!platform?.env?.DB || !platform?.env?.ENCRYPTION_KEY) {
		throw redirect(302, '/');
	}

	const user = await getUserById(platform.env.DB, userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
		throw redirect(302, '/');
	}

	// Get user's agents
	const agents = await getAgentsByUserId(platform.env.DB, userId);

	// Get agents with execution info
	const agentsWithExecutions = await Promise.all(
		agents.map(agent => getAgentWithLastExecution(platform.env!.DB, agent.id))
	);

	// Get available databases from Notion
	let databases: NotionDatabase[] = [];
	try {
		const accessToken = await decryptToken(user.notion_access_token, platform.env.ENCRYPTION_KEY);
		const client = createNotionClient(accessToken);
		databases = await client.listDatabases();
	} catch (e) {
		console.error('Failed to fetch databases:', e);
	}

	return {
		user: {
			id: user.id,
			workspaceName: user.notion_workspace_name
		},
		agents: agentsWithExecutions.filter(Boolean),
		databases
	};
};

export const actions: Actions = {
	create: async ({ request, platform, cookies }) => {
		const userId = cookies.get('user_id');
		if (!userId || !platform?.env?.DB) {
			return { success: false, error: 'Unauthorized' };
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const userMessage = formData.get('user_message') as string;
		const databases = formData.get('databases') as string;
		const schedule = formData.get('schedule') as string;

		if (!name || !userMessage) {
			return { success: false, error: 'Name and user message are required' };
		}

		try {
			const agent = await createAgent(platform.env.DB, {
				id: crypto.randomUUID(),
				user_id: userId,
				name,
				description: description || null,
				user_message: userMessage,
				databases: databases || '[]',
				schedule: schedule || null,
				enabled: 1
			});

			return { success: true, agent };
		} catch (e) {
			return { success: false, error: 'Failed to create agent' };
		}
	},

	update: async ({ request, platform, cookies }) => {
		const userId = cookies.get('user_id');
		if (!userId || !platform?.env?.DB) {
			return { success: false, error: 'Unauthorized' };
		}

		const formData = await request.formData();
		const agentId = formData.get('agent_id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const userMessage = formData.get('user_message') as string;
		const databases = formData.get('databases') as string;
		const schedule = formData.get('schedule') as string;
		const enabled = formData.get('enabled') as string;

		if (!agentId) {
			return { success: false, error: 'Agent ID is required' };
		}

		try {
			await updateAgent(platform.env.DB, agentId, {
				name,
				description: description || null,
				user_message: userMessage,
				databases,
				schedule: schedule || null,
				enabled: enabled === 'true' ? 1 : 0
			});

			return { success: true };
		} catch (e) {
			return { success: false, error: 'Failed to update agent' };
		}
	},

	delete: async ({ request, platform, cookies }) => {
		const userId = cookies.get('user_id');
		if (!userId || !platform?.env?.DB) {
			return { success: false, error: 'Unauthorized' };
		}

		const formData = await request.formData();
		const agentId = formData.get('agent_id') as string;

		if (!agentId) {
			return { success: false, error: 'Agent ID is required' };
		}

		try {
			await deleteAgent(platform.env.DB, agentId);
			return { success: true };
		} catch (e) {
			return { success: false, error: 'Failed to delete agent' };
		}
	}
};
