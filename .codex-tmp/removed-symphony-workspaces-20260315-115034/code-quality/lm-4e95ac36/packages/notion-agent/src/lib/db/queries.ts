/**
 * Database Queries for Notion Agent
 * 
 * All D1 database operations.
 */

import type { User, Agent, Execution, AuditLog, AgentWithExecutions } from './types.js';

// =============================================================================
// USER QUERIES
// =============================================================================

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
	return db.prepare(`
		SELECT * FROM users WHERE id = ?
	`).bind(id).first<User>();
}

export async function getUserByWorkspaceId(db: D1Database, workspaceId: string): Promise<User | null> {
	return db.prepare(`
		SELECT * FROM users WHERE notion_workspace_id = ?
	`).bind(workspaceId).first<User>();
}

export async function createUser(db: D1Database, user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
	const now = new Date().toISOString();
	await db.prepare(`
		INSERT INTO users (id, notion_workspace_id, notion_workspace_name, notion_access_token, notion_bot_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`).bind(
		user.id,
		user.notion_workspace_id,
		user.notion_workspace_name,
		user.notion_access_token,
		user.notion_bot_id,
		now,
		now
	).run();

	return { ...user, created_at: now, updated_at: now };
}

export async function updateUserToken(db: D1Database, id: string, token: string): Promise<void> {
	await db.prepare(`
		UPDATE users SET notion_access_token = ?, updated_at = ? WHERE id = ?
	`).bind(token, new Date().toISOString(), id).run();
}

// =============================================================================
// AGENT QUERIES
// =============================================================================

export async function getAgentsByUserId(db: D1Database, userId: string): Promise<Agent[]> {
	const result = await db.prepare(`
		SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC
	`).bind(userId).all<Agent>();
	return result.results;
}

export async function getAgentById(db: D1Database, id: string): Promise<Agent | null> {
	return db.prepare(`
		SELECT * FROM agents WHERE id = ?
	`).bind(id).first<Agent>();
}

export async function getAgentWithLastExecution(db: D1Database, id: string): Promise<AgentWithExecutions | null> {
	const agent = await getAgentById(db, id);
	if (!agent) return null;

	const lastExecution = await db.prepare(`
		SELECT * FROM executions WHERE agent_id = ? ORDER BY started_at DESC LIMIT 1
	`).bind(id).first<Execution>();

	const countResult = await db.prepare(`
		SELECT COUNT(*) as count FROM executions WHERE agent_id = ?
	`).bind(id).first<{ count: number }>();

	return {
		...agent,
		last_execution: lastExecution ?? undefined,
		execution_count: countResult?.count ?? 0
	};
}

export async function createAgent(db: D1Database, agent: Omit<Agent, 'created_at' | 'updated_at'>): Promise<Agent> {
	const now = new Date().toISOString();
	await db.prepare(`
		INSERT INTO agents (id, user_id, name, description, user_message, databases, schedule, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		agent.id,
		agent.user_id,
		agent.name,
		agent.description,
		agent.user_message,
		agent.databases,
		agent.schedule,
		agent.enabled,
		now,
		now
	).run();

	return { ...agent, created_at: now, updated_at: now };
}

export async function updateAgent(
	db: D1Database,
	id: string,
	updates: Partial<Pick<Agent, 'name' | 'description' | 'user_message' | 'databases' | 'schedule' | 'enabled'>>
): Promise<void> {
	const fields: string[] = [];
	const values: unknown[] = [];

	if (updates.name !== undefined) {
		fields.push('name = ?');
		values.push(updates.name);
	}
	if (updates.description !== undefined) {
		fields.push('description = ?');
		values.push(updates.description);
	}
	if (updates.user_message !== undefined) {
		fields.push('user_message = ?');
		values.push(updates.user_message);
	}
	if (updates.databases !== undefined) {
		fields.push('databases = ?');
		values.push(updates.databases);
	}
	if (updates.schedule !== undefined) {
		fields.push('schedule = ?');
		values.push(updates.schedule);
	}
	if (updates.enabled !== undefined) {
		fields.push('enabled = ?');
		values.push(updates.enabled);
	}

	if (fields.length === 0) return;

	fields.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(id);

	await db.prepare(`
		UPDATE agents SET ${fields.join(', ')} WHERE id = ?
	`).bind(...values).run();
}

export async function deleteAgent(db: D1Database, id: string): Promise<void> {
	await db.prepare(`DELETE FROM agents WHERE id = ?`).bind(id).run();
}

export async function getScheduledAgents(db: D1Database): Promise<Agent[]> {
	const result = await db.prepare(`
		SELECT * FROM agents WHERE schedule IS NOT NULL AND enabled = 1
	`).all<Agent>();
	return result.results;
}

// =============================================================================
// EXECUTION QUERIES
// =============================================================================

export async function getExecutionsByAgentId(
	db: D1Database,
	agentId: string,
	limit = 50
): Promise<Execution[]> {
	const result = await db.prepare(`
		SELECT * FROM executions WHERE agent_id = ? ORDER BY started_at DESC LIMIT ?
	`).bind(agentId, limit).all<Execution>();
	return result.results;
}

export async function getExecutionById(db: D1Database, id: string): Promise<Execution | null> {
	return db.prepare(`
		SELECT * FROM executions WHERE id = ?
	`).bind(id).first<Execution>();
}

export async function createExecution(
	db: D1Database,
	execution: Omit<Execution, 'completed_at'>
): Promise<Execution> {
	await db.prepare(`
		INSERT INTO executions (id, agent_id, trigger_type, status, input, output, error, tokens_used, started_at, completed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
	`).bind(
		execution.id,
		execution.agent_id,
		execution.trigger_type,
		execution.status,
		execution.input,
		execution.output,
		execution.error,
		execution.tokens_used,
		execution.started_at
	).run();

	return { ...execution, completed_at: null };
}

export async function updateExecution(
	db: D1Database,
	id: string,
	updates: Partial<Pick<Execution, 'status' | 'output' | 'error' | 'tokens_used' | 'completed_at'>>
): Promise<void> {
	const fields: string[] = [];
	const values: unknown[] = [];

	if (updates.status !== undefined) {
		fields.push('status = ?');
		values.push(updates.status);
	}
	if (updates.output !== undefined) {
		fields.push('output = ?');
		values.push(updates.output);
	}
	if (updates.error !== undefined) {
		fields.push('error = ?');
		values.push(updates.error);
	}
	if (updates.tokens_used !== undefined) {
		fields.push('tokens_used = ?');
		values.push(updates.tokens_used);
	}
	if (updates.completed_at !== undefined) {
		fields.push('completed_at = ?');
		values.push(updates.completed_at);
	}

	if (fields.length === 0) return;

	values.push(id);

	await db.prepare(`
		UPDATE executions SET ${fields.join(', ')} WHERE id = ?
	`).bind(...values).run();
}

// =============================================================================
// AUDIT LOG QUERIES
// =============================================================================

export async function createAuditLog(
	db: D1Database,
	log: Omit<AuditLog, 'created_at'>
): Promise<void> {
	await db.prepare(`
		INSERT INTO audit_logs (id, user_id, agent_id, action, details, ip_address, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`).bind(
		log.id,
		log.user_id,
		log.agent_id,
		log.action,
		log.details,
		log.ip_address,
		new Date().toISOString()
	).run();
}

export async function getAuditLogsByUserId(
	db: D1Database,
	userId: string,
	limit = 100
): Promise<AuditLog[]> {
	const result = await db.prepare(`
		SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
	`).bind(userId, limit).all<AuditLog>();
	return result.results;
}
