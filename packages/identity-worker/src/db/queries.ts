/**
 * Database Queries
 *
 * Canon: The database disappears into the query.
 */

import type {
	User,
	RefreshToken,
	SigningKey,
	ApiKey,
	CrossDomainToken,
	McpAuthEvent,
	McpAccount,
	McpSession,
	McpSessionScope,
} from '../types';

// User queries
export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
	return db
		.prepare('SELECT * FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first<User>();
}

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
	return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function findUserByWorkwayId(db: D1Database, workwayId: string): Promise<User | null> {
	return db.prepare('SELECT * FROM users WHERE workway_id = ?').bind(workwayId).first<User>();
}

export async function createUser(
	db: D1Database,
	user: {
		id: string;
		email: string;
		password_hash: string;
		name?: string;
		source: User['source'];
	}
): Promise<User> {
	await db
		.prepare(
			`INSERT INTO users (id, email, password_hash, name, source)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(user.id, user.email.toLowerCase(), user.password_hash, user.name ?? null, user.source)
		.run();

	return (await findUserById(db, user.id))!;
}

export async function updateUser(
	db: D1Database,
	id: string,
	updates: Partial<Pick<User, 'name' | 'avatar_url' | 'email_verified' | 'tier' | 'analytics_opt_out'>>
): Promise<User | null> {
	const sets: string[] = [];
	const values: unknown[] = [];

	if (updates.name !== undefined) {
		sets.push('name = ?');
		values.push(updates.name);
	}
	if (updates.avatar_url !== undefined) {
		sets.push('avatar_url = ?');
		values.push(updates.avatar_url);
	}
	if (updates.email_verified !== undefined) {
		sets.push('email_verified = ?');
		values.push(updates.email_verified);
	}
	if (updates.tier !== undefined) {
		sets.push('tier = ?');
		values.push(updates.tier);
	}
	if (updates.analytics_opt_out !== undefined) {
		sets.push('analytics_opt_out = ?');
		values.push(updates.analytics_opt_out);
	}

	if (sets.length === 0) return findUserById(db, id);

	sets.push("updated_at = datetime('now')");
	values.push(id);

	await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

	return findUserById(db, id);
}

export async function updateUserPassword(
	db: D1Database,
	id: string,
	passwordHash: string
): Promise<boolean> {
	const result = await db
		.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(passwordHash, id)
		.run();
	return result.meta.changes > 0;
}

// Refresh token queries
export async function createRefreshToken(
	db: D1Database,
	token: {
		id: string;
		user_id: string;
		token_hash: string;
		family_id: string;
		expires_at: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(token.id, token.user_id, token.token_hash, token.family_id, token.expires_at)
		.run();
}

export async function findRefreshTokenByHash(
	db: D1Database,
	tokenHash: string
): Promise<RefreshToken | null> {
	return db
		.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL')
		.bind(tokenHash)
		.first<RefreshToken>();
}

export async function revokeRefreshToken(db: D1Database, id: string): Promise<void> {
	await db
		.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?")
		.bind(id)
		.run();
}

export async function revokeTokenFamily(db: D1Database, familyId: string): Promise<void> {
	await db
		.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE family_id = ?")
		.bind(familyId)
		.run();
}

export async function revokeAllUserTokens(db: D1Database, userId: string): Promise<void> {
	await db
		.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?")
		.bind(userId)
		.run();
}

export async function cleanExpiredTokens(db: D1Database): Promise<void> {
	await db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
}

// Signing key queries
export async function getActiveSigningKey(db: D1Database): Promise<SigningKey | null> {
	return db
		.prepare('SELECT * FROM signing_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1')
		.first<SigningKey>();
}

export async function getAllActivePublicKeys(db: D1Database): Promise<SigningKey[]> {
	const result = await db
		.prepare('SELECT id, public_key, algorithm FROM signing_keys WHERE active = 1')
		.all<SigningKey>();
	return result.results ?? [];
}

export async function createSigningKey(
	db: D1Database,
	key: {
		id: string;
		private_key: string;
		public_key: string;
		algorithm?: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO signing_keys (id, private_key, public_key, algorithm)
       VALUES (?, ?, ?, ?)`
		)
		.bind(key.id, key.private_key, key.public_key, key.algorithm ?? 'ES256')
		.run();
}

// API key queries
export async function findApiKeyByHash(db: D1Database, keyHash: string): Promise<ApiKey | null> {
	return db
		.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL')
		.bind(keyHash)
		.first<ApiKey>();
}

// Rate limiting
export async function checkRateLimit(
	db: D1Database,
	key: string,
	maxAttempts: number,
	windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
	const now = new Date();
	const windowStart = new Date(now.getTime() - windowSeconds * 1000);

	const record = await db
		.prepare('SELECT * FROM rate_limits WHERE key = ?')
		.bind(key)
		.first<{ key: string; count: number; window_start: string; blocked_until: string | null }>();

	// Check if blocked
	if (record?.blocked_until) {
		const blockedUntil = new Date(record.blocked_until);
		if (blockedUntil > now) {
			return { allowed: false, remaining: 0, resetAt: blockedUntil };
		}
	}

	// Check window
	if (record && new Date(record.window_start) > windowStart) {
		if (record.count >= maxAttempts) {
			// Block for the window duration
			const blockedUntil = new Date(now.getTime() + windowSeconds * 1000);
			await db
				.prepare('UPDATE rate_limits SET blocked_until = ? WHERE key = ?')
				.bind(blockedUntil.toISOString(), key)
				.run();
			return { allowed: false, remaining: 0, resetAt: blockedUntil };
		}
		return {
			allowed: true,
			remaining: maxAttempts - record.count,
			resetAt: new Date(new Date(record.window_start).getTime() + windowSeconds * 1000),
		};
	}

	// New window
	return {
		allowed: true,
		remaining: maxAttempts,
		resetAt: new Date(now.getTime() + windowSeconds * 1000),
	};
}

export async function incrementRateLimit(db: D1Database, key: string): Promise<void> {
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO rate_limits (key, count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE
           WHEN window_start < datetime('now', '-60 seconds') THEN 1
           ELSE count + 1
         END,
         window_start = CASE
           WHEN window_start < datetime('now', '-60 seconds') THEN ?
           ELSE window_start
         END,
         blocked_until = NULL`
		)
		.bind(key, now, now)
		.run();
}

// Email change request queries
export interface EmailChangeRequest {
	id: string;
	user_id: string;
	new_email: string;
	token_hash: string;
	expires_at: string;
	created_at: string;
}

export async function createEmailChangeRequest(
	db: D1Database,
	request: {
		id: string;
		user_id: string;
		new_email: string;
		token_hash: string;
		expires_at: string;
	}
): Promise<void> {
	// Delete any existing requests for this user first
	await db.prepare('DELETE FROM email_change_requests WHERE user_id = ?').bind(request.user_id).run();

	await db
		.prepare(
			`INSERT INTO email_change_requests (id, user_id, new_email, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(request.id, request.user_id, request.new_email, request.token_hash, request.expires_at)
		.run();
}

export async function findEmailChangeRequestByToken(
	db: D1Database,
	tokenHash: string
): Promise<EmailChangeRequest | null> {
	return db
		.prepare('SELECT * FROM email_change_requests WHERE token_hash = ? AND expires_at > datetime("now")')
		.bind(tokenHash)
		.first<EmailChangeRequest>();
}

export async function deleteEmailChangeRequest(db: D1Database, id: string): Promise<void> {
	await db.prepare('DELETE FROM email_change_requests WHERE id = ?').bind(id).run();
}

export async function updateUserEmail(db: D1Database, id: string, email: string): Promise<User | null> {
	await db
		.prepare("UPDATE users SET email = ?, email_verified = 1, updated_at = datetime('now') WHERE id = ?")
		.bind(email.toLowerCase(), id)
		.run();
	return findUserById(db, id);
}

export async function cleanExpiredEmailChangeRequests(db: D1Database): Promise<void> {
	await db.prepare("DELETE FROM email_change_requests WHERE expires_at < datetime('now')").run();
}

// Soft delete queries
export async function softDeleteUser(db: D1Database, id: string): Promise<boolean> {
	const result = await db
		.prepare("UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
		.bind(id)
		.run();
	return result.meta.changes > 0;
}

export async function restoreUser(db: D1Database, id: string): Promise<User | null> {
	await db
		.prepare("UPDATE users SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?")
		.bind(id)
		.run();
	return findUserById(db, id);
}

export async function hardDeleteUser(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
	return result.meta.changes > 0;
}

export async function findDeletedUsersForCleanup(db: D1Database): Promise<User[]> {
	// Find users deleted more than 30 days ago
	const result = await db
		.prepare("SELECT * FROM users WHERE deleted_at < datetime('now', '-30 days')")
		.all<User>();
	return result.results ?? [];
}

// Cross-domain token queries
export async function createCrossDomainToken(
	db: D1Database,
	token: {
		id: string;
		user_id: string;
		token_hash: string;
		target: CrossDomainToken['target'];
		expires_at: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO cross_domain_tokens (id, user_id, token_hash, target, expires_at)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(token.id, token.user_id, token.token_hash, token.target, token.expires_at)
		.run();
}

export async function findCrossDomainTokenByHash(
	db: D1Database,
	tokenHash: string
): Promise<CrossDomainToken | null> {
	return db
		.prepare(
			`SELECT * FROM cross_domain_tokens
       WHERE token_hash = ?
       AND expires_at > datetime('now')
       AND used_at IS NULL`
		)
		.bind(tokenHash)
		.first<CrossDomainToken>();
}

export async function markCrossDomainTokenUsed(db: D1Database, id: string): Promise<void> {
	await db
		.prepare("UPDATE cross_domain_tokens SET used_at = datetime('now') WHERE id = ?")
		.bind(id)
		.run();
}

export async function countRecentCrossDomainTokens(
	db: D1Database,
	userId: string,
	windowSeconds: number
): Promise<number> {
	const result = await db
		.prepare(
			`SELECT COUNT(*) as count FROM cross_domain_tokens
       WHERE user_id = ? AND created_at > datetime('now', '-' || ? || ' seconds')`
		)
		.bind(userId, windowSeconds)
		.first<{ count: number }>();
	return result?.count ?? 0;
}

export async function cleanExpiredCrossDomainTokens(db: D1Database): Promise<void> {
	await db.prepare("DELETE FROM cross_domain_tokens WHERE expires_at < datetime('now')").run();
}

export async function ensureMcpAccountForUserTenant(
	db: D1Database,
	userId: string,
	tenantId: string
): Promise<McpAccount> {
	const existing = await db
		.prepare(
			`SELECT * FROM mcp_accounts
       WHERE user_id = ? AND tenant_id = ?
       LIMIT 1`
		)
		.bind(userId, tenantId)
		.first<McpAccount>();

	if (existing) {
		return existing;
	}

	const accountId = `acct_${crypto.randomUUID().replace(/-/g, '')}`;
	await db
		.prepare(
			`INSERT OR IGNORE INTO mcp_accounts (account_id, user_id, tenant_id)
       VALUES (?, ?, ?)`
		)
		.bind(accountId, userId, tenantId)
		.run();

	const created = await db
		.prepare(
			`SELECT * FROM mcp_accounts
       WHERE user_id = ? AND tenant_id = ?
       LIMIT 1`
		)
		.bind(userId, tenantId)
		.first<McpAccount>();

	if (!created) {
		throw new Error(`Failed to create MCP account for user ${userId} and tenant ${tenantId}`);
	}

	return created;
}

// MCP session queries
export async function createMcpSession(
	db: D1Database,
	session: {
		id: string;
		user_id: string;
		tenant_id: string;
		account_id: string;
		host: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile_json: string;
		allowed_tool_prefixes_json: string;
		token_hash: string;
		expires_at: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_sessions (
         id, user_id, tenant_id, account_id, host, tool_mode,
         toolkit_profile_json, allowed_tool_prefixes_json, token_hash, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			session.id,
			session.user_id,
			session.tenant_id,
			session.account_id,
			session.host,
			session.tool_mode,
			session.toolkit_profile_json,
			session.allowed_tool_prefixes_json,
			session.token_hash,
			session.expires_at
		)
		.run();
}

export async function findMcpSessionById(db: D1Database, id: string): Promise<McpSession | null> {
	return db.prepare('SELECT * FROM mcp_sessions WHERE id = ?').bind(id).first<McpSession>();
}

export async function findMcpSessionByTokenHash(db: D1Database, tokenHash: string): Promise<McpSession | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_sessions
       WHERE token_hash = ?
       LIMIT 1`
		)
		.bind(tokenHash)
		.first<McpSession>();
}

export async function listMcpSessionScopes(db: D1Database, sessionId: string): Promise<McpSessionScope[]> {
	const result = await db
		.prepare(
			`SELECT * FROM mcp_session_scopes
       WHERE session_id = ?
       ORDER BY scope_type ASC, scope_value ASC`
		)
		.bind(sessionId)
		.all<McpSessionScope>();
	return result.results ?? [];
}

export async function replaceMcpSessionScopes(
	db: D1Database,
	sessionId: string,
	scopes: Array<{ scope_type: 'toolkit' | 'tool_prefix'; scope_value: string }>
): Promise<void> {
	await db.prepare('DELETE FROM mcp_session_scopes WHERE session_id = ?').bind(sessionId).run();
	for (const scope of scopes) {
		await db
			.prepare(
				`INSERT INTO mcp_session_scopes (id, session_id, scope_type, scope_value)
         VALUES (?, ?, ?, ?)`
			)
			.bind(crypto.randomUUID(), sessionId, scope.scope_type, scope.scope_value)
			.run();
	}
}

export async function revokeMcpSession(db: D1Database, id: string): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE mcp_sessions
       SET revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND revoked_at IS NULL`
		)
		.bind(id)
		.run();
	return result.meta.changes > 0;
}

export async function revokeAllMcpSessionsForUser(db: D1Database, userId: string): Promise<void> {
	await db
		.prepare(
			`UPDATE mcp_sessions
       SET revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`
		)
		.bind(userId)
		.run();
}

export async function cleanExpiredMcpSessions(db: D1Database): Promise<void> {
	await db.prepare("DELETE FROM mcp_sessions WHERE expires_at < datetime('now')").run();
	await db
		.prepare(
			`DELETE FROM mcp_session_scopes
       WHERE session_id NOT IN (SELECT id FROM mcp_sessions)`
		)
		.run();
}

export async function createMcpAuthEvent(
	db: D1Database,
	event: {
		id: string;
		session_id: string | null;
		user_id: string | null;
		event_type: string;
		event_data_json: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_auth_events (id, session_id, user_id, event_type, event_data_json)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(event.id, event.session_id, event.user_id, event.event_type, event.event_data_json)
		.run();
}

export async function listMcpAuthEvents(db: D1Database, sessionId: string): Promise<McpAuthEvent[]> {
	const result = await db
		.prepare(
			`SELECT * FROM mcp_auth_events
       WHERE session_id = ?
       ORDER BY created_at DESC`
		)
		.bind(sessionId)
		.all<McpAuthEvent>();
	return result.results ?? [];
}
