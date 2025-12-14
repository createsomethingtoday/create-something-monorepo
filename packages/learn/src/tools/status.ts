/**
 * Status Tool
 *
 * Shows current learning progress.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isAuthenticated, loadAuth } from '../auth/storage.js';
import { LMSClient } from '../client/lms-api.js';

export const statusTool: Tool = {
	name: 'learn_status',
	description: `Get your current learning progress.

Shows:
- Completed paths and lessons
- Current position in the curriculum
- Next recommended lesson
- Total time spent learning`,
	inputSchema: {
		type: 'object' as const,
		properties: {}
	}
};

export async function handleStatus(): Promise<{ type: 'text'; text: string }[]> {
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

	try {
		const client = new LMSClient(auth.tokens);
		const progress = await client.getProgress();

		const { stats, pathProgress } = progress;

		// Find next recommended lesson
		const inProgressPath = pathProgress.find((p) => p.status === 'in_progress');
		const nextPath = pathProgress.find((p) => p.status === 'not_started');

		let recommendation = '';
		if (inProgressPath?.currentLesson) {
			recommendation = `Continue **${inProgressPath.pathId}**: ${inProgressPath.currentLesson}`;
		} else if (nextPath) {
			recommendation = `Start **${nextPath.pathId}** path`;
		} else if (stats.pathsCompleted === stats.totalPaths) {
			recommendation = 'All paths completed! Consider revisiting for deeper understanding.';
		} else {
			recommendation = 'Start with the **foundations** path';
		}

		const timeSpentMinutes = Math.floor(stats.totalTimeSpent / 60);
		const timeSpentHours = Math.floor(timeSpentMinutes / 60);
		const timeDisplay =
			timeSpentHours > 0
				? `${timeSpentHours}h ${timeSpentMinutes % 60}m`
				: `${timeSpentMinutes}m`;

		const pathList = pathProgress
			.map((p) => {
				const icon = p.status === 'completed' ? '✓' : p.status === 'in_progress' ? '→' : '○';
				const pct = Math.round((p.lessonsCompleted / p.totalLessons) * 100);
				return `${icon} **${p.pathId}**: ${p.lessonsCompleted}/${p.totalLessons} lessons (${pct}%)`;
			})
			.join('\n');

		return [
			{
				type: 'text' as const,
				text: `# Learning Progress

**${auth.user.email}** | ${auth.user.tier} tier

## Overview
- Paths: ${stats.pathsCompleted}/${stats.totalPaths} completed
- Lessons: ${stats.lessonsCompleted}/${stats.totalLessons} completed
- Time: ${timeDisplay} total

## Paths
${pathList}

## Recommendation
${recommendation}

---

Use \`learn_lesson\` to fetch lesson content.
Use \`learn_complete\` to mark lessons done.`
			}
		];
	} catch (error) {
		return [
			{
				type: 'text' as const,
				text: `Error fetching progress: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		];
	}
}
