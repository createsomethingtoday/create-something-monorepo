/**
 * Filtering Component Types
 *
 * Generic types for filterable product grids.
 * Used by FilterableGrid and related components.
 */

export interface FilterableProduct {
	id: string;
	name: string;
	category: string;
	materials: string[];
	dimensions?: {
		width: number;
		depth: number;
		height: number;
	};
	price: number; // cents
	status: string;
	image_url: string;
}

export interface FilterState {
	materials?: string[];
	categories?: string[];
	statuses?: string[];
	priceMin?: number;
	priceMax?: number;
	searchQuery?: string;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}

export interface FilterConfig {
	materials: string[];
	categories: Array<{ key: string; label: string }>;
	statuses: Array<{ key: string; label: string }>;
	priceRange: { min: number; max: number; step: number };
}

export interface AgentStep {
	type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
	content: string;
	toolName?: string;
	toolParams?: Record<string, unknown>;
	timestamp: string;
}

export interface FilterResult {
	success: boolean;
	products: FilterableProduct[];
	filterState: FilterState;
	explanation: string;
}

/**
 * Default filter configuration for furniture catalogs
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
	materials: ['Wood', 'Stone', 'Metal', 'Fabric', 'Leather', 'Glass'],
	categories: [
		{ key: 'seating', label: 'Seating' },
		{ key: 'tables', label: 'Tables' },
		{ key: 'storage', label: 'Storage' },
		{ key: 'lighting', label: 'Lighting' }
	],
	statuses: [
		{ key: 'in_stock', label: 'In Stock' },
		{ key: 'pre_order', label: 'Pre-order' }
	],
	priceRange: { min: 500, max: 2500, step: 100 }
};

/**
 * Material groupings for smart matching
 */
export const MATERIAL_GROUPS: Record<string, string[]> = {
	Wood: ['Wood', 'Oak', 'Walnut', 'Birch', 'Teak'],
	Stone: ['Stone', 'Marble', 'Granite'],
	Metal: ['Metal', 'Brass', 'Steel', 'Iron', 'Aluminum'],
	Fabric: ['Fabric', 'Cotton', 'Linen', 'Velvet'],
	Leather: ['Leather'],
	Glass: ['Glass']
};
