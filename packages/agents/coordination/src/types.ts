/**
 * @create-something/agent-coordination
 *
 * Types for multi-agent coordination layer.
 * Graph-based task tracking with claims, dependencies, and health monitoring.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Entities
// ─────────────────────────────────────────────────────────────────────────────

export type IssueStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export type DependencyType =
  | 'blocks'          // A must complete before B can start
  | 'informs'         // A's result affects how B is approached
  | 'discovered_from' // B was discovered while working on A
  | 'any_of';         // Speculative: any one completing unblocks parent

export type OutcomeResult = 'success' | 'failure' | 'partial' | 'cancelled';

export interface Issue {
  id: string;
  description: string;
  status: IssueStatus;
  projectId: string | null;
  parentId: string | null;
  priority: number;           // P0=0 (highest) to P4=4 (lowest)
  labels: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
}

export interface Dependency {
  fromId: string;
  toId: string;
  type: DependencyType;
  createdAt: number;
}

export interface Outcome {
  id: string;
  issueId: string;
  agentId: string;
  result: OutcomeResult;
  learnings: string;
  metadata: Record<string, unknown>;
  recordedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Agent Coordination
// ─────────────────────────────────────────────────────────────────────────────

export interface Claim {
  issueId: string;
  agentId: string;
  claimedAt: number;
  expiresAt: number | null;   // null = no expiration
  heartbeatAt: number;
}

export interface AgentRegistration {
  agentId: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'dead';
  lastSeenAt: number;
  metadata: Record<string, unknown>;
}

export interface Broadcast {
  id: number;
  eventType: 'completed' | 'blocked' | 'discovered' | 'claimed' | 'released';
  issueId: string;
  agentId: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects (Specific Directives)
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  successCriteria: string;
  createdAt: number;
  completedAt: number | null;
  metadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ethos (Health Directive)
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthMetrics {
  coherence: number;      // Ratio of issues linked to projects (0-1)
  velocity: number;       // Issues completed per hour
  blockage: number;       // Ratio of blocked to open issues (0-1)
  staleness: number;      // Average age of open issues in seconds
  claimHealth: number;    // Ratio of active claims to open issues (0-1)
  agentHealth: number;    // Ratio of active agents to registered (0-1)
}

export interface HealthThreshold {
  metric: keyof HealthMetrics;
  operator: 'min' | 'max';
  value: number;
  action: string;
}

export interface EthosConfig {
  principles: string[];
  thresholds: HealthThreshold[];
  checkIntervalMs: number;
}

export interface HealthViolation {
  metric: keyof HealthMetrics;
  current: number;
  threshold: number;
  action: string;
  detectedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker API
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIssueOptions {
  description: string;
  projectId?: string;
  parentId?: string;
  priority?: number;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateIssueOptions {
  description?: string;
  status?: IssueStatus;
  priority?: number;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface ClaimOptions {
  ttlMs?: number;         // Time-to-live in milliseconds
}

export interface QueryOptions {
  status?: IssueStatus | IssueStatus[];
  projectId?: string;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export interface PriorityResult {
  issue: Issue;
  score: number;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D1-compatible database interface.
 * Works with both D1Database and Durable Object SQL.
 */
export interface PreparedStatement {
  bind(...values: unknown[]): PreparedStatement;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface CoordinationDB {
  prepare(query: string): PreparedStatement;
  batch<T = unknown>(statements: unknown[]): Promise<T[]>;
  exec(query: string): Promise<void>;
}
