/**
 * Complete Tool
 *
 * Marks a lesson as complete with required reflection.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isAuthenticated, loadAuth } from '../auth/storage.js';
import { LMSClient } from '../client/lms-api.js';

const MIN_REFLECTION_LENGTH = 50;

export const completeTool: Tool = {
	name: 'learn_complete',
	description: `Mark a lesson as complete.

Requires a reflection to ensure understanding. Reflections should capture:
- What you learned
- How it connects to your work
- Questions that remain.`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			pathId: {
				type: 'string',
				description: 'The learning path ID'
			},
			lessonId: {
				type: 'string',
				description: 'The lesson ID'
			},
			reflection: {
				type: 'string',
				description: 'Your reflection on what you learned (minimum 50 characters)'
			},
			timeSpent: {
				type: 'number',
				description: 'Time spent on the lesson in seconds (optional, estimated if not provided)'
			}
		},
		required: ['pathId', 'lessonId', 'reflection']
	}
};

export async function handleComplete(
	args: Record<string, unknown> | undefined
): Promise<{ type: 'text'; text: string }[]> {
	if (!isAuthenticated()) {
		return [
			{
				type: 'text' as const,
				text: `# Not Authenticated

Run \`learn_authenticate\` with your email to start.`
			}
		];
	}

	const auth = loadAuth();
	if (!auth) {
		return [
			{
				type: 'text' as const,
				text: 'Error: Failed to load authentication state.'
			}
		];
	}

	const pathId = args?.pathId as string;
	const lessonId = args?.lessonId as string;
	const reflection = args?.reflection as string;
	const timeSpent = (args?.timeSpent as number) || 600; // Default 10 minutes

	if (!pathId || !lessonId) {
		return [
			{
				type: 'text' as const,
				text: 'Error: pathId and lessonId are required.'
			}
		];
	}

	if (!reflection || reflection.length < MIN_REFLECTION_LENGTH) {
		return [
			{
				type: 'text' as const,
				text: `# Reflection Required

Please provide a reflection of at least ${MIN_REFLECTION_LENGTH} characters.

A good reflection captures:
- **What you learned**: Key insights from the lesson
- **Connection**: How it relates to your current work
- **Questions**: What remains unclear or worth exploring

Example:
"I learned how the lesson's MCP pattern works and where it fits in my codebase. I can apply this to my current service, but I still need to test edge cases around tool input validation."`
			}
		];
	}

	try {
		const client = new LMSClient(auth.tokens);

		const result = await client.completeLesson(pathId, lessonId, timeSpent, reflection);

		if (result.pathCompleted) {
			return [
				{
					type: 'text' as const,
					text: `# Path Completed! 🎉

You've completed all lessons in **${pathId}**.

## Your Reflection
${reflection}

Use \`learn_status\` to see your next path.`
				}
			];
		}

		return [
			{
				type: 'text' as const,
				text: `# Lesson Completed ✓

**${pathId}/${lessonId}** marked complete.

## Your Reflection
${reflection}

---

Use \`learn_status\` to see your progress.
Use \`learn_lesson\` to continue to the next lesson.`
			}
		];
	} catch (error) {
		return [
			{
				type: 'text' as const,
				text: `Error completing lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		];
	}
}
