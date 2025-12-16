#!/usr/bin/env node
/**
 * CREATE SOMETHING Learn MCP Server
 *
 * Exposes learning tools to Claude Code for methodology education.
 * Canon: The tool recedes; learning emerges through use.
 *
 * @example
 * # In Claude Code settings, add:
 * {
 *   "mcpServers": {
 *     "learn": {
 *       "command": "npx",
 *       "args": ["@createsomething/learn"]
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
	authenticateTool,
	handleAuthenticate,
	statusTool,
	handleStatus,
	lessonTool,
	handleLesson,
	completeTool,
	handleComplete,
	praxisTool,
	handlePraxis,
	ethosTool,
	handleEthos,
	analyzeTool,
	handleAnalyze,
	recommendTool,
	handleRecommend,
	coachTool,
	handleCoach,
	digestTool,
	handleDigest
} from './tools/index.js';

const SERVER_NAME = 'create-something-learn';
const SERVER_VERSION = '0.2.0';

/**
 * Main MCP server for CREATE SOMETHING learning.
 *
 * Tools:
 * - learn_authenticate: Magic link authentication
 * - learn_status: Progress overview
 * - learn_lesson: Fetch lesson content
 * - learn_complete: Mark lesson complete with reflection
 * - learn_praxis: Execute praxis exercises
 * - learn_ethos: Manage personal principles derived from the Subtractive Triad
 * - learn_analyze_reflection: Analyze reflection text for depth and Triad alignment
 * - learn_recommend: Recommend lessons based on Triad audit scores
 * - learn_coach: Provide real-time Triad-aligned coaching
 * - learn_digest: Generate weekly audit summary with trends
 */
async function main() {
	const server = new Server(
		{
			name: SERVER_NAME,
			version: SERVER_VERSION
		},
		{
			capabilities: {
				tools: {}
			}
		}
	);

	// Register tool listing
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				authenticateTool,
				statusTool,
				lessonTool,
				completeTool,
				praxisTool,
				ethosTool,
				analyzeTool,
				recommendTool,
				coachTool,
				digestTool
			]
		};
	});

	// Register tool execution
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case 'learn_authenticate':
					return { content: await handleAuthenticate(args) };

				case 'learn_status':
					return { content: await handleStatus() };

				case 'learn_lesson':
					return { content: await handleLesson(args) };

				case 'learn_complete':
					return { content: await handleComplete(args) };

				case 'learn_praxis':
					return { content: await handlePraxis(args) };

				case 'learn_ethos':
					return { content: await handleEthos(args as Record<string, unknown>) };

				case 'learn_analyze_reflection':
					return { content: await handleAnalyze(args as Record<string, unknown>) };

				case 'learn_recommend':
					return { content: await handleRecommend(args as Record<string, unknown>) };

				case 'learn_coach':
					return { content: await handleCoach(args as Record<string, unknown>) };

				case 'learn_digest':
					return { content: await handleDigest(args as Record<string, unknown>) };

				default:
					return {
						content: [
							{
								type: 'text' as const,
								text: `Unknown tool: ${name}`
							}
						],
						isError: true
					};
			}
		} catch (error) {
			return {
				content: [
					{
						type: 'text' as const,
						text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
					}
				],
				isError: true
			};
		}
	});

	// Connect via stdio
	const transport = new StdioServerTransport();
	await server.connect(transport);

	// Log startup to stderr (stdout is reserved for MCP protocol)
	console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
