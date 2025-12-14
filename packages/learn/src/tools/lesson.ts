/**
 * Lesson Tool
 *
 * Fetches lesson content for learning.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isAuthenticated, loadAuth } from '../auth/storage.js';
import { LMSClient } from '../client/lms-api.js';
import { getLessonWithCache } from '../cache/lessons.js';

export const lessonTool: Tool = {
	name: 'learn_lesson',
	description: `Fetch lesson content from a learning path.

Returns the lesson markdown content, metadata, and table of contents.
Also marks the lesson as started for progress tracking.

Paths: foundations, craft, infrastructure, agents, method, systems, partnership, advanced`,
	inputSchema: {
		type: 'object' as const,
		properties: {
			pathId: {
				type: 'string',
				description: 'The learning path ID (e.g., "foundations", "craft")'
			},
			lessonId: {
				type: 'string',
				description: 'The lesson ID within the path'
			}
		},
		required: ['pathId', 'lessonId']
	}
};

export async function handleLesson(
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

	if (!pathId || !lessonId) {
		return [
			{
				type: 'text' as const,
				text: 'Error: Both pathId and lessonId are required.'
			}
		];
	}

	try {
		const client = new LMSClient(auth.tokens);

		// Fetch lesson with cache
		const lesson = await getLessonWithCache(pathId, lessonId, () =>
			client.getLesson(pathId, lessonId)
		);

		// Mark as started (fire and forget)
		client.startLesson(pathId, lessonId).catch(() => {
			// Ignore errors - progress tracking is best effort
		});

		// Format headings as table of contents
		const toc = lesson.content.headings
			.map((h) => {
				const indent = '  '.repeat(h.level - 1);
				return `${indent}- ${h.text}`;
			})
			.join('\n');

		return [
			{
				type: 'text' as const,
				text: `# ${lesson.lesson.title}

**Path**: ${lesson.path.title} (${lesson.path.subtitle})
**Duration**: ${lesson.lesson.duration}
${lesson.lesson.praxis ? `**Praxis**: ${lesson.lesson.praxis}` : ''}

## Contents
${toc}

---

${lesson.content.markdown}

---

When you've finished reading, use \`learn_complete\` to mark this lesson done.
${lesson.lesson.praxis ? `\nThis lesson has a praxis exercise: \`learn_praxis\` with id "${lesson.lesson.praxis}"` : ''}`
			}
		];
	} catch (error) {
		return [
			{
				type: 'text' as const,
				text: `Error fetching lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		];
	}
}
