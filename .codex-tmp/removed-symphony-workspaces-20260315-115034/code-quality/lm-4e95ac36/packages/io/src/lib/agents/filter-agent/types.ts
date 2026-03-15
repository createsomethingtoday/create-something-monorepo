/**
 * Filter Agent Types
 *
 * Types for the AI-native filtering experiment.
 * Agent interprets natural language and calls filter tools.
 */

export interface Product {
	id: string;
	name: string;
	category: 'seating' | 'tables' | 'storage' | 'lighting';
	materials: string[];
	dimensions: {
		width: number;
		depth: number;
		height: number;
	};
	price: number; // cents
	status: 'in_stock' | 'pre_order' | 'out_of_stock';
	image_url: string;
}

export interface FilterState {
	materials?: string[];
	categories?: string[];
	statuses?: string[];
	priceMin?: number;
	priceMax?: number;
	searchQuery?: string;
	sortBy?: 'price' | 'name';
	sortOrder?: 'asc' | 'desc';
}

export interface AgentStep {
	type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
	content: string;
	toolName?: string;
	toolParams?: Record<string, unknown>;
	toolResult?: unknown;
	timestamp: Date;
}

export interface AgentMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
}

export interface FilterResult {
	success: boolean;
	products: Product[];
	filterState: FilterState;
	explanation: string;
	steps: AgentStep[];
	tokensUsed: number;
	error?: string;
}

export interface StructuredResponse {
	action: 'tool_call' | 'final_response';
	tool_name?: string;
	tool_arguments?: Record<string, unknown>;
	response?: string;
	reasoning?: string;
	filter_state?: FilterState;
	matching_product_ids?: string[];
}

// Tool definitions for the filter agent
export interface FilterTool {
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export const FILTER_TOOLS: FilterTool[] = [
	{
		name: 'filter_by_material',
		description: 'Filter products by material type. Materials include: Wood (Oak, Walnut), Metal, Brass, Stone, Fabric, Leather, Glass.',
		parameters: {
			type: 'object',
			properties: {
				materials: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of material names to include (e.g., ["Wood", "Brass"])'
				}
			},
			required: ['materials']
		}
	},
	{
		name: 'filter_by_category',
		description: 'Filter products by furniture category. Categories: seating (chairs, lounges), tables (side tables, coffee tables, console tables), storage (cabinets, shelves), lighting (lamps, pendants).',
		parameters: {
			type: 'object',
			properties: {
				categories: {
					type: 'array',
					items: { type: 'string', enum: ['seating', 'tables', 'storage', 'lighting'] },
					description: 'Array of category names'
				}
			},
			required: ['categories']
		}
	},
	{
		name: 'filter_by_price_range',
		description: 'Filter products by price range. Prices in the catalog range from $850 to $2,450.',
		parameters: {
			type: 'object',
			properties: {
				min_price: {
					type: 'number',
					description: 'Minimum price in dollars (e.g., 1000 for $1,000)'
				},
				max_price: {
					type: 'number',
					description: 'Maximum price in dollars (e.g., 2000 for $2,000)'
				}
			}
		}
	},
	{
		name: 'filter_by_status',
		description: 'Filter products by availability status.',
		parameters: {
			type: 'object',
			properties: {
				statuses: {
					type: 'array',
					items: { type: 'string', enum: ['in_stock', 'pre_order'] },
					description: 'Array of status values to include'
				}
			},
			required: ['statuses']
		}
	},
	{
		name: 'search_by_name',
		description: 'Search products by name. Use for specific product names like "Mantis Chair" or partial matches like "Table".',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Search query to match against product names'
				}
			},
			required: ['query']
		}
	},
	{
		name: 'sort_results',
		description: 'Sort the filtered results by price or name.',
		parameters: {
			type: 'object',
			properties: {
				by: {
					type: 'string',
					enum: ['price', 'name'],
					description: 'Field to sort by'
				},
				order: {
					type: 'string',
					enum: ['asc', 'desc'],
					description: 'Sort order (ascending or descending)'
				}
			},
			required: ['by', 'order']
		}
	},
	{
		name: 'clear_filters',
		description: 'Clear all filters and show all products.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},
	{
		name: 'final_response',
		description: 'Return the final filtered results to the user. Call this when you have applied all necessary filters.',
		parameters: {
			type: 'object',
			properties: {
				explanation: {
					type: 'string',
					description: 'Brief explanation of what filters were applied and why'
				}
			},
			required: ['explanation']
		}
	}
];

// JSON Schema for Workers AI structured response
export const FILTER_RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		action: {
			type: 'string',
			enum: ['tool_call', 'final_response'],
			description: 'Whether to call a tool or provide final results'
		},
		tool_name: {
			type: 'string',
			description: 'Name of the tool to call (if action is tool_call)'
		},
		tool_arguments: {
			type: 'object',
			description: 'Arguments to pass to the tool (if action is tool_call)'
		},
		reasoning: {
			type: 'string',
			description: 'Brief explanation of the decision'
		}
	},
	required: ['action', 'reasoning']
};
