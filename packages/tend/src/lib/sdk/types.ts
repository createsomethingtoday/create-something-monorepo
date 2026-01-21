/**
 * TEND SDK Types
 *
 * Core type definitions for the AI-native database service.
 * These types power both the Database (standalone) and Enterprise tiers.
 */

// =============================================================================
// DATA MODELS
// =============================================================================

/**
 * A unified data item from any source.
 * This is the core primitive — everything flows through items.
 */
export interface DataItem {
	id: string;
	tenantId: string;
	sourceId: string;

	// Core fields
	title: string;
	body?: string;
	sourceType: string;
	sourceItemId?: string;

	// Timestamps
	sourceTimestamp?: Date;
	ingestedAt: Date;

	// Flexible metadata (source-specific)
	metadata: Record<string, unknown>;

	// Scoring
	score: number; // 0.0 to 1.0
	scoreBreakdown: Record<string, number>; // Explainability

	// Curation state
	status: ItemStatus;
	curatedBy?: string;
	curatedAt?: Date;
	snoozeUntil?: Date;
}

export type ItemStatus = 'inbox' | 'approved' | 'dismissed' | 'snoozed' | 'archived';

/**
 * A data source (integration connection).
 */
export interface Source {
	id: string;
	tenantId: string;
	type: SourceType;
	name: string;
	status: SourceStatus;
	config: Record<string, unknown>;
	lastSyncAt?: Date;
}

export type SourceType = 'gmail' | 'slack' | 'quickbooks' | 'stripe' | 'notion' | 'calendar' | 'demo';
export type SourceStatus = 'active' | 'paused' | 'error' | 'demo';

/**
 * A tenant (workspace).
 */
export interface Tenant {
	id: string;
	name: string;
	slug: string;
	tier: TenantTier;
	settings: Record<string, unknown>;
}

export type TenantTier = 'demo' | 'database' | 'enterprise';

// =============================================================================
// AUTOMATION SDK
// =============================================================================

/**
 * Context provided to automation functions.
 */
export interface AutomationContext {
	tenant: Tenant;
	source: Source;

	// User-defined context (VIP lists, categories, etc.)
	vipSenders: string[];
	categories: string[];
	customData: Record<string, unknown>;
}

/**
 * Transform function: converts raw source data to a DataItem.
 */
export type TransformFunction<T = unknown> = (raw: T) => Omit<DataItem, 'id' | 'tenantId' | 'sourceId' | 'ingestedAt' | 'status'>;

/**
 * Score function: computes relevance score for an item.
 */
export type ScoreFunction = (item: DataItem, context: AutomationContext) => number;

/**
 * Filter function: determines if an item should be included.
 */
export type FilterFunction = (item: DataItem, context: AutomationContext) => boolean;

/**
 * Notify function: determines if human should be notified.
 */
export type NotifyFunction = (item: DataItem, context: AutomationContext) => boolean;

/**
 * Automation definition.
 */
export interface AutomationDefinition<T = unknown> {
	name: string;
	description?: string;
	source: SourceType | SourceType[];

	// Processing pipeline
	transform?: TransformFunction<T>;
	filter?: FilterFunction;
	score?: ScoreFunction;
	notify?: NotifyFunction;

	// Scheduling
	schedule?: string; // Cron expression
}

// =============================================================================
// AGENT SDK (Enterprise only)
// =============================================================================

/**
 * Agent trigger function: determines when agent should run.
 */
export type AgentTriggerFunction = (item: DataItem, context: AutomationContext) => boolean;

/**
 * Agent tool definition.
 */
export interface AgentTool {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	execute: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

/**
 * Agent context (extended for reasoning).
 */
export interface AgentContext extends AutomationContext {
	executionId: string;
	triggeredBy: DataItem;

	// Tool access
	tools: Map<string, AgentTool>;

	// Logging
	log: (step: string) => void;
}

/**
 * Agent output configuration.
 */
export interface AgentOutput {
	requiresApproval: boolean;
	actions: string[];
}

/**
 * Agent definition (Enterprise only).
 */
export interface AgentDefinition {
	name: string;
	description?: string;

	// Trigger
	trigger: AgentTriggerFunction;

	// Capabilities
	tools: string[];
	task: string; // The reasoning prompt

	// Output
	output: AgentOutput;

	// Scheduling (optional)
	schedule?: string; // Cron expression
	spawns?: string[]; // Other agents this can spawn
}

/**
 * Agent execution record.
 */
export interface AgentExecution {
	id: string;
	agentName: string;
	triggeredBy: DataItem;

	// State
	status: AgentExecutionStatus;
	steps: AgentStep[];
	toolCalls: ToolCall[];

	// Output
	result?: unknown;
	proposedActions: ProposedAction[];

	// Review
	reviewedBy?: string;
	reviewedAt?: Date;
	reviewNotes?: string;

	// Timing
	startedAt: Date;
	completedAt?: Date;
}

export type AgentExecutionStatus =
	| 'thinking'
	| 'awaiting_approval'
	| 'approved'
	| 'rejected'
	| 'completed'
	| 'failed';

export interface AgentStep {
	timestamp: Date;
	type: 'thought' | 'action' | 'observation';
	content: string;
}

export interface ToolCall {
	timestamp: Date;
	tool: string;
	params: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

export interface ProposedAction {
	type: string;
	description: string;
	params: Record<string, unknown>;
	approved?: boolean;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Pagination parameters.
 */
export interface PaginationParams {
	limit?: number;
	offset?: number;
	cursor?: string;
}

/**
 * Item query parameters.
 */
export interface ItemQuery extends PaginationParams {
	tenantId: string;
	status?: ItemStatus | ItemStatus[];
	sourceType?: SourceType | SourceType[];
	minScore?: number;
	maxScore?: number;
	search?: string;
	sortBy?: 'score' | 'sourceTimestamp' | 'ingestedAt';
	sortOrder?: 'asc' | 'desc';
}

/**
 * Curation action.
 */
export interface CurationAction {
	itemId: string;
	action: 'approve' | 'dismiss' | 'snooze' | 'archive' | 'restore';
	snoozeUntil?: Date;
	notes?: string;
}
