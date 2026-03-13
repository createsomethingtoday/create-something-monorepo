/**
 * Filter Agent Executor
 *
 * Executes the filter agent using Workers AI with JSON schema mode.
 * Interprets natural language queries and applies appropriate filters.
 */

import type {
	Product,
	FilterState,
	AgentStep,
	AgentMessage,
	FilterResult,
	StructuredResponse
} from './types.js';
import { FILTER_TOOLS, FILTER_RESPONSE_SCHEMA } from './types.js';

const MAX_ITERATIONS = 5;
// Use Llama 3.3 70B for best reasoning, or fallback to 8B for speed
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as const;

interface AIResponse {
	response?: string | StructuredResponse;
}

/**
 * Build the system prompt for the filter agent.
 */
function buildSystemPrompt(products: Product[]): string {
	// Build a summary of available products for context
	const categoryCounts = products.reduce(
		(acc, p) => {
			acc[p.category] = (acc[p.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const materialSet = new Set<string>();
	products.forEach((p) => p.materials.forEach((m) => materialSet.add(m)));

	const priceRange = {
		min: Math.min(...products.map((p) => p.price)) / 100,
		max: Math.max(...products.map((p) => p.price)) / 100
	};

	const toolDescriptions = FILTER_TOOLS.map(
		(t) => `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`
	).join('\n');

	return `You are a helpful furniture catalog assistant for FNJI Collection. Your job is to help users find furniture by interpreting their natural language queries and applying appropriate filters.

## Catalog Overview
- Total products: ${products.length}
- Categories: ${Object.entries(categoryCounts)
		.map(([k, v]) => `${k} (${v})`)
		.join(', ')}
- Materials available: ${Array.from(materialSet).join(', ')}
- Price range: $${priceRange.min.toLocaleString()} - $${priceRange.max.toLocaleString()}

## Available Tools
${toolDescriptions}

## Instructions
1. Analyze the user's query to understand what they're looking for
2. Call the appropriate filter tools to narrow down the results
3. You can call multiple tools in sequence to combine filters
4. When you've applied all necessary filters, call final_response with an explanation
5. Be helpful - if a query is ambiguous, make reasonable assumptions (e.g., "chairs" → category: seating)
6. Consider price implications: "affordable" might mean under $1,500, "premium" might mean $2,000+

## Response Format
You MUST respond with a JSON object:
- To call a tool: {"action": "tool_call", "tool_name": "<name>", "tool_arguments": {...}, "reasoning": "why"}
- To finish: {"action": "final_response", "reasoning": "summary of filters applied"}

Always respond with valid JSON only.`;
}

/**
 * Execute a filter tool and update the filter state.
 */
function executeTool(
	toolName: string,
	toolArgs: Record<string, unknown>,
	currentState: FilterState,
	allProducts: Product[]
): { newState: FilterState; result: string } {
	let newState = { ...currentState };
	let result = '';

	switch (toolName) {
		case 'filter_by_material': {
			const materials = toolArgs.materials as string[];
			newState.materials = materials;
			result = `Filtering by materials: ${materials.join(', ')}`;
			break;
		}
		case 'filter_by_category': {
			const categories = toolArgs.categories as string[];
			newState.categories = categories;
			result = `Filtering by categories: ${categories.join(', ')}`;
			break;
		}
		case 'filter_by_price_range': {
			const minPrice = toolArgs.min_price as number | undefined;
			const maxPrice = toolArgs.max_price as number | undefined;
			if (minPrice !== undefined) newState.priceMin = minPrice * 100; // Convert to cents
			if (maxPrice !== undefined) newState.priceMax = maxPrice * 100;
			result = `Filtering by price: ${minPrice ? `$${minPrice}` : 'any'} - ${maxPrice ? `$${maxPrice}` : 'any'}`;
			break;
		}
		case 'filter_by_status': {
			const statuses = toolArgs.statuses as string[];
			newState.statuses = statuses;
			result = `Filtering by status: ${statuses.join(', ')}`;
			break;
		}
		case 'search_by_name': {
			const query = toolArgs.query as string;
			newState.searchQuery = query;
			result = `Searching for: "${query}"`;
			break;
		}
		case 'sort_results': {
			const by = toolArgs.by as 'price' | 'name';
			const order = toolArgs.order as 'asc' | 'desc';
			newState.sortBy = by;
			newState.sortOrder = order;
			result = `Sorting by ${by} (${order})`;
			break;
		}
		case 'clear_filters': {
			newState = {};
			result = 'Cleared all filters';
			break;
		}
		case 'final_response': {
			result = 'Returning filtered results';
			break;
		}
		default:
			result = `Unknown tool: ${toolName}`;
	}

	// Calculate how many products match
	const filteredCount = applyFilters(allProducts, newState).length;
	result += ` (${filteredCount} products match)`;

	return { newState, result };
}

/**
 * Apply filter state to products.
 */
export function applyFilters(products: Product[], state: FilterState): Product[] {
	let filtered = [...products];

	// Filter by materials
	if (state.materials && state.materials.length > 0) {
		const normalizedMaterials = state.materials.map((m) => m.toLowerCase());
		filtered = filtered.filter((p) =>
			p.materials.some((m) => normalizedMaterials.some((nm) => m.toLowerCase().includes(nm)))
		);
	}

	// Filter by categories
	if (state.categories && state.categories.length > 0) {
		filtered = filtered.filter((p) => state.categories!.includes(p.category));
	}

	// Filter by price
	if (state.priceMin !== undefined) {
		filtered = filtered.filter((p) => p.price >= state.priceMin!);
	}
	if (state.priceMax !== undefined) {
		filtered = filtered.filter((p) => p.price <= state.priceMax!);
	}

	// Filter by status
	if (state.statuses && state.statuses.length > 0) {
		filtered = filtered.filter((p) => state.statuses!.includes(p.status));
	}

	// Search by name
	if (state.searchQuery) {
		const query = state.searchQuery.toLowerCase();
		filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
	}

	// Sort
	if (state.sortBy) {
		filtered.sort((a, b) => {
			let comparison = 0;
			if (state.sortBy === 'price') {
				comparison = a.price - b.price;
			} else if (state.sortBy === 'name') {
				comparison = a.name.localeCompare(b.name);
			}
			return state.sortOrder === 'desc' ? -comparison : comparison;
		});
	}

	return filtered;
}

/**
 * Execute the filter agent with streaming callbacks.
 */
export async function executeFilterAgent(
	ai: Ai,
	query: string,
	products: Product[],
	onStep: (step: AgentStep) => void
): Promise<FilterResult> {
	const steps: AgentStep[] = [];
	let tokensUsed = 0;
	let filterState: FilterState = {};

	const emitStep = (step: AgentStep) => {
		steps.push(step);
		onStep(step);
	};

	emitStep({
		type: 'thinking',
		content: `Analyzing query: "${query}"`,
		timestamp: new Date()
	});

	const systemMessage = buildSystemPrompt(products);
	const messages: AgentMessage[] = [
		{ role: 'system', content: systemMessage },
		{ role: 'user', content: query }
	];

	try {
		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			emitStep({
				type: 'thinking',
				content: `Thinking... (step ${iteration + 1})`,
				timestamp: new Date()
			});

			const response = (await ai.run(MODEL, {
				messages: messages.map((m) => ({
					role: m.role === 'tool' ? 'user' : m.role,
					content: m.content
				})),
				response_format: {
					type: 'json_schema',
					json_schema: FILTER_RESPONSE_SCHEMA
				}
			})) as AIResponse;

			// Estimate tokens
			tokensUsed += messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);

			// Parse structured response
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
				// Default to final response if parsing fails
				structured = {
					action: 'final_response',
					reasoning: 'Unable to parse response, returning current results'
				};
			}

			// Handle tool call
			if (structured.action === 'tool_call' && structured.tool_name) {
				const toolName = structured.tool_name;
				const toolArgs = structured.tool_arguments || {};

				emitStep({
					type: 'tool_call',
					content: structured.reasoning || `Calling ${toolName}`,
					toolName,
					toolParams: toolArgs,
					timestamp: new Date()
				});

				// Execute the tool
				const { newState, result } = executeTool(toolName, toolArgs, filterState, products);
				filterState = newState;

				emitStep({
					type: 'tool_result',
					content: result,
					toolName,
					toolResult: { filterState: newState, matchCount: applyFilters(products, newState).length },
					timestamp: new Date()
				});

				// Add to conversation
				messages.push({
					role: 'assistant',
					content: JSON.stringify(structured)
				});
				messages.push({
					role: 'user',
					content: `Tool result: ${result}\n\nCurrent filter state: ${JSON.stringify(filterState)}\n\nContinue filtering or call final_response when done.`
				});

				continue;
			}

			// Final response
			const filteredProducts = applyFilters(products, filterState);
			const explanation =
				structured.reasoning || `Found ${filteredProducts.length} products matching your criteria.`;

			emitStep({
				type: 'response',
				content: explanation,
				timestamp: new Date()
			});

			return {
				success: true,
				products: filteredProducts,
				filterState,
				explanation,
				steps,
				tokensUsed
			};
		}

		// Max iterations
		const filteredProducts = applyFilters(products, filterState);
		return {
			success: true,
			products: filteredProducts,
			filterState,
			explanation: 'Applied available filters (reached iteration limit)',
			steps,
			tokensUsed
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
			products: [],
			filterState,
			explanation: `Agent failed: ${errorMessage}`,
			steps,
			tokensUsed,
			error: errorMessage
		};
	}
}

/**
 * Parse database row to Product type.
 */
export function parseProductFromDB(row: Record<string, unknown>): Product {
	return {
		id: row.id as string,
		name: row.name as string,
		category: row.category as Product['category'],
		materials: JSON.parse(row.materials as string) as string[],
		dimensions: {
			width: row.dimensions_width as number,
			depth: row.dimensions_depth as number,
			height: row.dimensions_height as number
		},
		price: row.price as number,
		status: row.status as Product['status'],
		image_url: row.image_url as string
	};
}
