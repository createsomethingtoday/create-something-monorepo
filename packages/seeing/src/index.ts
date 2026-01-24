#!/usr/bin/env node
/**
 * @createsomething/seeing
 *
 * Gemini CLI extension for learning the Subtractive Triad.
 * The junior tier of CREATE SOMETHING education.
 *
 * Seeing teaches perception. Dwelling teaches execution.
 *
 * @packageDocumentation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
	loadProgress,
	saveProgress,
	addReflection,
	recordTriadUse,
	checkGraduationReadiness,
	startCapstone,
	checkCapstone,
	completeCapstone,
	type SeeingProgress,
} from './progress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');

// Available lessons (in curriculum order)
const LESSONS = [
	'what-is-creation',
	'dry-implementation',
	'rams-artifact',
	'heidegger-system',
	'triad-application',
	'capstone',
] as const;

type LessonId = (typeof LESSONS)[number];

/**
 * Create the Seeing MCP server.
 */
function createServer(): Server {
	const server = new Server(
		{
			name: '@createsomething/seeing',
			version: '0.1.0',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
			},
		}
	);

	// List available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			{
				name: 'seeing_lesson',
				description:
					'Read a lesson from the Seeing curriculum. Lessons teach the Subtractive Triad philosophy.',
				inputSchema: {
					type: 'object' as const,
					properties: {
						lesson: {
							type: 'string',
							enum: LESSONS,
							description: 'The lesson to read',
						},
					},
					required: ['lesson'],
				},
			},
			{
				name: 'seeing_progress',
				description: 'View your progress in the Seeing journey.',
				inputSchema: {
					type: 'object' as const,
					properties: {},
				},
			},
			{
				name: 'seeing_reflect',
				description: 'Record a learning reflection to deepen understanding.',
				inputSchema: {
					type: 'object' as const,
					properties: {
						insight: {
							type: 'string',
							description: 'Your reflection or insight',
						},
						level: {
							type: 'string',
							enum: ['dry', 'rams', 'heidegger', 'general'],
							description: 'Which Triad level this relates to',
						},
					},
					required: ['insight'],
				},
			},
			{
				name: 'seeing_triad_use',
				description: 'Record that you used a Triad question (for progress tracking).',
				inputSchema: {
					type: 'object' as const,
					properties: {
						level: {
							type: 'string',
							enum: ['dry', 'rams', 'heidegger', 'full'],
							description: 'Which question was used',
						},
					},
					required: ['level'],
				},
			},
			{
				name: 'seeing_graduate',
				description: 'Check if you are ready to graduate from Seeing to Dwelling.',
				inputSchema: {
					type: 'object' as const,
					properties: {},
				},
			},
			{
				name: 'seeing_capstone_start',
				description: 'Start the capstone project — build a Task Tracker MCP server (Simple Loom).',
				inputSchema: {
					type: 'object' as const,
					properties: {
						projectPath: {
							type: 'string',
							description: 'Path to your task-tracker project directory',
						},
					},
					required: ['projectPath'],
				},
			},
			{
				name: 'seeing_capstone_check',
				description: 'Test your Task Tracker MCP server (Simple Ground verification).',
				inputSchema: {
					type: 'object' as const,
					properties: {
						projectPath: {
							type: 'string',
							description: 'Path to your task-tracker project directory',
						},
					},
					required: ['projectPath'],
				},
			},
			{
				name: 'seeing_capstone_complete',
				description: 'Complete your capstone project with Triad findings and reflection.',
				inputSchema: {
					type: 'object' as const,
					properties: {
						dryFindings: {
							type: 'string',
							description: 'What DRY patterns did you apply or discover?',
						},
						ramsFindings: {
							type: 'string',
							description: 'What didn\'t earn its existence? What did you keep simple?',
						},
						heideggerFindings: {
							type: 'string',
							description: 'How does your server serve Claude Code\'s workflow?',
						},
						reflection: {
							type: 'string',
							description: 'What did you learn about The Automation Layer?',
						},
					},
					required: ['dryFindings', 'ramsFindings', 'heideggerFindings', 'reflection'],
				},
			},
		],
	}));

	// List available resources (lessons as resources)
	server.setRequestHandler(ListResourcesRequestSchema, async () => ({
		resources: LESSONS.map((lesson) => ({
			uri: `seeing://lessons/${lesson}`,
			name: formatLessonName(lesson),
			description: `Seeing curriculum: ${formatLessonName(lesson)}`,
			mimeType: 'text/markdown',
		})),
	}));

	// Read lesson resources
	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		const uri = request.params.uri;

		if (uri.startsWith('seeing://lessons/')) {
			const lessonId = uri.replace('seeing://lessons/', '') as LessonId;

			if (!LESSONS.includes(lessonId)) {
				throw new Error(`Unknown lesson: ${lessonId}`);
			}

			const content = await readLesson(lessonId);
			return {
				contents: [
					{
						uri,
						mimeType: 'text/markdown',
						text: content,
					},
				],
			};
		}

		throw new Error(`Unknown resource: ${uri}`);
	});

	// Handle tool calls
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		switch (name) {
			case 'seeing_lesson': {
				const lessonId = (args as { lesson: LessonId }).lesson;
				const content = await readLesson(lessonId);

				// Update progress
				const progress = loadProgress();
				if (!progress.lessons[lessonId]) {
					progress.lessons[lessonId] = { status: 'in_progress', startedAt: Date.now() };
				}
				saveProgress(progress);

				return {
					content: [{ type: 'text' as const, text: content }],
				};
			}

			case 'seeing_progress': {
				const progress = loadProgress();
				const formatted = formatProgress(progress);
				return {
					content: [{ type: 'text' as const, text: formatted }],
				};
			}

			case 'seeing_reflect': {
				const { insight, level = 'general' } = args as {
					insight: string;
					level?: 'dry' | 'rams' | 'heidegger' | 'general';
				};

				addReflection(insight, level);

				return {
					content: [
						{
							type: 'text' as const,
							text: `Reflection recorded.\n\n**Level**: ${level}\n**Insight**: "${insight}"\n\nReflection deepens understanding. The hermeneutic circle continues.`,
						},
					],
				};
			}

			case 'seeing_triad_use': {
				const { level } = args as { level: 'dry' | 'rams' | 'heidegger' | 'full' };

				recordTriadUse(level);

				return {
					content: [
						{
							type: 'text' as const,
							text: `Recorded: ${level.toUpperCase()} question used.\n\nPractice builds perception.`,
						},
					],
				};
			}

			case 'seeing_graduate': {
				const result = checkGraduationReadiness();
				return {
					content: [{ type: 'text' as const, text: result }],
				};
			}

			case 'seeing_capstone_start': {
				const { projectPath } = args as { projectPath: string };
				const result = startCapstone(projectPath);
				return {
					content: [{ type: 'text' as const, text: result }],
				};
			}

			case 'seeing_capstone_check': {
				const { projectPath } = args as { projectPath: string };
				const result = await checkCapstone(projectPath);
				return {
					content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
				};
			}

			case 'seeing_capstone_complete': {
				const { dryFindings, ramsFindings, heideggerFindings, reflection } = args as {
					dryFindings: string;
					ramsFindings: string;
					heideggerFindings: string;
					reflection: string;
				};
				const result = completeCapstone({
					dryFindings,
					ramsFindings,
					heideggerFindings,
					reflection,
				});
				return {
					content: [{ type: 'text' as const, text: result }],
				};
			}

			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	});

	return server;
}

/**
 * Read a lesson file.
 */
async function readLesson(lessonId: LessonId): Promise<string> {
	const lessonPath = join(PACKAGE_ROOT, 'lessons', `${lessonId}.md`);
	return readFile(lessonPath, 'utf-8');
}

/**
 * Format lesson ID to human-readable name.
 */
function formatLessonName(lessonId: string): string {
	const names: Record<string, string> = {
		'what-is-creation': 'What Is Creation?',
		'dry-implementation': 'DRY: The Question of Duplication',
		'rams-artifact': 'Rams: The Question of Existence',
		'heidegger-system': 'Heidegger: The Question of the Whole',
		'triad-application': 'Applying the Triad',
		capstone: 'Capstone: Building Simple Loom',
	};
	return names[lessonId] || lessonId;
}

/**
 * Format progress for display.
 */
function formatProgress(progress: SeeingProgress): string {
	const lessonStatuses = LESSONS.map((lesson) => {
		const status = progress.lessons[lesson];
		if (!status) return `○ ${formatLessonName(lesson)} — not started`;
		if (status.status === 'completed') return `✓ ${formatLessonName(lesson)} — completed`;
		return `◐ ${formatLessonName(lesson)} — in progress`;
	}).join('\n');

	const triadUses = progress.triadApplications;
	const totalUses = triadUses.dry + triadUses.rams + triadUses.heidegger + triadUses.full;

	// Capstone status
	const capstone = progress.capstone || { status: 'not_started' };
	let capstoneStatus = '○ Not started';
	if (capstone.status === 'in_progress') {
		capstoneStatus = `◐ In progress: ${capstone.projectPath || 'unknown path'}`;
	} else if (capstone.status === 'completed') {
		capstoneStatus = '✓ Completed';
	}

	return `# Your Seeing Journey

**Started**: ${progress.startedAt ? new Date(progress.startedAt).toLocaleDateString() : 'Not yet'}

## Lessons
${lessonStatuses}

## Capstone (Simple Loom)
${capstoneStatus}
${capstone.toolsVerified ? `Tools verified: ${capstone.toolsVerified.join(', ')}` : ''}

## Practice
- /dry used ${triadUses.dry} times
- /rams used ${triadUses.rams} times
- /heidegger used ${triadUses.heidegger} times
- /triad (full audit) used ${triadUses.full} times
- **Total applications**: ${totalUses}

## Reflections
You've recorded ${progress.reflections.length} reflections.
${progress.reflections.length > 0 ? `\nMost recent: "${progress.reflections[progress.reflections.length - 1]?.insight}"` : ''}

---

Keep practicing. When the questions become automatic, you'll be ready to graduate to Dwelling.`;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
	const server = createServer();
	const transport = new StdioServerTransport();

	await server.connect(transport);

	// Handle graceful shutdown
	process.on('SIGINT', async () => {
		await server.close();
		process.exit(0);
	});
}

main().catch((error) => {
	console.error('Seeing server error:', error);
	process.exit(1);
});

export { createServer };
