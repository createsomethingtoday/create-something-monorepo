/**
 * @create-something/agent-coordination
 *
 * Multi-agent coordination layer for Cloudflare Workers.
 * Graph-based task tracking with claims, dependencies, and health monitoring.
 *
 * Philosophy: Hierarchical telos—ethos creates context for specific directives.
 * "The system tends itself so that it can tend to the work."
 */

// Core types
export type {
  // Entities
  Issue,
  IssueStatus,
  Dependency,
  DependencyType,
  Outcome,
  OutcomeResult,
  Project,
  ProjectStatus,

  // Multi-agent
  Claim,
  AgentRegistration,
  Broadcast,

  // Ethos
  HealthMetrics,
  HealthThreshold,
  HealthViolation,
  EthosConfig,

  // API
  CreateIssueOptions,
  UpdateIssueOptions,
  ClaimOptions,
  QueryOptions,
  PriorityResult,

  // Database
  CoordinationDB,
} from './types.js';

// Schema
export { initializeSchema, SCHEMA_SQL, DROP_SCHEMA_SQL, dropSchema } from './schema.js';

// Core tracker
export { Tracker } from './tracker.js';

// Multi-agent coordination
export { Claims } from './claims.js';

// Priority algorithms
export { Priority } from './priority.js';

// Capability-based routing
export { Router } from './routing.js';

// Ethos layer
export { Ethos, DEFAULT_ETHOS_CONFIG } from './ethos.js';

/**
 * Coordinator: Unified API for multi-agent coordination.
 * Combines all subsystems into a single interface.
 */
import type { CoordinationDB, EthosConfig } from './types.js';
import { initializeSchema } from './schema.js';
import { Tracker } from './tracker.js';
import { Claims } from './claims.js';
import { Priority } from './priority.js';
import { Router } from './routing.js';
import { Ethos } from './ethos.js';

export class Coordinator {
  public readonly tracker: Tracker;
  public readonly claims: Claims;
  public readonly priority: Priority;
  public readonly router: Router;
  public readonly ethos: Ethos;

  constructor(
    private db: CoordinationDB,
    ethosConfig?: Partial<EthosConfig>
  ) {
    this.tracker = new Tracker(db);
    this.claims = new Claims(db);
    this.priority = new Priority(db);
    this.router = new Router(db);
    this.ethos = new Ethos(db, ethosConfig);
  }

  /**
   * Initialize the coordination schema.
   * Safe to call multiple times.
   */
  async initialize(): Promise<void> {
    await initializeSchema(this.db);
  }

  /**
   * Agent workflow: Get next work item.
   * Handles registration, heartbeat, and priority.
   */
  async getNextWork(
    agentId: string,
    capabilities: string[] = []
  ): Promise<{
    issue: import('./types.js').Issue;
    claimed: boolean;
  } | null> {
    // Register/update agent
    await this.claims.registerAgent(agentId, capabilities);

    // Heartbeat
    await this.claims.heartbeat(agentId);

    // Get next prioritized issue for this agent
    const result = await this.router.getNextFor(agentId);
    if (!result) return null;

    // Attempt to claim
    const claimed = await this.claims.claim(result.issue.id, agentId);

    return { issue: result.issue, claimed };
  }

  /**
   * Agent workflow: Complete work item.
   * Records outcome and unblocks dependents.
   */
  async completeWork(
    issueId: string,
    agentId: string,
    result: import('./types.js').OutcomeResult,
    learnings: string = ''
  ): Promise<string[]> {
    // Record outcome (also updates issue status)
    await this.tracker.recordOutcome(issueId, agentId, result, learnings);

    // Release claim
    await this.claims.release(issueId, agentId);

    // Return list of unblocked issue IDs
    // (The tracker.recordOutcome already unblocks, but we can query for confirmation)
    const deps = await this.tracker.getDependencies(issueId);
    return deps.blocking.map((d) => d.toId);
  }

  /**
   * Monitoring: Run health check cycle.
   */
  async runHealthCheck() {
    return this.ethos.runCycle();
  }
}
