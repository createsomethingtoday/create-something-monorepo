/**
 * Authenticate Tool
 *
 * Initiates magic link authentication flow.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { authenticateWithMagicLink } from '../auth/magic-link.js';
import { isAuthenticated, getCurrentUser } from '../auth/storage.js';

export const authenticateTool: Tool = {
	name: 'learn_authenticate',
	description: `Authenticate with CREATE SOMETHING LMS using magic link.

Sends a magic link to your email. Click the link to complete authentication.
Progress syncs across browser and Claude Code.

If already authenticated, returns current user info.`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			email: {
				type: 'string',
				description: 'Your email address'
			}
		},
		required: ['email']
	}
};

export async function handleAuthenticate(
	args: Record<string, unknown> | undefined
): Promise<{ type: 'text'; text: string }[]> {
	// Check if already authenticated
	if (isAuthenticated()) {
		const user = getCurrentUser();
		return [
			{
				type: 'text' as const,
				text: `Already authenticated as ${user?.email}.\n\nTo switch accounts, clear authentication first.`
			}
		];
	}

	const email = args?.email as string;
	if (!email) {
		return [
			{
				type: 'text' as const,
				text: 'Error: Email address is required.'
			}
		];
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return [
			{
				type: 'text' as const,
				text: 'Error: Invalid email format.'
			}
		];
	}

	// Start magic link flow
	const messages: string[] = [];

	const result = await authenticateWithMagicLink(email, (status) => {
		messages.push(status);
	});

	if (result.success) {
		return [
			{
				type: 'text' as const,
				text: `# Authentication Successful

Welcome${result.user?.name ? `, ${result.user.name}` : ''}!

You are now authenticated as **${result.user?.email}**.

## Next Steps

1. Run \`learn_status\` to see your progress
2. Run \`learn_lesson\` to start learning
3. Complete lessons and praxis exercises to track your understanding

The Subtractive Triad awaits. Let's begin with Foundations.`
			}
		];
	}

	return [
		{
			type: 'text' as const,
			text: `# Authentication Failed

${result.message}

Please try again with \`learn_authenticate\`.`
		}
	];
}
