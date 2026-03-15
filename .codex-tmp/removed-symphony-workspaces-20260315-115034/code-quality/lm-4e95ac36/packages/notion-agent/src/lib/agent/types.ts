/**
 * Agent Types
 * 
 * Type definitions for agent execution.
 */

export interface AgentMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_call_id?: string;
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface AgentStep {
	type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
	content: string;
	toolName?: string;
	toolParams?: Record<string, unknown>;
	toolResult?: unknown;
	timestamp: Date;
}

export interface AgentExecutionResult {
	success: boolean;
	response: string;
	steps: AgentStep[];
	tokensUsed: number;
	error?: string;
}

export interface AgentContext {
	userId: string;
	agentId: string;
	agentName: string;
	userMessage: string;
	allowedDatabases: string[];
	accessToken: string;
}
