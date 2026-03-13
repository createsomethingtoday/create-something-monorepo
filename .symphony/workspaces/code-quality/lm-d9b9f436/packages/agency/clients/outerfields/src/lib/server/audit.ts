/**
 * Audit Logging
 * 
 * Records every action in the AI-native system for full traceability.
 * Supports both agent and human actors.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { AuditEntry } from '$lib/types/proposals';

/**
 * Generate unique audit entry ID
 */
function generateAuditId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log an audit entry
 */
export async function logAudit(
  db: D1Database,
  entry: Omit<AuditEntry, 'id' | 'createdAt'>
): Promise<string> {
  const id = generateAuditId();
  const createdAt = Date.now();
  
  await db.prepare(`
    INSERT INTO audit_log (
      id, actor_type, actor_id, action,
      target_type, target_id, details,
      before_state, after_state, reason,
      ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    entry.actorType,
    entry.actorId,
    entry.action,
    entry.targetType,
    entry.targetId,
    JSON.stringify(entry.details),
    entry.beforeState ? JSON.stringify(entry.beforeState) : null,
    entry.afterState ? JSON.stringify(entry.afterState) : null,
    entry.reason || null,
    entry.ipAddress || null,
    entry.userAgent || null,
    createdAt
  ).run();
  
  return id;
}

/**
 * Get audit entries for a target
 */
export async function getAuditForTarget(
  db: D1Database,
  targetType: string,
  targetId: string,
  limit: number = 50
): Promise<AuditEntry[]> {
  const result = await db.prepare(`
    SELECT * FROM audit_log
    WHERE target_type = ? AND target_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(targetType, targetId, limit).all();
  
  return (result.results || []).map(parseAuditRow);
}

/**
 * Get recent audit entries
 */
export async function getRecentAudit(
  db: D1Database,
  options: {
    limit?: number;
    actorType?: 'agent' | 'human' | 'system';
    action?: string;
    since?: number;
  } = {}
): Promise<AuditEntry[]> {
  const { limit = 100, actorType, action, since } = options;
  
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (actorType) {
    query += ' AND actor_type = ?';
    params.push(actorType);
  }
  
  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  
  if (since) {
    query += ' AND created_at >= ?';
    params.push(since);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  const result = await db.prepare(query).bind(...params).all();
  
  return (result.results || []).map(parseAuditRow);
}

/**
 * Get audit summary for a time period
 */
export async function getAuditSummary(
  db: D1Database,
  since: number
): Promise<{
  totalActions: number;
  byActor: Record<string, number>;
  byAction: Record<string, number>;
  proposals: { created: number; approved: number; rejected: number; applied: number; rolledBack: number };
}> {
  const [
    totalResult,
    byActorResult,
    byActionResult
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM audit_log WHERE created_at >= ?')
      .bind(since).first<{ count: number }>(),
    db.prepare(`
      SELECT actor_type, COUNT(*) as count 
      FROM audit_log 
      WHERE created_at >= ? 
      GROUP BY actor_type
    `).bind(since).all<{ actor_type: string; count: number }>(),
    db.prepare(`
      SELECT action, COUNT(*) as count 
      FROM audit_log 
      WHERE created_at >= ? 
      GROUP BY action
    `).bind(since).all<{ action: string; count: number }>()
  ]);
  
  const byActor: Record<string, number> = {};
  for (const row of byActorResult.results || []) {
    byActor[row.actor_type] = row.count;
  }
  
  const byAction: Record<string, number> = {};
  for (const row of byActionResult.results || []) {
    byAction[row.action] = row.count;
  }
  
  return {
    totalActions: totalResult?.count || 0,
    byActor,
    byAction,
    proposals: {
      created: byAction['propose'] || 0,
      approved: byAction['approve'] || 0,
      rejected: byAction['reject'] || 0,
      applied: byAction['apply'] || 0,
      rolledBack: byAction['rollback'] || 0
    }
  };
}

/**
 * Parse database row to AuditEntry
 */
function parseAuditRow(row: any): AuditEntry {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details ? JSON.parse(row.details) : {},
    beforeState: row.before_state ? JSON.parse(row.before_state) : undefined,
    afterState: row.after_state ? JSON.parse(row.after_state) : undefined,
    reason: row.reason || undefined,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    createdAt: row.created_at
  };
}
