/**
 * Agent Executor
 * 
 * Executes agents using Workers AI with tool calling.
 * Based on pm-agent pattern from packages/io.
 */

import { NotionClient } from '../notion/client.js';
import { NOTION_TOOLS, executeTool, formatToolResult } from '../notion/tools.js';
import { buildSystemPrompt, buildUserPrompt } from './system-prompt.js';
import type { AgentContext, AgentExecutionResult, AgentStep, AgentMessage, ToolCall } from './types.js';

const MAX_ITERATIONS = 10;
// Use Llama 3.1 70B - 8B is faster but loops on complex tasks
const MODEL = '@cf/meta/llama-3.1-70b-instruct' as unknown as keyof AiModels;

/**
 * Pre-fetch database schemas to include in user message.
 * This eliminates the need for agents to call get_database_schema first.
 */
async function prefetchSchemas(
	notionClient: NotionClient,
	databaseIds: string[]
): Promise<string> {
	if (databaseIds.length === 0) return '';
	
	const schemas: string[] = [];
	for (const dbId of databaseIds.slice(0, 3)) {
		try {
			const db = await notionClient.getDatabase(dbId);
			const dbName = db.title?.[0]?.plain_text || dbId;
			const props = Object.entries(db.properties || {}).map(([name, prop]: [string, any]) => {
				let info = `${name} (${prop.type})`;
				if (prop.type === 'select' && prop.select?.options) {
					const opts = prop.select.options.map((o: any) => o.name).join(', ');
					info += ` [options: ${opts}]`;
				} else if (prop.type === 'status' && prop.status?.options) {
					const opts = prop.status.options.map((o: any) => o.name).join(', ');
					info += ` [options: ${opts}]`;
				} else if (prop.type === 'multi_select' && prop.multi_select?.options) {
					const opts = prop.multi_select.options.map((o: any) => o.name).join(', ');
					info += ` [options: ${opts}]`;
				}
				return `  - ${info}`;
			});
			schemas.push(`Database "${dbName}" (${dbId}):\n${props.join('\n')}`);
		} catch {
			// Skip inaccessible databases
		}
	}
	return schemas.length > 0 
		? `\n\n## Database Schemas (pre-fetched)\n${schemas.join('\n\n')}`
		: '';
}

interface AIResponse {
	response?: string | StructuredResponse;
	tool_calls?: ToolCall[];
}

interface StructuredResponse {
	action: 'tool_call' | 'final_response';
	tool_name?: string;
	tool_arguments?: Record<string, unknown>;
	response?: string;
	reasoning?: string;
}

// JSON Schema for structured agent responses
const RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		action: {
			type: 'string',
			enum: ['tool_call', 'final_response'],
			description: 'Whether to call a tool or provide a final response'
		},
		tool_name: {
			type: 'string',
			description: 'Name of the tool to call (if action is tool_call)'
		},
		tool_arguments: {
			type: 'object',
			description: 'Arguments to pass to the tool (if action is tool_call)'
		},
		response: {
			type: 'string',
			description: 'Final response to the user (if action is final_response)'
		},
		reasoning: {
			type: 'string',
			description: 'Brief explanation of the decision'
		}
	},
	required: ['action']
};

/**
 * Execute an agent with the given context.
 */
export async function executeAgent(
	ai: Ai,
	context: AgentContext,
	triggerContext?: string
): Promise<AgentExecutionResult> {
	const steps: AgentStep[] = [];
	let tokensUsed = 0;

	// Initialize Notion client
	const notionClient = new NotionClient({ accessToken: context.accessToken });

	// Pre-fetch schemas to eliminate errors from unknown property names
	const schemaInfo = await prefetchSchemas(notionClient, context.allowedDatabases);

	// Build messages with schema included
	const systemMessage = buildSystemPrompt(context.agentName, context.allowedDatabases);
	const userMessage = buildUserPrompt(context.userMessage, triggerContext) + schemaInfo;

	const messages: AgentMessage[] = [
		{ role: 'system', content: systemMessage },
		{ role: 'user', content: userMessage }
	];

	steps.push({
		type: 'thinking',
		content: `Starting agent "${context.agentName}"`,
		timestamp: new Date()
	});

	// Build tool descriptions for the system prompt
	const toolDescriptions = NOTION_TOOLS.map(t => 
		`- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`
	).join('\n');

	// Enhanced system message with tool instructions
	const enhancedSystemMessage = `${systemMessage}

## Available Tools
${toolDescriptions}

## Response Format
You MUST respond with a JSON object with this structure:
- If you need to call a tool: {"action": "tool_call", "tool_name": "<name>", "tool_arguments": {...}, "reasoning": "why"}
- If you have a final answer: {"action": "final_response", "response": "your answer", "reasoning": "why"}

Always respond with valid JSON only. No markdown, no explanation outside the JSON.`;

	messages[0].content = enhancedSystemMessage;

	try {
		// Agent loop with JSON Mode
		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			// Call Workers AI with JSON Mode
			const response = await ai.run(MODEL, {
				messages: messages.map(m => ({
					role: m.role === 'tool' ? 'user' : m.role,
					content: m.content
				})),
				response_format: {
					type: 'json_schema',
					json_schema: RESPONSE_SCHEMA
				}
			}) as AIResponse;

			// Track token usage (estimate based on message length)
			tokensUsed += estimateTokens(messages);

			// Parse the structured response
			let structured: StructuredResponse;
			try {
				if (typeof response.response === 'string') {
					structured = JSON.parse(response.response);
				} else if (response.response && typeof response.response === 'object') {
					structured = response.response as StructuredResponse;
				} else {
					throw new Error('No response from model');
				}
			} catch (parseError) {
				// If JSON parsing fails, treat as final response
				structured = {
					action: 'final_response',
					response: typeof response.response === 'string' 
						? response.response 
						: 'Agent completed without a structured response.'
				};
			}

			// Handle tool call
			if (structured.action === 'tool_call' && structured.tool_name) {
				const toolName = structured.tool_name;
				const toolParams = structured.tool_arguments || {};

				steps.push({
					type: 'tool_call',
					content: `Calling tool: ${toolName} - ${structured.reasoning || ''}`,
					toolName,
					toolParams,
					timestamp: new Date()
				});

				// Execute the tool
				const result = await executeTool(
					notionClient,
					toolName,
					toolParams as Record<string, string>,
					context.allowedDatabases
				);

				const formattedResult = formatToolResult(toolName, result);

				steps.push({
					type: 'tool_result',
					content: formattedResult,
					toolName,
					toolResult: result.data,
					timestamp: new Date()
				});

				// Add tool interaction to messages for context
				messages.push({
					role: 'assistant',
					content: JSON.stringify(structured)
				});
				messages.push({
					role: 'user',
					content: `Tool result for ${toolName}: ${JSON.stringify(result)}\n\nContinue with the next step or provide a final response.`
				});

				// Continue the loop to process the tool results
				continue;
			}

			// Final response
			const finalResponse = structured.response || 'Agent completed without a response.';

			steps.push({
				type: 'response',
				content: finalResponse,
				timestamp: new Date()
			});

			return {
				success: true,
				response: finalResponse,
				steps,
				tokensUsed
			};
		}

		// Max iterations reached
		return {
			success: false,
			response: 'Agent reached maximum iteration limit',
			steps,
			tokensUsed,
			error: 'MAX_ITERATIONS_REACHED'
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		steps.push({
			type: 'response',
			content: `Error: ${errorMessage}`,
			timestamp: new Date()
		});

		return {
			success: false,
			response: `Agent execution failed: ${errorMessage}`,
			steps,
			tokensUsed,
			error: errorMessage
		};
	}
}

/**
 * Estimate token count from messages (rough approximation).
 */
function estimateTokens(messages: AgentMessage[]): number {
	const text = messages.map(m => m.content).join(' ');
	// Rough estimate: ~4 characters per token
	return Math.ceil(text.length / 4);
}

/**
 * Execute an agent with streaming callbacks for real-time updates.
 */
export async function executeAgentWithStreaming(
	ai: Ai,
	context: AgentContext,
	onStep: (step: AgentStep) => void,
	triggerContext?: string
): Promise<AgentExecutionResult> {
	const steps: AgentStep[] = [];
	let tokensUsed = 0;

	const emitStep = (step: AgentStep) => {
		steps.push(step);
		onStep(step);
	};

	// Initialize Notion client
	const notionClient = new NotionClient({ accessToken: context.accessToken });

	emitStep({
		type: 'thinking',
		content: 'Loading database schemas...',
		timestamp: new Date()
	});

	// Pre-fetch schemas to eliminate errors from unknown property names
	const schemaInfo = await prefetchSchemas(notionClient, context.allowedDatabases);

	// Build messages with schema included
	const systemMessage = buildSystemPrompt(context.agentName, context.allowedDatabases);
	const userMessage = buildUserPrompt(context.userMessage, triggerContext) + schemaInfo;

	const messages: AgentMessage[] = [
		{ role: 'system', content: systemMessage },
		{ role: 'user', content: userMessage }
	];

	emitStep({
		type: 'thinking',
		content: `Starting agent "${context.agentName}"`,
		timestamp: new Date()
	});

	// Build tool descriptions for the system prompt
	const toolDescriptions = NOTION_TOOLS.map(t => 
		`- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`
	).join('\n');

	const enhancedSystemMessage = `${systemMessage}

## Available Tools
${toolDescriptions}

## Response Format
You MUST respond with a JSON object with this structure:
- If you need to call a tool: {"action": "tool_call", "tool_name": "<name>", "tool_arguments": {...}, "reasoning": "why"}
- If you have a final answer: {"action": "final_response", "response": "your answer", "reasoning": "why"}

Always respond with valid JSON only. No markdown, no explanation outside the JSON.`;

	messages[0].content = enhancedSystemMessage;

	try {
		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			emitStep({
				type: 'thinking',
				content: `Thinking... (step ${iteration + 1})`,
				timestamp: new Date()
			});

			const response = await ai.run(MODEL, {
				messages: messages.map(m => ({
					role: m.role === 'tool' ? 'user' : m.role,
					content: m.content
				})),
				response_format: {
					type: 'json_schema',
					json_schema: RESPONSE_SCHEMA
				}
			}) as AIResponse;

			tokensUsed += estimateTokens(messages);

			let structured: StructuredResponse;
			try {
				if (typeof response.response === 'string') {
					structured = JSON.parse(response.response);
				} else if (response.response && typeof response.response === 'object') {
					structured = response.response as StructuredResponse;
				} else {
					throw new Error('No response from model');
				}
			} catch {
				structured = {
					action: 'final_response',
					response: typeof response.response === 'string' 
						? response.response 
						: 'Agent completed without a structured response.'
				};
			}

			if (structured.action === 'tool_call' && structured.tool_name) {
				const toolName = structured.tool_name;
				const toolParams = structured.tool_arguments || {};

				emitStep({
					type: 'tool_call',
					content: `${toolName}: ${structured.reasoning || 'executing...'}`,
					toolName,
					toolParams,
					timestamp: new Date()
				});

				const result = await executeTool(
					notionClient,
					toolName,
					toolParams as Record<string, string>,
					context.allowedDatabases
				);

				const formattedResult = formatToolResult(toolName, result);

				emitStep({
					type: 'tool_result',
					content: formattedResult,
					toolName,
					toolResult: result.data,
					timestamp: new Date()
				});

				messages.push({
					role: 'assistant',
					content: JSON.stringify(structured)
				});
				messages.push({
					role: 'user',
					content: `Tool result for ${toolName}: ${JSON.stringify(result)}\n\nContinue with the next step or provide a final response.`
				});

				continue;
			}

			const finalResponse = structured.response || 'Agent completed without a response.';

			emitStep({
				type: 'response',
				content: finalResponse,
				timestamp: new Date()
			});

			return {
				success: true,
				response: finalResponse,
				steps,
				tokensUsed
			};
		}

		return {
			success: false,
			response: 'Agent reached maximum iteration limit',
			steps,
			tokensUsed,
			error: 'MAX_ITERATIONS_REACHED'
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		emitStep({
			type: 'response',
			content: `Error: ${errorMessage}`,
			timestamp: new Date()
		});

		return {
			success: false,
			response: `Agent execution failed: ${errorMessage}`,
			steps,
			tokensUsed,
			error: errorMessage
		};
	}
}

/**
 * Create a lightweight execution for testing/preview.
 */
export async function previewAgent(
	context: AgentContext
): Promise<{ systemPrompt: string; userPrompt: string; tools: string[] }> {
	return {
		systemPrompt: buildSystemPrompt(context.agentName, context.allowedDatabases),
		userPrompt: buildUserPrompt(context.userMessage),
		tools: NOTION_TOOLS.map(t => t.name)
	};
}
