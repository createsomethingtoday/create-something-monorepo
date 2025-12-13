/**
 * @create-something/agent-coordination
 *
 * Priority algorithms for multi-agent coordination.
 * Implements graph-based prioritization: Critical Path, Impact Score, PageRank-lite.
 */

import type { CoordinationDB, Issue, PriorityResult } from './types.js';
import { Tracker } from './tracker.js';

/**
 * Priority calculator for issue ordering.
 * Uses graph analysis to surface highest-impact work.
 */
export class Priority {
  private tracker: Tracker;

  constructor(private db: CoordinationDB) {
    this.tracker = new Tracker(db);
  }

  /**
   * Get prioritized list of ready issues.
   * Combines multiple signals: impact, priority level, age, dependencies.
   */
  async getPrioritized(limit: number = 10): Promise<PriorityResult[]> {
    // Get all ready issues (open, not blocked, not claimed)
    const ready = await this.tracker.getReadyIssues(100);

    if (ready.length === 0) {
      return [];
    }

    // Calculate scores for each issue
    const scored: PriorityResult[] = [];

    for (const issue of ready) {
      const score = await this.calculateScore(issue);
      scored.push(score);
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Calculate priority score for a single issue.
   * Higher score = should be worked on first.
   */
  async calculateScore(issue: Issue): Promise<PriorityResult> {
    const factors: { name: string; value: number; weight: number }[] = [];

    // 1. Priority level (P0=highest, P4=lowest)
    // Invert so P0 gets highest score
    const priorityScore = (4 - issue.priority) / 4;
    factors.push({ name: 'priority', value: priorityScore, weight: 0.3 });

    // 2. Impact: How many issues does this unblock?
    const impactScore = await this.calculateImpact(issue.id);
    factors.push({ name: 'impact', value: impactScore, weight: 0.35 });

    // 3. Age: Older issues get slight boost to prevent starvation
    const ageScore = this.calculateAgeScore(issue.createdAt);
    factors.push({ name: 'age', value: ageScore, weight: 0.1 });

    // 4. Connectivity: Is this a hub issue? (many connections)
    const connectivityScore = await this.calculateConnectivity(issue.id);
    factors.push({ name: 'connectivity', value: connectivityScore, weight: 0.15 });

    // 5. Project alignment: Issues in active projects get boost
    const projectScore = issue.projectId ? 0.5 : 0;
    factors.push({ name: 'project', value: projectScore, weight: 0.1 });

    // Calculate weighted score
    const totalScore = factors.reduce(
      (sum, f) => sum + f.value * f.weight,
      0
    );

    // Build reason string
    const topFactors = factors
      .filter((f) => f.value > 0.3)
      .sort((a, b) => b.value * b.weight - a.value * a.weight)
      .slice(0, 2)
      .map((f) => f.name);

    const reason = topFactors.length > 0
      ? `High ${topFactors.join(', ')}`
      : 'Default priority';

    return {
      issue,
      score: Math.round(totalScore * 100) / 100,
      reason,
    };
  }

  /**
   * Calculate impact score: How many issues does completing this unblock?
   * Uses recursive count of dependent issues.
   */
  async calculateImpact(issueId: string): Promise<number> {
    // Get all issues that this one blocks (directly and transitively)
    const blockedCount = await this.countBlockedIssues(issueId, new Set());

    // Normalize: 0 blocked = 0, 5+ blocked = 1
    return Math.min(blockedCount / 5, 1);
  }

  private async countBlockedIssues(issueId: string, visited: Set<string>): Promise<number> {
    if (visited.has(issueId)) return 0;
    visited.add(issueId);

    const { results } = await this.db
      .prepare(
        `SELECT d.to_id FROM dependencies d
         JOIN issues i ON i.id = d.to_id
         WHERE d.from_id = ? AND d.type = 'blocks'
         AND i.status IN ('open', 'blocked')`
      )
      .bind(issueId)
      .all<{ to_id: string }>();

    let count = results.length;

    // Recursively count transitively blocked issues
    for (const { to_id } of results) {
      count += await this.countBlockedIssues(to_id, visited);
    }

    return count;
  }

  /**
   * Calculate age score: Older issues get slight priority boost.
   * Prevents issue starvation.
   */
  private calculateAgeScore(createdAt: number): number {
    const now = Math.floor(Date.now() / 1000);
    const ageSeconds = now - createdAt;
    const ageDays = ageSeconds / (24 * 60 * 60);

    // Score increases with age, maxes out at 7 days
    return Math.min(ageDays / 7, 1);
  }

  /**
   * Calculate connectivity score: How connected is this issue in the graph?
   * Hub issues (many connections) are often important.
   */
  async calculateConnectivity(issueId: string): Promise<number> {
    const { results } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM (
           SELECT from_id as id FROM dependencies WHERE to_id = ?
           UNION ALL
           SELECT to_id as id FROM dependencies WHERE from_id = ?
         )`
      )
      .bind(issueId, issueId)
      .all<{ count: number }>();

    const connectionCount = results[0]?.count ?? 0;

    // Normalize: 0 connections = 0, 10+ connections = 1
    return Math.min(connectionCount / 10, 1);
  }

  /**
   * Get the critical path: sequence of issues that, if delayed, delay everything.
   */
  async getCriticalPath(): Promise<Issue[]> {
    // Find issues with no dependents (end of chains)
    const { results: endpoints } = await this.db
      .prepare(
        `SELECT i.* FROM issues i
         WHERE i.status IN ('open', 'blocked', 'in_progress')
         AND NOT EXISTS (
           SELECT 1 FROM dependencies d WHERE d.from_id = i.id AND d.type = 'blocks'
         )`
      )
      .all<Record<string, unknown>>();

    if (endpoints.length === 0) {
      return [];
    }

    // Find the longest chain ending at each endpoint
    let longestPath: Issue[] = [];

    for (const endpoint of endpoints) {
      const path = await this.tracePath(endpoint.id as string, new Set());
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return longestPath;
  }

  private async tracePath(issueId: string, visited: Set<string>): Promise<Issue[]> {
    if (visited.has(issueId)) return [];
    visited.add(issueId);

    const issue = await this.tracker.getIssue(issueId);
    if (!issue) return [];

    // Get all blockers of this issue
    const { results: blockers } = await this.db
      .prepare(
        `SELECT d.from_id FROM dependencies d
         JOIN issues i ON i.id = d.from_id
         WHERE d.to_id = ? AND d.type = 'blocks'
         AND i.status IN ('open', 'blocked', 'in_progress')`
      )
      .bind(issueId)
      .all<{ from_id: string }>();

    if (blockers.length === 0) {
      return [issue];
    }

    // Find longest path through blockers
    let longestPath: Issue[] = [];

    for (const { from_id } of blockers) {
      const path = await this.tracePath(from_id, new Set(visited));
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return [...longestPath, issue];
  }

  /**
   * Get bottleneck issues: issues blocking the most other work.
   */
  async getBottlenecks(limit: number = 5): Promise<PriorityResult[]> {
    const { results } = await this.db
      .prepare(
        `SELECT i.*, COUNT(d.to_id) as blocked_count
         FROM issues i
         JOIN dependencies d ON d.from_id = i.id AND d.type = 'blocks'
         JOIN issues blocked ON blocked.id = d.to_id AND blocked.status IN ('open', 'blocked')
         WHERE i.status IN ('open', 'in_progress')
         GROUP BY i.id
         ORDER BY blocked_count DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<Record<string, unknown> & { blocked_count: number }>();

    return results.map((row) => ({
      issue: this.rowToIssue(row),
      score: row.blocked_count,
      reason: `Blocking ${row.blocked_count} issue(s)`,
    }));
  }

  private rowToIssue(row: Record<string, unknown>): Issue {
    return {
      id: row.id as string,
      description: row.description as string,
      status: row.status as Issue['status'],
      projectId: row.project_id as string | null,
      parentId: row.parent_id as string | null,
      priority: row.priority as number,
      labels: JSON.parse((row.labels as string) || '[]'),
      metadata: JSON.parse((row.metadata as string) || '{}'),
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      resolvedAt: row.resolved_at as number | null,
    };
  }
}
