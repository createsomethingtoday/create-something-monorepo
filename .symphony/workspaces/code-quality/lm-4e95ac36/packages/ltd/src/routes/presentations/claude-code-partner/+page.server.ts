import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		meta: {
			title: 'CLAUDE CODE: PARTNER | A Presentation',
			description:
				'AI-native development with Claude Code. Set up CLAUDE.md, rules, MCP servers, and hooks.',
			author: 'CREATE SOMETHING'
		}
	};
};
