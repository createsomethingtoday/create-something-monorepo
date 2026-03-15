/**
 * @create-something/agent-coordination
 *
 * Core tracker for issues and dependencies.
 * Foundation for multi-agent coordination.
 */

import type {
  CoordinationDB,
  Issue,
  IssueStatus,
  Dependency,
  DependencyType,
  Outcome,
  OutcomeResult,
  Project,
  ProjectStatus,
  CreateIssueOptions,
  UpdateIssueOptions,
  QueryOptions,
} from './types.js';
import { rowToIssue } from './utils.js';

/**
 * Generate a short unique ID.
 * Uses timestamp + random suffix for collision resistance.
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Core tracker for issues and dependencies.
 * Provides the foundation for multi-agent coordination.
 */
export class Tracker {
  constructor(private db: CoordinationDB) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Projects
  // ─────────────────────────────────────────────────────────────────────────

  async createProject(
    name: string,
    options: {
      description?: string;
      successCriteria?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<Project> {
    const id = generateId('proj');
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO projects (id, name, description, success_criteria, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        name,
        options.description ?? '',
        options.successCriteria ?? '',
        now,
        JSON.stringify(options.metadata ?? {})
      )
      .run();

    return {
      id,
      name,
      description: options.description ?? '',
      status: 'active',
      successCriteria: options.successCriteria ?? '',
      createdAt: now,
      completedAt: null,
      metadata: options.metadata ?? {},
    };
  }

  async getProject(id: string): Promise<Project | null> {
    const row = await this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return this.rowToProject(row);
  }

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
    const completedAt = status === 'completed' ? Math.floor(Date.now() / 1000) : null;
    await this.db
      .prepare('UPDATE projects SET status = ?, completed_at = ? WHERE id = ?')
      .bind(status, completedAt, id)
      .run();
  }

  async listProjects(status?: ProjectStatus): Promise<Project[]> {
    const query = status
      ? 'SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC'
      : 'SELECT * FROM projects ORDER BY created_at DESC';

    const { results } = status
      ? await this.db.prepare(query).bind(status).all<Record<string, unknown>>()
      : await this.db.prepare(query).all<Record<string, unknown>>();

    return results.map((row) => this.rowToProject(row));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Issues
  // ─────────────────────────────────────────────────────────────────────────

  async createIssue(options: CreateIssueOptions): Promise<Issue> {
    const id = generateId('iss');
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO issues (id, description, project_id, parent_id, priority, labels, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        options.description,
        options.projectId ?? null,
        options.parentId ?? null,
        options.priority ?? 2,
        JSON.stringify(options.labels ?? []),
        JSON.stringify(options.metadata ?? {}),
        now,
        now
      )
      .run();

    return {
      id,
      description: options.description,
      status: 'open',
      projectId: options.projectId ?? null,
      parentId: options.parentId ?? null,
      priority: options.priority ?? 2,
      labels: options.labels ?? [],
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
  }

  async getIssue(id: string): Promise<Issue | null> {
    const row = await this.db
      .prepare('SELECT * FROM issues WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return rowToIssue(row);
  }

  async updateIssue(id: string, options: UpdateIssueOptions): Promise<void> {
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [Math.floor(Date.now() / 1000)];

    if (options.description !== undefined) {
      updates.push('description = ?');
      values.push(options.description);
    }

    if (options.status !== undefined) {
      updates.push('status = ?');
      values.push(options.status);

      if (options.status === 'done' || options.status === 'cancelled') {
        updates.push('resolved_at = ?');
        values.push(Math.floor(Date.now() / 1000));
      }
    }

    if (options.priority !== undefined) {
      updates.push('priority = ?');
      values.push(options.priority);
    }

    if (options.labels !== undefined) {
      updates.push('labels = ?');
      values.push(JSON.stringify(options.labels));
    }

    if (options.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(options.metadata));
    }

    values.push(id);

    await this.db
      .prepare(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  async listIssues(options: QueryOptions = {}): Promise<Issue[]> {
    let query = 'SELECT * FROM issues WHERE 1=1';
    const values: unknown[] = [];

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query += ` AND status IN (${statuses.map(() => '?').join(', ')})`;
      values.push(...statuses);
    }

    if (options.projectId) {
      query += ' AND project_id = ?';
      values.push(options.projectId);
    }

    if (options.labels && options.labels.length > 0) {
      // SQLite JSON contains check for each label
      for (const label of options.labels) {
        query += ` AND labels LIKE ?`;
        values.push(`%"${label}"%`);
      }
    }

    query += ' ORDER BY priority ASC, created_at ASC';

    if (options.limit) {
      query += ' LIMIT ?';
      values.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      values.push(options.offset);
    }

    const { results } = await this.db
      .prepare(query)
      .bind(...values)
      .all<Record<string, unknown>>();

    return results.map((row) => rowToIssue(row));
  }

  /**
   * Get issues that are ready to work on (open, not blocked).
   */
  async getReadyIssues(limit: number = 10): Promise<Issue[]> {
    const { results } = await this.db
      .prepare(
        `SELECT i.* FROM issues i
         WHERE i.status = 'open'
         AND NOT EXISTS (
           SELECT 1 FROM dependencies d
           JOIN issues blocker ON blocker.id = d.from_id
           WHERE d.to_id = i.id
           AND d.type = 'blocks'
           AND blocker.status NOT IN ('done', 'cancelled')
         )
         AND NOT EXISTS (
           SELECT 1 FROM claims c WHERE c.issue_id = i.id
         )
         ORDER BY i.priority ASC, i.created_at ASC
         LIMIT ?`
      )
      .bind(limit)
      .all<Record<string, unknown>>();

    return results.map((row) => rowToIssue(row));
  }

  /**
   * Get issues that are blocked.
   */
  async getBlockedIssues(): Promise<Array<{ issue: Issue; blockedBy: Issue[] }>> {
    const { results } = await this.db
      .prepare(
        `SELECT i.*, GROUP_CONCAT(d.from_id) as blocker_ids
         FROM issues i
         JOIN dependencies d ON d.to_id = i.id AND d.type = 'blocks'
         JOIN issues blocker ON blocker.id = d.from_id AND blocker.status NOT IN ('done', 'cancelled')
         WHERE i.status IN ('open', 'blocked')
         GROUP BY i.id`
      )
      .all<Record<string, unknown> & { blocker_ids: string }>();

    const blockedIssues: Array<{ issue: Issue; blockedBy: Issue[] }> = [];

    for (const row of results) {
      const blockerIds = row.blocker_ids.split(',');
      const blockers: Issue[] = [];

      for (const blockerId of blockerIds) {
        const blocker = await this.getIssue(blockerId);
        if (blocker) blockers.push(blocker);
      }

      blockedIssues.push({
        issue: rowToIssue(row),
        blockedBy: blockers,
      });
    }

    return blockedIssues;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dependencies
  // ─────────────────────────────────────────────────────────────────────────

  async addDependency(fromId: string, toId: string, type: DependencyType): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT OR IGNORE INTO dependencies (from_id, to_id, type, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(fromId, toId, type, now)
      .run();

    // If this is a blocking dependency, mark the target as blocked if the source is open
    if (type === 'blocks') {
      const source = await this.getIssue(fromId);
      if (source && source.status !== 'done' && source.status !== 'cancelled') {
        await this.updateIssue(toId, { status: 'blocked' });
      }
    }
  }

  async removeDependency(fromId: string, toId: string, type: DependencyType): Promise<void> {
    await this.db
      .prepare('DELETE FROM dependencies WHERE from_id = ? AND to_id = ? AND type = ?')
      .bind(fromId, toId, type)
      .run();

    // Check if target is still blocked by other issues
    if (type === 'blocks') {
      const { results } = await this.db
        .prepare(
          `SELECT 1 FROM dependencies d
           JOIN issues i ON i.id = d.from_id
           WHERE d.to_id = ? AND d.type = 'blocks'
           AND i.status NOT IN ('done', 'cancelled')
           LIMIT 1`
        )
        .bind(toId)
        .all();

      if (results.length === 0) {
        const target = await this.getIssue(toId);
        if (target?.status === 'blocked') {
          await this.updateIssue(toId, { status: 'open' });
        }
      }
    }
  }

  async getDependencies(issueId: string): Promise<{ blocking: Dependency[]; blockedBy: Dependency[] }> {
    const { results: blocking } = await this.db
      .prepare('SELECT * FROM dependencies WHERE from_id = ?')
      .bind(issueId)
      .all<Record<string, unknown>>();

    const { results: blockedBy } = await this.db
      .prepare('SELECT * FROM dependencies WHERE to_id = ?')
      .bind(issueId)
      .all<Record<string, unknown>>();

    return {
      blocking: blocking.map((row) => this.rowToDependency(row)),
      blockedBy: blockedBy.map((row) => this.rowToDependency(row)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Outcomes
  // ─────────────────────────────────────────────────────────────────────────

  async recordOutcome(
    issueId: string,
    agentId: string,
    result: OutcomeResult,
    learnings: string = '',
    metadata: Record<string, unknown> = {}
  ): Promise<Outcome> {
    const id = generateId('out');
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO outcomes (id, issue_id, agent_id, result, learnings, metadata, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, issueId, agentId, result, learnings, JSON.stringify(metadata), now)
      .run();

    // Update issue status based on outcome
    if (result === 'success') {
      await this.updateIssue(issueId, { status: 'done' });
      // Unblock dependent issues
      await this.unblockDependents(issueId);
    } else if (result === 'cancelled') {
      await this.updateIssue(issueId, { status: 'cancelled' });
    }

    return {
      id,
      issueId,
      agentId,
      result,
      learnings,
      metadata,
      recordedAt: now,
    };
  }

  async getOutcomes(issueId: string): Promise<Outcome[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM outcomes WHERE issue_id = ? ORDER BY recorded_at DESC')
      .bind(issueId)
      .all<Record<string, unknown>>();

    return results.map((row) => this.rowToOutcome(row));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  private async unblockDependents(completedIssueId: string): Promise<string[]> {
    // Find all issues that were blocked by this one
    const { results } = await this.db
      .prepare(
        `SELECT DISTINCT d.to_id FROM dependencies d
         WHERE d.from_id = ? AND d.type = 'blocks'`
      )
      .bind(completedIssueId)
      .all<{ to_id: string }>();

    const unblocked: string[] = [];

    for (const { to_id } of results) {
      // Check if still blocked by other issues
      const { results: stillBlocked } = await this.db
        .prepare(
          `SELECT 1 FROM dependencies d
           JOIN issues i ON i.id = d.from_id
           WHERE d.to_id = ? AND d.type = 'blocks'
           AND d.from_id != ?
           AND i.status NOT IN ('done', 'cancelled')
           LIMIT 1`
        )
        .bind(to_id, completedIssueId)
        .all();

      if (stillBlocked.length === 0) {
        const issue = await this.getIssue(to_id);
        if (issue?.status === 'blocked') {
          await this.updateIssue(to_id, { status: 'open' });
          unblocked.push(to_id);
        }
      }
    }

    return unblocked;
  }

  private rowToProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      status: row.status as ProjectStatus,
      successCriteria: row.success_criteria as string,
      createdAt: row.created_at as number,
      completedAt: row.completed_at as number | null,
      metadata: JSON.parse((row.metadata as string) || '{}'),
    };
  }

  // rowToIssue moved to shared utils.ts

  private rowToDependency(row: Record<string, unknown>): Dependency {
    return {
      fromId: row.from_id as string,
      toId: row.to_id as string,
      type: row.type as DependencyType,
      createdAt: row.created_at as number,
    };
  }

  private rowToOutcome(row: Record<string, unknown>): Outcome {
    return {
      id: row.id as string,
      issueId: row.issue_id as string,
      agentId: row.agent_id as string,
      result: row.result as OutcomeResult,
      learnings: row.learnings as string,
      metadata: JSON.parse((row.metadata as string) || '{}'),
      recordedAt: row.recorded_at as number,
    };
  }
}
