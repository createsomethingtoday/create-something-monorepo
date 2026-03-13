import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'HUB | A Presentation',
			description:
				'Why the CREATE SOMETHING Hub is the governed MCP surface between the user, Codex, and downstream tool catalogs.',
			author: 'CREATE SOMETHING'
		}
	};
};
