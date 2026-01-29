import type { LayoutServerLoad } from './$types';
import { getUserById } from '$lib/db/queries';

export const load: LayoutServerLoad = async ({ platform, cookies }) => {
	const userId = cookies.get('user_id');

	if (!userId || !platform?.env?.DB) {
		return { user: null };
	}

	try {
		const user = await getUserById(platform.env.DB, userId);

		if (user) {
			return {
				user: {
					id: user.id,
					notionWorkspaceId: user.notion_workspace_id
				}
			};
		}
	} catch (e) {
		console.error('Error loading user:', e);
	}

	return { user: null };
};
