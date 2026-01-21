#!/usr/bin/env node

/**
 * Social Calendar MCP Server
 *
 * Agent-native tools for managing the CREATE SOMETHING social calendar.
 * Enables AI agents to observe schedule state, find gaps, schedule content,
 * and get intelligent suggestions based on methodology.
 *
 * Philosophy: Zuhandenheit - the tools recede into use.
 * Agents think about "checking the schedule" not "calling the API."
 *
 * Usage:
 *   node dist/index.js              # Run as MCP server (stdio)
 *   social-mcp                      # If installed globally
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as social from './tools/social.js';

const server = new Server(
	{
		name: 'social-mcp',
		version: '1.0.0'
	},
	{
		capabilities: {
			tools: {}
		}
	}
);

// =============================================================================
// Tool Definitions
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		// ─────────────────────────────────────────────────────────────────────────
		// Observation Tools
		// ─────────────────────────────────────────────────────────────────────────
		{
			name: 'social_status',
			description:
				'Get current state of the social calendar. Returns pending posts, recent posts, failures, token status, and statistics.',
			inputSchema: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['pending', 'posted', 'failed', 'all'],
						description: 'Filter by status (default: all)'
					},
					limit: {
						type: 'number',
						description: 'Max posts to return (default: 20)'
					}
				}
			}
		},
		{
			name: 'social_gaps',
			description:
				'Find gaps in the weekly posting rhythm. Returns days without scheduled content, the next optimal slot, and suggestions for filling gaps.',
			inputSchema: {
				type: 'object',
				properties: {
					weeks: {
						type: 'number',
						description: 'Number of weeks to analyze (default: 2)'
					}
				}
			}
		},
		{
			name: 'social_next_slot',
			description:
				'Get the next optimal posting slot. Returns the recommended date/time based on LinkedIn best practices and existing schedule.',
			inputSchema: {
				type: 'object',
				properties: {}
			}
		},

		// ─────────────────────────────────────────────────────────────────────────
		// Action Tools
		// ─────────────────────────────────────────────────────────────────────────
		{
			name: 'social_schedule',
			description:
				'Schedule content for LinkedIn. Can use a content filename from content/social/ or provide raw markdown content. Returns confirmation with scheduled time.',
			inputSchema: {
				type: 'object',
				properties: {
					content: {
						type: 'string',
						description:
							'Content filename (e.g., "kickstand", "ai-patterns") OR raw markdown content'
					},
					mode: {
						type: 'string',
						enum: ['longform', 'drip'],
						description: 'Posting mode - longform for single post, drip for multi-day thread (default: longform)'
					},
					startDate: {
						type: 'string',
						description: 'ISO date to schedule for (default: next optimal slot)'
					},
					dryRun: {
						type: 'boolean',
						description: 'Preview without actually scheduling (default: false)'
					}
				},
				required: ['content']
			}
		},
		{
			name: 'social_cancel',
			description: 'Cancel a scheduled post by ID. Only works for pending posts.',
			inputSchema: {
				type: 'object',
				properties: {
					postId: {
						type: 'string',
						description: 'The ID of the scheduled post to cancel'
					}
				},
				required: ['postId']
			}
		},

		// ─────────────────────────────────────────────────────────────────────────
		// Intelligence Tools
		// ─────────────────────────────────────────────────────────────────────────
		{
			name: 'social_suggest',
			description:
				"Get AI-powered content suggestions based on CREATE SOMETHING methodology and Clay playbook. Analyzes recent posts, gaps, and rhythm to suggest what to post next.",
			inputSchema: {
				type: 'object',
				properties: {
					focus: {
						type: 'string',
						enum: ['methodology', 'case_study', 'pattern', 'engagement', 'ai_native'],
						description: 'Filter suggestions by content type (default: all types)'
					}
				}
			}
		},
		{
			name: 'social_rhythm',
			description:
				"Check adherence to the Clay playbook weekly rhythm. Returns today's focus, status for each day, completion score, and recommendations.",
			inputSchema: {
				type: 'object',
				properties: {}
			}
		},
		{
			name: 'social_intelligence',
			description:
				"Get format and content recommendations based on LinkedIn research. Returns optimal formats (carousel, video, text), engagement rates, hook templates, and structure suggestions. Use before creating content.",
			inputSchema: {
				type: 'object',
				properties: {
					day: {
						type: 'string',
						enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
						description: 'Day to get suggestions for (default: today)'
					},
					content_goal: {
						type: 'string',
						enum: ['engagement', 'reach', 'leads', 'thought_leadership'],
						description: 'What you want to achieve with this content'
					},
					research_topic: {
						type: 'string',
						description: 'Topic to research for content inspiration'
					}
				}
			}
		},

		// ─────────────────────────────────────────────────────────────────────────
		// Content Pipeline Tools
		// ─────────────────────────────────────────────────────────────────────────
		{
			name: 'content_ideas',
			description:
				"View the content ideas pipeline. Ideas flow: discovered → researched → drafted → scheduled. Use to see what content is in development.",
			inputSchema: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['discovered', 'researching', 'drafted', 'scheduled', 'archived'],
						description: 'Filter by pipeline stage'
					},
					pillar: {
						type: 'string',
						enum: ['methodology', 'case_study', 'industry', 'behind_scenes', 'value_share'],
						description: 'Filter by content pillar'
					}
				}
			}
		},
		{
			name: 'content_idea_create',
			description:
				"Add a new content idea to the pipeline. Use when you discover something worth posting about from research, signals, or inspiration.",
			inputSchema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						description: 'Brief title for the idea'
					},
					description: {
						type: 'string',
						description: 'More detail about the idea'
					},
					source: {
						type: 'string',
						enum: ['research', 'signal', 'manual', 'agent', 'community'],
						description: 'Where this idea came from'
					},
					pillar: {
						type: 'string',
						enum: ['methodology', 'case_study', 'industry', 'behind_scenes', 'value_share'],
						description: 'Which content pillar this fits'
					},
					format: {
						type: 'string',
						enum: ['carousel', 'video', 'text_only', 'multi_image', 'poll'],
						description: 'Suggested format'
					},
					priority: {
						type: 'number',
						description: 'Priority 1-10 (default 5)'
					}
				},
				required: ['title', 'source']
			}
		},
		{
			name: 'content_idea_update',
			description:
				"Update an idea in the pipeline. Use to advance status, add research notes, or attach draft content.",
			inputSchema: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description: 'Idea ID'
					},
					status: {
						type: 'string',
						enum: ['discovered', 'researching', 'drafted', 'scheduled', 'archived'],
						description: 'New pipeline stage'
					},
					research_notes: {
						type: 'string',
						description: 'Research findings to attach'
					},
					draft_content: {
						type: 'string',
						description: 'Developed content draft'
					},
					priority: {
						type: 'number',
						description: 'Updated priority'
					}
				},
				required: ['id']
			}
		},
		{
			name: 'content_coverage',
			description:
				"Check what topics/pillars have been covered recently. Use to avoid repetition and identify gaps.",
			inputSchema: {
				type: 'object',
				properties: {
					pillar: {
						type: 'string',
						enum: ['methodology', 'case_study', 'industry', 'behind_scenes', 'value_share'],
						description: 'Filter by pillar'
					},
					days: {
						type: 'number',
						description: 'Look back period in days (default 30)'
					}
				}
			}
		},
		{
			name: 'content_rhythm_check',
			description:
				"Check rhythm adherence: what's planned for each day, what's missing, what to do next. Returns gaps and recommendations sorted by urgency.",
			inputSchema: {
				type: 'object',
				properties: {
					weeks: {
						type: 'number',
						description: 'Weeks ahead to analyze (default 2)'
					}
				}
			}
		}
	]
}));

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		const safeArgs = (args as Record<string, unknown>) || {};
		let result: unknown;

		switch (name) {
			// Observation Tools
			case 'social_status':
				result = await social.getStatus(
					safeArgs.status as string | undefined,
					safeArgs.limit as number | undefined
				);
				break;

			case 'social_gaps':
				result = await social.getGaps(safeArgs.weeks as number | undefined);
				break;

			case 'social_next_slot':
				result = await social.getNextSlot();
				break;

			// Action Tools
			case 'social_schedule':
				result = await social.scheduleContent(
					safeArgs.content as string,
					safeArgs.mode as string | undefined,
					safeArgs.startDate as string | undefined,
					safeArgs.dryRun as boolean | undefined
				);
				break;

			case 'social_cancel':
				result = await social.cancelPost(safeArgs.postId as string);
				break;

			// Intelligence Tools
			case 'social_suggest':
				result = await social.getSuggestions(safeArgs.focus as string | undefined);
				break;

			case 'social_rhythm':
				result = await social.getRhythm();
				break;

			case 'social_intelligence':
				result = await social.getIntelligence(
					safeArgs.day as string | undefined,
					safeArgs.content_goal as string | undefined,
					safeArgs.research_topic as string | undefined
				);
				break;

			// Content Pipeline Tools
			case 'content_ideas':
				result = await social.getIdeas(
					safeArgs.status as string | undefined,
					safeArgs.pillar as string | undefined
				);
				break;

			case 'content_idea_create':
				result = await social.createIdea(
					safeArgs.title as string,
					safeArgs.source as string,
					safeArgs.description as string | undefined,
					safeArgs.pillar as string | undefined,
					safeArgs.format as string | undefined,
					safeArgs.priority as number | undefined
				);
				break;

			case 'content_idea_update':
				result = await social.updateIdea(
					safeArgs.id as string,
					safeArgs.status as string | undefined,
					safeArgs.research_notes as string | undefined,
					safeArgs.draft_content as string | undefined,
					safeArgs.priority as number | undefined
				);
				break;

			case 'content_coverage':
				result = await social.getCoverage(
					safeArgs.pillar as string | undefined,
					safeArgs.days as number | undefined
				);
				break;

			case 'content_rhythm_check':
				result = await social.checkRhythm(
					safeArgs.weeks as number | undefined
				);
				break;

			default:
				throw new Error(`Unknown tool: ${name}`);
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2)
				}
			]
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							error: message,
							tool: name,
							arguments: args
						},
						null,
						2
					)
				}
			],
			isError: true
		};
	}
});

// =============================================================================
// Start Server
// =============================================================================

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Social MCP server running on stdio');
