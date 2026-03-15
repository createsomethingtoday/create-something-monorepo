/**
 * Database Types for Notion Agent
 * 
 * Core type definitions for D1 database entities.
 */

export interface User {
	id: string;
	notion_workspace_id: string;
	notion_workspace_name: string;
	notion_access_token: string; // encrypted
	notion_bot_id: string;
	created_at: string;
	updated_at: string;
}

export interface Agent {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	user_message: string; // The user's configurable prompt
	databases: string; // JSON array of allowed database IDs
	schedule: string | null; // Cron expression
	enabled: number; // SQLite boolean (0 or 1)
	created_at: string;
	updated_at: string;
}

export interface Execution {
	id: string;
	agent_id: string;
	trigger_type: 'manual' | 'scheduled' | 'webhook';
	status: 'pending' | 'running' | 'completed' | 'failed';
	input: string | null; // JSON
	output: string | null; // JSON
	error: string | null;
	tokens_used: number | null;
	started_at: string;
	completed_at: string | null;
}

export interface AuditLog {
	id: string;
	user_id: string;
	agent_id: string | null;
	action: string;
	details: string | null; // JSON
	ip_address: string | null;
	created_at: string;
}

// API response types
export interface AgentWithExecutions extends Agent {
	last_execution?: Execution;
	execution_count?: number;
}

export interface UserWithAgents extends User {
	agents: Agent[];
}

// Notion API types
export interface NotionDatabase {
	id: string;
	title: string;
	description: string | null;
	icon: string | null;
	url: string;
}

export interface NotionWorkspace {
	id: string;
	name: string;
	icon: string | null;
}
