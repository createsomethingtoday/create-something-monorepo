/**
 * @create-something/agent-coordination
 *
 * Ethos layer: Health monitoring and directive generation.
 * The general health directive that creates context for specific work.
 *
 * "The system tends itself so that it can tend to the work."
 */

import type {
  CoordinationDB,
  HealthMetrics,
  HealthThreshold,
  HealthViolation,
  EthosConfig,
  Project,
} from './types.js';
import { Tracker } from './tracker.js';
import { Claims } from './claims.js';

/**
 * Default ethos configuration.
 * Principles and thresholds for system health.
 */
export const DEFAULT_ETHOS_CONFIG: EthosConfig = {
  principles: [
    'Coherence: All work should connect to active projects',
    'Effectiveness: Blocked issues should be surfaced and resolved',
    'Alignment: Work should trace to organizational purpose',
    'Sustainability: Agents should not be overloaded',
  ],
  thresholds: [
    { metric: 'coherence', operator: 'min', value: 0.7, action: 'create-linking-project' },
    { metric: 'blockage', operator: 'max', value: 0.3, action: 'prioritize-blockers' },
    { metric: 'staleness', operator: 'max', value: 7 * 24 * 60 * 60, action: 'prune-or-revive' },
    { metric: 'claimHealth', operator: 'min', value: 0.3, action: 'rebalance-work' },
    { metric: 'agentHealth', operator: 'min', value: 0.5, action: 'alert-agent-failures' },
  ],
  checkIntervalMs: 60 * 1000, // 1 minute
};

/**
 * Ethos layer for health monitoring and directive generation.
 * Monitors system health and creates projects when health degrades.
 */
export class Ethos {
  private tracker: Tracker;
  private claims: Claims;
  private config: EthosConfig;

  constructor(
    private db: CoordinationDB,
    config: Partial<EthosConfig> = {}
  ) {
    this.tracker = new Tracker(db);
    this.claims = new Claims(db);
    this.config = { ...DEFAULT_ETHOS_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Health Assessment
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate current health metrics.
   */
  async assessHealth(): Promise<HealthMetrics> {
    const [coherence, velocity, blockage, staleness, claimHealth, agentHealth] =
      await Promise.all([
        this.calculateCoherence(),
        this.calculateVelocity(),
        this.calculateBlockage(),
        this.calculateStaleness(),
        this.calculateClaimHealth(),
        this.calculateAgentHealth(),
      ]);

    const metrics: HealthMetrics = {
      coherence,
      velocity,
      blockage,
      staleness,
      claimHealth,
      agentHealth,
    };

    // Record snapshot
    await this.recordSnapshot(metrics);

    return metrics;
  }

  /**
   * Coherence: Ratio of issues linked to active projects.
   */
  private async calculateCoherence(): Promise<number> {
    const { results: total } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM issues WHERE status IN ('open', 'in_progress', 'blocked')`
      )
      .all<{ count: number }>();

    const { results: linked } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM issues
         WHERE status IN ('open', 'in_progress', 'blocked')
         AND project_id IS NOT NULL`
      )
      .all<{ count: number }>();

    const totalCount = total[0]?.count ?? 0;
    const linkedCount = linked[0]?.count ?? 0;

    if (totalCount === 0) return 1; // No issues = perfectly coherent
    return linkedCount / totalCount;
  }

  /**
   * Velocity: Issues completed per hour (rolling 24h).
   */
  private async calculateVelocity(): Promise<number> {
    const dayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    const { results } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM issues
         WHERE status = 'done' AND resolved_at > ?`
      )
      .bind(dayAgo)
      .all<{ count: number }>();

    const completedCount = results[0]?.count ?? 0;
    return completedCount / 24; // Per hour
  }

  /**
   * Blockage: Ratio of blocked to open issues.
   */
  private async calculateBlockage(): Promise<number> {
    const { results: open } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM issues WHERE status IN ('open', 'in_progress')`
      )
      .all<{ count: number }>();

    const { results: blocked } = await this.db
      .prepare(`SELECT COUNT(*) as count FROM issues WHERE status = 'blocked'`)
      .all<{ count: number }>();

    const openCount = open[0]?.count ?? 0;
    const blockedCount = blocked[0]?.count ?? 0;
    const total = openCount + blockedCount;

    if (total === 0) return 0; // No issues = no blockage
    return blockedCount / total;
  }

  /**
   * Staleness: Average age of open issues in seconds.
   */
  private async calculateStaleness(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const { results } = await this.db
      .prepare(
        `SELECT AVG(? - created_at) as avg_age FROM issues
         WHERE status IN ('open', 'in_progress', 'blocked')`
      )
      .bind(now)
      .all<{ avg_age: number | null }>();

    return results[0]?.avg_age ?? 0;
  }

  /**
   * Claim Health: Ratio of claimed issues to open issues.
   * Healthy systems have work actively being done.
   */
  private async calculateClaimHealth(): Promise<number> {
    const { results: open } = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM issues WHERE status IN ('open', 'in_progress')`
      )
      .all<{ count: number }>();

    const { results: claimed } = await this.db
      .prepare(`SELECT COUNT(*) as count FROM claims`)
      .all<{ count: number }>();

    const openCount = open[0]?.count ?? 0;
    const claimedCount = claimed[0]?.count ?? 0;

    if (openCount === 0) return 1; // No open issues = healthy
    return Math.min(claimedCount / openCount, 1);
  }

  /**
   * Agent Health: Ratio of active agents to registered agents.
   */
  private async calculateAgentHealth(): Promise<number> {
    const { results: total } = await this.db
      .prepare(`SELECT COUNT(*) as count FROM agents`)
      .all<{ count: number }>();

    const { results: active } = await this.db
      .prepare(`SELECT COUNT(*) as count FROM agents WHERE status = 'active'`)
      .all<{ count: number }>();

    const totalCount = total[0]?.count ?? 0;
    const activeCount = active[0]?.count ?? 0;

    if (totalCount === 0) return 1; // No agents registered = N/A
    return activeCount / totalCount;
  }

  /**
   * Record health snapshot for historical tracking.
   */
  private async recordSnapshot(metrics: HealthMetrics): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO health_snapshots
         (coherence, velocity, blockage, staleness, claim_health, agent_health, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        metrics.coherence,
        metrics.velocity,
        metrics.blockage,
        metrics.staleness,
        metrics.claimHealth,
        metrics.agentHealth,
        now
      )
      .run();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Violation Detection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check current health against thresholds.
   */
  async checkViolations(): Promise<HealthViolation[]> {
    const metrics = await this.assessHealth();
    const violations: HealthViolation[] = [];

    for (const threshold of this.config.thresholds) {
      const current = metrics[threshold.metric];
      let violated = false;

      if (threshold.operator === 'min' && current < threshold.value) {
        violated = true;
      } else if (threshold.operator === 'max' && current > threshold.value) {
        violated = true;
      }

      if (violated) {
        violations.push({
          metric: threshold.metric,
          current,
          threshold: threshold.value,
          action: threshold.action,
          detectedAt: Math.floor(Date.now() / 1000),
        });
      }
    }

    return violations;
  }

  /**
   * Respond to violations by creating remediation projects.
   */
  async respondToViolations(violations: HealthViolation[]): Promise<Project[]> {
    const projects: Project[] = [];

    for (const violation of violations) {
      const project = await this.createRemediationProject(violation);
      if (project) {
        projects.push(project);
      }
    }

    return projects;
  }

  private async createRemediationProject(
    violation: HealthViolation
  ): Promise<Project | null> {
    // Check if remediation project already exists
    const existingProjects = await this.tracker.listProjects('active');
    const hasExisting = existingProjects.some(
      (p) => p.metadata.remediationFor === violation.metric
    );

    if (hasExisting) {
      return null; // Already addressing this
    }

    const descriptions: Record<string, { name: string; description: string; criteria: string }> = {
      'create-linking-project': {
        name: 'Improve issue coherence',
        description: 'Link orphaned issues to projects or close stale ones',
        criteria: 'Coherence metric above 0.7',
      },
      'prioritize-blockers': {
        name: 'Resolve blocking issues',
        description: 'Focus on issues blocking the most work',
        criteria: 'Blockage ratio below 0.3',
      },
      'prune-or-revive': {
        name: 'Address stale issues',
        description: 'Close irrelevant issues or revive important ones',
        criteria: 'Average issue age below 7 days',
      },
      'rebalance-work': {
        name: 'Rebalance workload',
        description: 'Ensure work is being claimed and processed',
        criteria: 'Claim health above 0.3',
      },
      'alert-agent-failures': {
        name: 'Investigate agent health',
        description: 'Check why agents are failing or going idle',
        criteria: 'Agent health above 0.5',
      },
    };

    const desc = descriptions[violation.action];
    if (!desc) return null;

    return this.tracker.createProject(desc.name, {
      description: desc.description,
      successCriteria: desc.criteria,
      metadata: {
        remediationFor: violation.metric,
        violation,
        autoGenerated: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Health History
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get health history over time.
   */
  async getHealthHistory(
    hours: number = 24
  ): Promise<Array<HealthMetrics & { recordedAt: number }>> {
    const cutoff = Math.floor(Date.now() / 1000) - hours * 60 * 60;

    const { results } = await this.db
      .prepare(
        `SELECT * FROM health_snapshots
         WHERE recorded_at > ?
         ORDER BY recorded_at ASC`
      )
      .bind(cutoff)
      .all<Record<string, unknown>>();

    return results.map((row) => ({
      coherence: row.coherence as number,
      velocity: row.velocity as number,
      blockage: row.blockage as number,
      staleness: row.staleness as number,
      claimHealth: row.claim_health as number,
      agentHealth: row.agent_health as number,
      recordedAt: row.recorded_at as number,
    }));
  }

  /**
   * Get health trend (improving, stable, degrading).
   */
  async getHealthTrend(): Promise<{
    overall: 'improving' | 'stable' | 'degrading';
    metrics: Record<keyof HealthMetrics, 'improving' | 'stable' | 'degrading'>;
  }> {
    const history = await this.getHealthHistory(4); // Last 4 hours

    if (history.length < 2) {
      return {
        overall: 'stable',
        metrics: {
          coherence: 'stable',
          velocity: 'stable',
          blockage: 'stable',
          staleness: 'stable',
          claimHealth: 'stable',
          agentHealth: 'stable',
        },
      };
    }

    const first = history[0];
    const last = history[history.length - 1];

    const metricTrends: Record<keyof HealthMetrics, 'improving' | 'stable' | 'degrading'> = {
      coherence: this.getTrend(first.coherence, last.coherence, 'higher'),
      velocity: this.getTrend(first.velocity, last.velocity, 'higher'),
      blockage: this.getTrend(first.blockage, last.blockage, 'lower'),
      staleness: this.getTrend(first.staleness, last.staleness, 'lower'),
      claimHealth: this.getTrend(first.claimHealth, last.claimHealth, 'higher'),
      agentHealth: this.getTrend(first.agentHealth, last.agentHealth, 'higher'),
    };

    // Overall trend: majority vote
    const trends = Object.values(metricTrends);
    const improving = trends.filter((t) => t === 'improving').length;
    const degrading = trends.filter((t) => t === 'degrading').length;

    let overall: 'improving' | 'stable' | 'degrading' = 'stable';
    if (improving > degrading && improving >= 3) overall = 'improving';
    if (degrading > improving && degrading >= 3) overall = 'degrading';

    return { overall, metrics: metricTrends };
  }

  private getTrend(
    first: number,
    last: number,
    goodDirection: 'higher' | 'lower'
  ): 'improving' | 'stable' | 'degrading' {
    const change = (last - first) / (first || 1);
    const threshold = 0.1; // 10% change threshold

    if (Math.abs(change) < threshold) return 'stable';

    if (goodDirection === 'higher') {
      return change > 0 ? 'improving' : 'degrading';
    } else {
      return change < 0 ? 'improving' : 'degrading';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Monitoring Loop
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run a single monitoring cycle.
   * Checks health, detects violations, creates remediation projects.
   */
  async runCycle(): Promise<{
    metrics: HealthMetrics;
    violations: HealthViolation[];
    projects: Project[];
  }> {
    // Clean up expired claims
    await this.claims.reclaimExpired();

    // Detect dead agents
    await this.claims.detectDeadAgents();

    // Assess health
    const metrics = await this.assessHealth();

    // Check violations
    const violations = await this.checkViolations();

    // Respond to violations
    const projects = await this.respondToViolations(violations);

    return { metrics, violations, projects };
  }
}
