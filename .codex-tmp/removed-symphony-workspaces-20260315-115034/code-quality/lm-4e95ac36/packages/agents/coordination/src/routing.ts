/**
 * @create-something/agent-coordination
 *
 * Capability-based routing for multi-agent coordination.
 * Matches issues to agents based on capabilities and availability.
 */

import type { CoordinationDB, Issue, AgentRegistration, PriorityResult } from './types.js';
import { Tracker } from './tracker.js';
import { Claims } from './claims.js';
import { Priority } from './priority.js';

/**
 * Router for matching issues to agents.
 * Considers capabilities, availability, and workload.
 */
export class Router {
  private tracker: Tracker;
  private claims: Claims;
  private priority: Priority;

  constructor(private db: CoordinationDB) {
    this.tracker = new Tracker(db);
    this.claims = new Claims(db);
    this.priority = new Priority(db);
  }

  /**
   * Get the next best issue for a specific agent.
   * Considers agent capabilities and current workload.
   */
  async getNextFor(
    agentId: string,
    options: {
      maxConcurrent?: number;
      preferLabels?: string[];
    } = {}
  ): Promise<PriorityResult | null> {
    const maxConcurrent = options.maxConcurrent ?? 1;

    // Check current workload
    const currentClaims = await this.claims.getAgentClaims(agentId);
    if (currentClaims.length >= maxConcurrent) {
      return null; // Already at capacity
    }

    // Get agent capabilities
    const agent = await this.claims.getAgent(agentId);
    const capabilities = agent?.capabilities ?? [];

    // Get prioritized ready issues
    const prioritized = await this.priority.getPrioritized(50);

    // Filter by agent capabilities and preferences
    for (const result of prioritized) {
      const { issue } = result;

      // Check if issue matches agent capabilities
      if (capabilities.length > 0 && issue.labels.length > 0) {
        const hasMatchingCapability = issue.labels.some((label) =>
          capabilities.includes(label)
        );
        if (!hasMatchingCapability) {
          continue;
        }
      }

      // Prefer issues matching preferLabels
      if (options.preferLabels && options.preferLabels.length > 0) {
        const hasPreferred = issue.labels.some((label) =>
          options.preferLabels!.includes(label)
        );
        if (hasPreferred) {
          return result;
        }
      }

      // Return first matching issue
      return result;
    }

    // No capability-matched issues, return any available
    return prioritized[0] ?? null;
  }

  /**
   * Find the best agent for a specific issue.
   * Considers capabilities, workload, and recency.
   */
  async getBestAgentFor(issueId: string): Promise<AgentRegistration | null> {
    const issue = await this.tracker.getIssue(issueId);
    if (!issue) return null;

    // Get all active agents
    const agents = await this.claims.listAgents('active');
    if (agents.length === 0) return null;

    // Score each agent
    const scored: Array<{ agent: AgentRegistration; score: number }> = [];

    for (const agent of agents) {
      const score = await this.scoreAgentForIssue(agent, issue);
      scored.push({ agent, score });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.agent ?? null;
  }

  private async scoreAgentForIssue(
    agent: AgentRegistration,
    issue: Issue
  ): Promise<number> {
    let score = 0;

    // Capability match
    if (agent.capabilities.length > 0 && issue.labels.length > 0) {
      const matchCount = issue.labels.filter((label) =>
        agent.capabilities.includes(label)
      ).length;
      score += matchCount * 0.3;
    }

    // Workload: Prefer agents with fewer claims
    const claims = await this.claims.getAgentClaims(agent.agentId);
    score += Math.max(0, (5 - claims.length) / 5) * 0.3;

    // Recency: Prefer recently active agents
    const now = Math.floor(Date.now() / 1000);
    const idleSeconds = now - agent.lastSeenAt;
    const idleMinutes = idleSeconds / 60;
    score += Math.max(0, (10 - idleMinutes) / 10) * 0.2;

    // Experience: Has this agent worked on similar issues?
    const experienceScore = await this.getExperienceScore(agent.agentId, issue);
    score += experienceScore * 0.2;

    return score;
  }

  private async getExperienceScore(
    agentId: string,
    issue: Issue
  ): Promise<number> {
    if (issue.labels.length === 0) return 0;

    // Check if agent has successfully completed similar issues
    const labelPattern = issue.labels.map((l) => `%"${l}"%`).join(' OR labels LIKE ');

    const { results } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM outcomes o
         JOIN issues i ON i.id = o.issue_id
         WHERE o.agent_id = ? AND o.result = 'success'
         AND (i.labels LIKE ${labelPattern})`
      )
      .bind(agentId)
      .all<{ count: number }>();

    const successCount = results[0]?.count ?? 0;

    // Normalize: 0 = no experience, 5+ = full experience
    return Math.min(successCount / 5, 1);
  }

  /**
   * Auto-assign ready issues to available agents.
   * Useful for batch assignment or background processing.
   */
  async autoAssign(limit: number = 10): Promise<Array<{ issue: Issue; agent: AgentRegistration }>> {
    const assignments: Array<{ issue: Issue; agent: AgentRegistration }> = [];

    // Get prioritized ready issues
    const prioritized = await this.priority.getPrioritized(limit);

    for (const { issue } of prioritized) {
      // Find best agent for this issue
      const agent = await this.getBestAgentFor(issue.id);
      if (!agent) continue;

      // Attempt to claim
      const claimed = await this.claims.claim(issue.id, agent.agentId);
      if (claimed) {
        assignments.push({ issue, agent });
      }
    }

    return assignments;
  }

  /**
   * Get workload distribution across agents.
   */
  async getWorkloadDistribution(): Promise<
    Array<{
      agent: AgentRegistration;
      claimCount: number;
      recentCompletions: number;
    }>
  > {
    const agents = await this.claims.listAgents('active');
    const distribution: Array<{
      agent: AgentRegistration;
      claimCount: number;
      recentCompletions: number;
    }> = [];

    const hourAgo = Math.floor(Date.now() / 1000) - 3600;

    for (const agent of agents) {
      const claims = await this.claims.getAgentClaims(agent.agentId);

      const { results } = await this.db
        .prepare(
          `SELECT COUNT(*) as count FROM outcomes
           WHERE agent_id = ? AND result = 'success' AND recorded_at > ?`
        )
        .bind(agent.agentId, hourAgo)
        .all<{ count: number }>();

      distribution.push({
        agent,
        claimCount: claims.length,
        recentCompletions: results[0]?.count ?? 0,
      });
    }

    return distribution;
  }
}
