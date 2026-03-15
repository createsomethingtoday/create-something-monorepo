/**
 * @create-something/agent-coordination
 *
 * Claims system for multi-agent coordination.
 * Prevents duplicate work and enables failure recovery.
 */

import type {
  CoordinationDB,
  Claim,
  AgentRegistration,
  Broadcast,
  Issue,
  ClaimOptions,
} from './types.js';
import { Tracker } from './tracker.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Claims manager for multi-agent coordination.
 * Handles claim/release semantics, agent registration, and failure recovery.
 */
export class Claims {
  private tracker: Tracker;

  constructor(private db: CoordinationDB) {
    this.tracker = new Tracker(db);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Agent Registration
  // ─────────────────────────────────────────────────────────────────────────

  async registerAgent(
    agentId: string,
    capabilities: string[] = [],
    metadata: Record<string, unknown> = {}
  ): Promise<AgentRegistration> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO agents (agent_id, capabilities, status, last_seen_at, metadata)
         VALUES (?, ?, 'active', ?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET
           capabilities = excluded.capabilities,
           status = 'active',
           last_seen_at = excluded.last_seen_at,
           metadata = excluded.metadata`
      )
      .bind(agentId, JSON.stringify(capabilities), now, JSON.stringify(metadata))
      .run();

    return {
      agentId,
      capabilities,
      status: 'active',
      lastSeenAt: now,
      metadata,
    };
  }

  async getAgent(agentId: string): Promise<AgentRegistration | null> {
    const row = await this.db
      .prepare('SELECT * FROM agents WHERE agent_id = ?')
      .bind(agentId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return this.rowToAgent(row);
  }

  async updateAgentStatus(agentId: string, status: 'active' | 'idle' | 'dead'): Promise<void> {
    await this.db
      .prepare('UPDATE agents SET status = ?, last_seen_at = ? WHERE agent_id = ?')
      .bind(status, Math.floor(Date.now() / 1000), agentId)
      .run();
  }

  async heartbeat(agentId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare('UPDATE agents SET last_seen_at = ?, status = \'active\' WHERE agent_id = ?')
      .bind(now, agentId)
      .run();

    // Also update heartbeat on all claims held by this agent
    await this.db
      .prepare('UPDATE claims SET heartbeat_at = ? WHERE agent_id = ?')
      .bind(now, agentId)
      .run();
  }

  async listAgents(status?: 'active' | 'idle' | 'dead'): Promise<AgentRegistration[]> {
    const query = status
      ? 'SELECT * FROM agents WHERE status = ? ORDER BY last_seen_at DESC'
      : 'SELECT * FROM agents ORDER BY last_seen_at DESC';

    const { results } = status
      ? await this.db.prepare(query).bind(status).all<Record<string, unknown>>()
      : await this.db.prepare(query).all<Record<string, unknown>>();

    return results.map((row) => this.rowToAgent(row));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Claims
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Attempt to claim an issue for an agent.
   * Returns true if claim succeeded, false if already claimed.
   */
  async claim(
    issueId: string,
    agentId: string,
    options: ClaimOptions = {}
  ): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = ttlMs ? now + Math.floor(ttlMs / 1000) : null;

    // First, clean up expired claims
    await this.reclaimExpired();

    // Check if already claimed by another agent
    const existing = await this.getClaim(issueId);
    if (existing && existing.agentId !== agentId) {
      return false;
    }

    // If already claimed by this agent, just refresh
    if (existing && existing.agentId === agentId) {
      await this.db
        .prepare('UPDATE claims SET expires_at = ?, heartbeat_at = ? WHERE issue_id = ?')
        .bind(expiresAt, now, issueId)
        .run();
      return true;
    }

    // Create new claim
    try {
      await this.db
        .prepare(
          `INSERT INTO claims (issue_id, agent_id, claimed_at, expires_at, heartbeat_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(issueId, agentId, now, expiresAt, now)
        .run();

      // Update issue status
      await this.tracker.updateIssue(issueId, { status: 'in_progress' });

      // Broadcast claim event
      await this.broadcast('claimed', issueId, agentId, {});

      return true;
    } catch {
      // Claim failed (race condition - another agent got it)
      return false;
    }
  }

  /**
   * Release a claim on an issue.
   */
  async release(issueId: string, agentId: string): Promise<void> {
    const claim = await this.getClaim(issueId);
    if (!claim || claim.agentId !== agentId) {
      return; // Not claimed by this agent
    }

    await this.db
      .prepare('DELETE FROM claims WHERE issue_id = ? AND agent_id = ?')
      .bind(issueId, agentId)
      .run();

    // Return issue to open status
    await this.tracker.updateIssue(issueId, { status: 'open' });

    // Broadcast release event
    await this.broadcast('released', issueId, agentId, {});
  }

  /**
   * Get the current claim on an issue.
   */
  async getClaim(issueId: string): Promise<Claim | null> {
    const row = await this.db
      .prepare('SELECT * FROM claims WHERE issue_id = ?')
      .bind(issueId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return this.rowToClaim(row);
  }

  /**
   * Get all claims held by an agent.
   */
  async getAgentClaims(agentId: string): Promise<Claim[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM claims WHERE agent_id = ?')
      .bind(agentId)
      .all<Record<string, unknown>>();

    return results.map((row) => this.rowToClaim(row));
  }

  /**
   * Get all active claims with issue details.
   */
  async getActiveWork(): Promise<Array<{ claim: Claim; issue: Issue }>> {
    const { results } = await this.db
      .prepare(
        `SELECT c.*, i.description, i.status as issue_status, i.priority, i.labels, i.project_id
         FROM claims c
         JOIN issues i ON i.id = c.issue_id
         ORDER BY c.claimed_at DESC`
      )
      .all<Record<string, unknown>>();

    const activeWork: Array<{ claim: Claim; issue: Issue }> = [];

    for (const row of results) {
      const issue = await this.tracker.getIssue(row.issue_id as string);
      if (issue) {
        activeWork.push({
          claim: this.rowToClaim(row),
          issue,
        });
      }
    }

    return activeWork;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Failure Recovery
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reclaim expired claims and return issues to pool.
   */
  async reclaimExpired(): Promise<Issue[]> {
    const now = Math.floor(Date.now() / 1000);

    // Find expired claims
    const { results } = await this.db
      .prepare(
        `SELECT c.*, i.* FROM claims c
         JOIN issues i ON i.id = c.issue_id
         WHERE c.expires_at IS NOT NULL AND c.expires_at < ?`
      )
      .bind(now)
      .all<Record<string, unknown>>();

    const reclaimed: Issue[] = [];

    for (const row of results) {
      const issueId = row.issue_id as string;
      const agentId = row.agent_id as string;

      // Delete the claim
      await this.db
        .prepare('DELETE FROM claims WHERE issue_id = ?')
        .bind(issueId)
        .run();

      // Return issue to open status
      await this.tracker.updateIssue(issueId, { status: 'open' });

      // Mark agent as potentially dead
      await this.updateAgentStatus(agentId, 'dead');

      // Broadcast release event
      await this.broadcast('released', issueId, agentId, { reason: 'expired' });

      const issue = await this.tracker.getIssue(issueId);
      if (issue) reclaimed.push(issue);
    }

    return reclaimed;
  }

  /**
   * Detect dead agents based on heartbeat timeout.
   */
  async detectDeadAgents(timeoutMs: number = 2 * 60 * 1000): Promise<AgentRegistration[]> {
    const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);

    const { results } = await this.db
      .prepare(
        `SELECT * FROM agents
         WHERE status = 'active' AND last_seen_at < ?`
      )
      .bind(cutoff)
      .all<Record<string, unknown>>();

    const deadAgents: AgentRegistration[] = [];

    for (const row of results) {
      const agent = this.rowToAgent(row);
      await this.updateAgentStatus(agent.agentId, 'dead');

      // Release all claims held by this agent
      const claims = await this.getAgentClaims(agent.agentId);
      for (const claim of claims) {
        await this.release(claim.issueId, agent.agentId);
      }

      deadAgents.push({ ...agent, status: 'dead' });
    }

    return deadAgents;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Broadcasts (Event Log)
  // ─────────────────────────────────────────────────────────────────────────

  async broadcast(
    eventType: Broadcast['eventType'],
    issueId: string,
    agentId: string,
    payload: Record<string, unknown> = {}
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO broadcasts (event_type, issue_id, agent_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(eventType, issueId, agentId, JSON.stringify(payload), now)
      .run();
  }

  async getRecentBroadcasts(limit: number = 50, sinceId?: number): Promise<Broadcast[]> {
    const query = sinceId
      ? 'SELECT * FROM broadcasts WHERE id > ? ORDER BY id DESC LIMIT ?'
      : 'SELECT * FROM broadcasts ORDER BY id DESC LIMIT ?';

    const { results } = sinceId
      ? await this.db.prepare(query).bind(sinceId, limit).all<Record<string, unknown>>()
      : await this.db.prepare(query).bind(limit).all<Record<string, unknown>>();

    return results.map((row) => this.rowToBroadcast(row));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  private rowToAgent(row: Record<string, unknown>): AgentRegistration {
    return {
      agentId: row.agent_id as string,
      capabilities: JSON.parse((row.capabilities as string) || '[]'),
      status: row.status as 'active' | 'idle' | 'dead',
      lastSeenAt: row.last_seen_at as number,
      metadata: JSON.parse((row.metadata as string) || '{}'),
    };
  }

  private rowToClaim(row: Record<string, unknown>): Claim {
    return {
      issueId: row.issue_id as string,
      agentId: row.agent_id as string,
      claimedAt: row.claimed_at as number,
      expiresAt: row.expires_at as number | null,
      heartbeatAt: row.heartbeat_at as number,
    };
  }

  private rowToBroadcast(row: Record<string, unknown>): Broadcast {
    return {
      id: row.id as number,
      eventType: row.event_type as Broadcast['eventType'],
      issueId: row.issue_id as string,
      agentId: row.agent_id as string,
      payload: JSON.parse((row.payload as string) || '{}'),
      createdAt: row.created_at as number,
    };
  }
}
