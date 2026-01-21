#!/usr/bin/env node
/**
 * Community MCP Server
 * 
 * Agent-managed community presence.
 * You do deep work. The agent watches, drafts, and waits.
 * You review for 5 minutes. The community grows.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import * as community from './tools/community.js';

const server = new Server(
	{
		name: 'community-mcp',
		version: '1.0.0'
	},
	{
		capabilities: {
			tools: {}
		}
	}
);

// Define all community tools
const TOOLS = [
	{
		name: 'community_review',
		description: `Get the daily review summary. Returns urgent signals, pending responses, and hot relationships. Use this first thing to see what needs attention.`,
		inputSchema: {
			type: 'object' as const,
			properties: {},
			required: []
		}
	},
	{
		name: 'community_signals',
		description: `Get inbound signals (mentions, questions, opportunities). Filter by status, platform, or urgency.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				status: {
					type: 'string',
					description: 'Signal status: new, reviewed, queued, dismissed, responded',
					default: 'new'
				},
				platform: {
					type: 'string',
					description: 'Filter by platform: linkedin, twitter, github, etc.'
				},
				urgency: {
					type: 'string',
					description: 'Filter by urgency: low, medium, high, critical'
				},
				limit: {
					type: 'number',
					description: 'Max signals to return (default 50, max 100)'
				}
			},
			required: []
		}
	},
	{
		name: 'community_record_signal',
		description: `Record a new inbound signal. Use when you discover mentions, questions, or opportunities while monitoring platforms.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				platform: {
					type: 'string',
					description: 'Platform: linkedin, twitter, github, hackernews, reddit, etc.'
				},
				signal_type: {
					type: 'string',
					description: 'Type: mention, reply, question, opportunity, praise'
				},
				content: {
					type: 'string',
					description: 'The content of the signal'
				},
				source_url: {
					type: 'string',
					description: 'URL to the original content'
				},
				author_name: {
					type: 'string',
					description: 'Author display name'
				},
				author_handle: {
					type: 'string',
					description: 'Author handle/username'
				},
				author_followers: {
					type: 'number',
					description: 'Author follower count (for prioritization)'
				},
				relevance_score: {
					type: 'number',
					description: 'Your assessment of relevance 0-1 (default 0.5)'
				},
				urgency: {
					type: 'string',
					description: 'Urgency: low, medium, high, critical'
				},
				context: {
					type: 'string',
					description: 'Additional context about the signal'
				}
			},
			required: ['platform', 'signal_type', 'content']
		}
	},
	{
		name: 'community_draft',
		description: `Get context and guidance for drafting a response to a signal. Returns relationship history, tone guidelines, and methodology context.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				signal_id: {
					type: 'string',
					description: 'ID of the signal to respond to'
				},
				tone: {
					type: 'string',
					description: 'Response tone: methodology, helpful, appreciative, promotional',
					default: 'methodology'
				},
				action_type: {
					type: 'string',
					description: 'Action: reply, comment, share, dm',
					default: 'reply'
				}
			},
			required: ['signal_id']
		}
	},
	{
		name: 'community_queue_response',
		description: `Queue a drafted response for human review. The human will approve, edit, or reject during their daily review.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				signal_id: {
					type: 'string',
					description: 'ID of the signal this responds to (optional)'
				},
				draft_content: {
					type: 'string',
					description: 'The drafted response content'
				},
				draft_reasoning: {
					type: 'string',
					description: 'Why you drafted this response (helps human review)'
				},
				tone: {
					type: 'string',
					description: 'Tone used: methodology, helpful, appreciative, promotional'
				},
				action_type: {
					type: 'string',
					description: 'Action: reply, comment, share, dm, follow'
				},
				platform: {
					type: 'string',
					description: 'Target platform'
				},
				target_url: {
					type: 'string',
					description: 'URL where response should be posted'
				},
				priority: {
					type: 'number',
					description: 'Priority 1-10, higher = more important (default 5)'
				},
				expires_in_hours: {
					type: 'number',
					description: 'Hours until this opportunity expires (optional)'
				}
			},
			required: ['draft_content', 'action_type', 'platform']
		}
	},
	{
		name: 'community_queue',
		description: `View the response queue. See what's pending review, approved, or sent.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				status: {
					type: 'string',
					description: 'Queue status: pending, approved, sent, rejected',
					default: 'pending'
				},
				limit: {
					type: 'number',
					description: 'Max items to return (default 20, max 50)'
				}
			},
			required: []
		}
	},
	{
		name: 'community_relationships',
		description: `View relationship heat map. See who's engaging, who's warming up, who's a potential lead.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				sort: {
					type: 'string',
					description: 'Sort by: warmth, recent, interactions',
					default: 'warmth'
				},
				platform: {
					type: 'string',
					description: 'Filter by platform'
				},
				lead_potential: {
					type: 'string',
					description: 'Filter by potential: unknown, cold, warm, hot, client'
				},
				min_warmth: {
					type: 'number',
					description: 'Minimum warmth score 0-1'
				},
				limit: {
					type: 'number',
					description: 'Max relationships to return (default 50, max 100)'
				}
			},
			required: []
		}
	},
	{
		name: 'community_update_relationship',
		description: `Update relationship metadata. Add notes, tags, or manually adjust lead potential.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				id: {
					type: 'string',
					description: 'Relationship ID'
				},
				notes: {
					type: 'string',
					description: 'Notes about this person'
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'Tags for categorization'
				},
				lead_potential: {
					type: 'string',
					description: 'Manual override: unknown, cold, warm, hot, client'
				},
				interests: {
					type: 'array',
					items: { type: 'string' },
					description: 'Detected interests'
				}
			},
			required: ['id']
		}
	},
	{
		name: 'community_dismiss',
		description: `Dismiss a signal as not worth responding to. Use for noise or low-value signals.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				signal_id: {
					type: 'string',
					description: 'ID of the signal to dismiss'
				}
			},
			required: ['signal_id']
		}
	},
	{
		name: 'community_batch_review',
		description: `Process multiple review actions at once. Approve responses, dismiss signals, etc.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				actions: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								description: 'Action: approve_response, reject_response, dismiss_signal, flag_signal'
							},
							id: {
								type: 'string',
								description: 'ID of the item to act on'
							},
							edited_content: {
								type: 'string',
								description: 'Edited content (for approve_response)'
							}
						},
						required: ['type', 'id']
					},
					description: 'Array of actions to process'
				}
			},
			required: ['actions']
		}
	}
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		let result: unknown;

		// Cast args through unknown for type safety with MCP SDK
		const toolArgs = args as unknown;
		
		switch (name) {
			case 'community_review':
				result = await community.getReview();
				break;
			case 'community_signals':
				result = await community.getSignals((toolArgs || {}) as community.SignalsParams);
				break;
			case 'community_record_signal':
				result = await community.recordSignal(toolArgs as community.RecordSignalParams);
				break;
			case 'community_draft':
				result = await community.getDraftContext(toolArgs as community.DraftParams);
				break;
			case 'community_queue_response':
				result = await community.queueResponse(toolArgs as community.QueueResponseParams);
				break;
			case 'community_queue':
				result = await community.getQueue((toolArgs || {}) as community.QueueParams);
				break;
			case 'community_relationships':
				result = await community.getRelationships((toolArgs || {}) as community.RelationshipsParams);
				break;
			case 'community_update_relationship':
				result = await community.updateRelationship(toolArgs as community.UpdateRelationshipParams);
				break;
			case 'community_dismiss':
				result = await community.dismissSignal(toolArgs as { signal_id: string });
				break;
			case 'community_batch_review':
				result = await community.batchReview(toolArgs as community.BatchReviewParams);
				break;
			default:
				return {
					content: [{ type: 'text', text: `Unknown tool: ${name}` }],
					isError: true
				};
		}

		return {
			content: [
				{
					type: 'text',
					text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
				}
			]
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error: ${error instanceof Error ? error.message : String(error)}`
				}
			],
			isError: true
		};
	}
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('Community MCP server running on stdio');
}

main().catch(console.error);
