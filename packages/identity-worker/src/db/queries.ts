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
	McpLegacyKey,
	McpLongLivedToken,
	McpPolicyRollout,
	McpPolicyEvent,
	PlayerAccessCredential,
	PlayerAccessSession,
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

// Player Access queries
export async function findPlayerAccessByCode(
	db: D1Database,
	playerCode: string
): Promise<PlayerAccessCredential | null> {
	return db
		.prepare('SELECT * FROM player_access_credentials WHERE player_code = ? COLLATE NOCASE')
		.bind(playerCode)
		.first<PlayerAccessCredential>();
}

export async function findPlayerAccessBySubject(
	db: D1Database,
	subjectId: string
): Promise<PlayerAccessCredential | null> {
	return db
		.prepare('SELECT * FROM player_access_credentials WHERE subject_id = ?')
		.bind(subjectId)
		.first<PlayerAccessCredential>();
}

export async function upsertPlayerAccess(
	db: D1Database,
	credential: {
		subject_id: string;
		player_code: string;
		password_hash: string;
		manager_subject: string;
		display_name: string | null;
		created_by_actor: string;
	}
): Promise<PlayerAccessCredential> {
	await db
		.prepare(
			`INSERT INTO player_access_credentials (
				subject_id, player_code, password_hash, manager_subject, display_name,
				status, created_by_actor, rotated_at, revoked_at
			) VALUES (?, ?, ?, ?, ?, 'active', ?, datetime('now'), NULL)
			ON CONFLICT(subject_id) DO UPDATE SET
				player_code = excluded.player_code,
				password_hash = excluded.password_hash,
				manager_subject = excluded.manager_subject,
				display_name = excluded.display_name,
				status = 'active',
				rotated_at = datetime('now'),
				revoked_at = NULL,
				updated_at = datetime('now')`
		)
		.bind(
			credential.subject_id,
			credential.player_code,
			credential.password_hash,
			credential.manager_subject,
			credential.display_name,
			credential.created_by_actor
		)
		.run();
	return (await findPlayerAccessBySubject(db, credential.subject_id))!;
}

export async function markPlayerAccessUsed(db: D1Database, subjectId: string): Promise<void> {
	await db
		.prepare("UPDATE player_access_credentials SET last_used_at = datetime('now'), updated_at = datetime('now') WHERE subject_id = ?")
		.bind(subjectId)
		.run();
}

export async function revokePlayerAccess(db: D1Database, subjectId: string): Promise<boolean> {
	const result = await db
		.prepare("UPDATE player_access_credentials SET status = 'revoked', revoked_at = datetime('now'), updated_at = datetime('now') WHERE subject_id = ? AND status = 'active'")
		.bind(subjectId)
		.run();
	return result.meta.changes > 0;
}

export async function createPlayerAccessSession(
	db: D1Database,
	session: Pick<PlayerAccessSession, 'id' | 'subject_id' | 'token_hash' | 'family_id' | 'expires_at'>
): Promise<void> {
	await db
		.prepare('INSERT INTO player_access_sessions (id, subject_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?, ?)')
		.bind(session.id, session.subject_id, session.token_hash, session.family_id, session.expires_at)
		.run();
}

export async function findPlayerAccessSessionByHash(
	db: D1Database,
	tokenHash: string
): Promise<PlayerAccessSession | null> {
	return db
		.prepare('SELECT * FROM player_access_sessions WHERE token_hash = ? AND revoked_at IS NULL')
		.bind(tokenHash)
		.first<PlayerAccessSession>();
}

export async function revokePlayerAccessSession(db: D1Database, id: string): Promise<void> {
	await db
		.prepare("UPDATE player_access_sessions SET revoked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
		.bind(id)
		.run();
}

export async function revokePlayerAccessSessionFamily(db: D1Database, familyId: string): Promise<void> {
	await db
		.prepare("UPDATE player_access_sessions SET revoked_at = datetime('now'), updated_at = datetime('now') WHERE family_id = ?")
		.bind(familyId)
		.run();
}

export async function revokeAllPlayerAccessSessions(db: D1Database, subjectId: string): Promise<void> {
	await db
		.prepare("UPDATE player_access_sessions SET revoked_at = datetime('now'), updated_at = datetime('now') WHERE subject_id = ? AND revoked_at IS NULL")
		.bind(subjectId)
		.run();
}

export async function createPlayerAccessEvent(
	db: D1Database,
	event: {
		id: string;
		subject_id: string;
		event_type: 'issued' | 'rotated' | 'login_succeeded' | 'login_failed' | 'session_refreshed' | 'revoked';
		actor: string;
		event_data_json: string;
	}
): Promise<void> {
	await db
		.prepare('INSERT INTO player_access_events (id, subject_id, event_type, actor, event_data_json) VALUES (?, ?, ?, ?, ?)')
		.bind(event.id, event.subject_id, event.event_type, event.actor, event.event_data_json)
		.run();
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

export async function findMcpAccountById(db: D1Database, accountId: string): Promise<McpAccount | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_accounts
       WHERE account_id = ?
       LIMIT 1`
		)
		.bind(accountId)
		.first<McpAccount>();
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
		bound_host: string | null;
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
         id, user_id, tenant_id, account_id, host, bound_host, tool_mode,
         toolkit_profile_json, allowed_tool_prefixes_json, token_hash, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			session.id,
			session.user_id,
			session.tenant_id,
			session.account_id,
			session.host,
			session.bound_host,
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

export async function findMcpLegacyKeyByTokenHash(
	db: D1Database,
	tokenHash: string
): Promise<McpLegacyKey | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_legacy_keys
       WHERE key_hash = ?
       LIMIT 1`
		)
		.bind(tokenHash)
		.first<McpLegacyKey>();
}

export async function upsertMcpLongLivedToken(
	db: D1Database,
	token: {
		id: string;
		auth_subject: string;
		auth_email: string | null;
		tenant_id: string;
		account_id: string;
		bound_host: string | null;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile_json: string;
		allowed_tool_prefixes_json: string;
		token_hash: string;
		token_prefix: string;
		issued_by: string;
		metadata_json: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_long_lived_tokens (
         id, auth_subject, auth_email, tenant_id, account_id, bound_host, tool_mode,
         toolkit_profile_json, allowed_tool_prefixes_json, token_hash, token_prefix,
         issued_by, metadata_json, revoked_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(auth_subject) DO UPDATE SET
         id = excluded.id,
         auth_email = excluded.auth_email,
         tenant_id = excluded.tenant_id,
         account_id = excluded.account_id,
         bound_host = excluded.bound_host,
         tool_mode = excluded.tool_mode,
         toolkit_profile_json = excluded.toolkit_profile_json,
         allowed_tool_prefixes_json = excluded.allowed_tool_prefixes_json,
         token_hash = excluded.token_hash,
         token_prefix = excluded.token_prefix,
         issued_by = excluded.issued_by,
         metadata_json = excluded.metadata_json,
         revoked_at = NULL,
         last_used_at = NULL,
         updated_at = datetime('now')`
		)
		.bind(
			token.id,
			token.auth_subject,
			token.auth_email,
			token.tenant_id,
			token.account_id,
			token.bound_host,
			token.tool_mode,
			token.toolkit_profile_json,
			token.allowed_tool_prefixes_json,
			token.token_hash,
			token.token_prefix,
			token.issued_by,
			token.metadata_json,
		)
		.run();
}

export async function findMcpLongLivedTokenByAuthSubject(
	db: D1Database,
	authSubject: string
): Promise<McpLongLivedToken | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_long_lived_tokens
       WHERE auth_subject = ?
       LIMIT 1`
		)
		.bind(authSubject)
		.first<McpLongLivedToken>();
}

export async function findMcpLongLivedTokenById(db: D1Database, id: string): Promise<McpLongLivedToken | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_long_lived_tokens
       WHERE id = ?
       LIMIT 1`
		)
		.bind(id)
		.first<McpLongLivedToken>();
}

export async function findMcpLongLivedTokenByTokenHash(
	db: D1Database,
	tokenHash: string
): Promise<McpLongLivedToken | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_long_lived_tokens
       WHERE token_hash = ?
       LIMIT 1`
		)
		.bind(tokenHash)
		.first<McpLongLivedToken>();
}

export async function markMcpLongLivedTokenUsed(db: D1Database, id: string): Promise<void> {
	await db
		.prepare(
			`UPDATE mcp_long_lived_tokens
       SET last_used_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
		)
		.bind(id)
		.run();
}

export async function revokeMcpLongLivedToken(db: D1Database, id: string): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE mcp_long_lived_tokens
       SET revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND revoked_at IS NULL`
		)
		.bind(id)
		.run();
	return result.meta.changes > 0;
}

export async function markMcpLegacyKeyUsed(db: D1Database, id: string): Promise<void> {
	await db
		.prepare(
			`UPDATE mcp_legacy_keys
       SET last_used_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
		)
		.bind(id)
		.run();
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

export async function listRecentMcpAuthEvents(
	db: D1Database,
	limit: number,
	search?: string | null
): Promise<McpAuthEvent[]> {
	const normalizedLimit = Math.max(1, Math.min(250, limit));
	const query = search?.trim().toLowerCase();
	if (query) {
		const pattern = `%${query}%`;
		const result = await db
			.prepare(
				`SELECT * FROM mcp_auth_events
         WHERE lower(COALESCE(user_id, '')) LIKE ?
            OR lower(event_type) LIKE ?
            OR lower(COALESCE(event_data_json, '')) LIKE ?
         ORDER BY created_at DESC
         LIMIT ?`
			)
			.bind(pattern, pattern, pattern, normalizedLimit)
			.all<McpAuthEvent>();
		return result.results ?? [];
	}

	const result = await db
		.prepare(
			`SELECT * FROM mcp_auth_events
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(normalizedLimit)
		.all<McpAuthEvent>();
	return result.results ?? [];
}

export async function createMcpLegacyKey(
	db: D1Database,
	key: {
		id: string;
		key_hash: string;
		key_prefix: string;
		tenant_id: string;
		account_id: string;
		user_id: string | null;
		reason: string;
		exception_approved_by: string | null;
		issued_by: string;
		expires_at: string;
		sunset_at: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_legacy_keys (
         id, key_hash, key_prefix, tenant_id, account_id, user_id,
         reason, exception_approved_by, issued_by, expires_at, sunset_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			key.id,
			key.key_hash,
			key.key_prefix,
			key.tenant_id,
			key.account_id,
			key.user_id,
			key.reason,
			key.exception_approved_by,
			key.issued_by,
			key.expires_at,
			key.sunset_at
		)
		.run();
}

export async function findMcpLegacyKeyById(db: D1Database, id: string): Promise<McpLegacyKey | null> {
	return db
		.prepare(
			`SELECT * FROM mcp_legacy_keys
       WHERE id = ?
       LIMIT 1`
		)
		.bind(id)
		.first<McpLegacyKey>();
}

export async function revokeMcpLegacyKey(db: D1Database, id: string): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE mcp_legacy_keys
       SET revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND revoked_at IS NULL`
		)
		.bind(id)
		.run();
	return result.meta.changes > 0;
}

export async function findMcpPolicyRollout(
	db: D1Database,
	policyId: string
): Promise<McpPolicyRollout | null> {
	return db
		.prepare(
			`SELECT policy_id, mode, canary_percent, updated_by, updated_at
       FROM mcp_policy_rollout
       WHERE policy_id = ?
       LIMIT 1`
		)
		.bind(policyId)
		.first<McpPolicyRollout>();
}

export async function createMcpPolicyRollout(
	db: D1Database,
	rollout: {
		policy_id: string;
		mode: McpPolicyRollout['mode'];
		canary_percent: number;
		updated_by: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_policy_rollout (policy_id, mode, canary_percent, updated_by)
       VALUES (?, ?, ?, ?)`
		)
		.bind(rollout.policy_id, rollout.mode, rollout.canary_percent, rollout.updated_by)
		.run();
}

export async function createMcpPolicyEvent(
	db: D1Database,
	event: {
		id: string;
		policy_id: string;
		action_name: string;
		account_id: string | null;
		actor: string | null;
		rollout_mode: McpPolicyEvent['rollout_mode'];
		canary_percent: number;
		sampled_polar: number;
		mismatch: number;
		evaluation_path: McpPolicyEvent['evaluation_path'];
		fallback_used: number;
		fallback_reason: string | null;
		legacy_decision: McpPolicyEvent['legacy_decision'];
		polar_decision: McpPolicyEvent['polar_decision'];
		final_decision: McpPolicyEvent['final_decision'];
		policy_hash: string | null;
		compiler_version: string | null;
		metadata_json: string;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO mcp_policy_events (
         id, policy_id, action_name, account_id, actor, rollout_mode, canary_percent,
         sampled_polar, mismatch, evaluation_path, fallback_used, fallback_reason,
         legacy_decision, polar_decision, final_decision, policy_hash, compiler_version,
         metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			event.id,
			event.policy_id,
			event.action_name,
			event.account_id,
			event.actor,
			event.rollout_mode,
			event.canary_percent,
			event.sampled_polar,
			event.mismatch,
			event.evaluation_path,
			event.fallback_used,
			event.fallback_reason,
			event.legacy_decision,
			event.polar_decision,
			event.final_decision,
			event.policy_hash,
			event.compiler_version,
			event.metadata_json
		)
		.run();
}

export async function listRecentMcpPolicyEvents(
	db: D1Database,
	limit: number,
	search?: string | null
): Promise<McpPolicyEvent[]> {
	const normalizedLimit = Math.max(1, Math.min(250, limit));
	const query = search?.trim().toLowerCase();
	if (query) {
		const pattern = `%${query}%`;
		const result = await db
			.prepare(
				`SELECT * FROM mcp_policy_events
         WHERE lower(policy_id) LIKE ?
            OR lower(action_name) LIKE ?
            OR lower(COALESCE(account_id, '')) LIKE ?
            OR lower(COALESCE(actor, '')) LIKE ?
            OR lower(COALESCE(metadata_json, '')) LIKE ?
         ORDER BY created_at DESC
         LIMIT ?`
			)
			.bind(pattern, pattern, pattern, pattern, pattern, normalizedLimit)
			.all<McpPolicyEvent>();
		return result.results ?? [];
	}

	const result = await db
		.prepare(
			`SELECT * FROM mcp_policy_events
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(normalizedLimit)
		.all<McpPolicyEvent>();
	return result.results ?? [];
}
