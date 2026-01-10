// Agentic Layer Type Definitions

import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

// ============================================================================
// Task & Session
// ============================================================================

export interface AgenticTask {
  issueId: string;          // Beads issue ID
  epicId: string;           // Orchestration epic
  convoyId?: string;        // Convoy ID (if part of convoy)
  budget: number;           // Allocated budget in USD
  acceptanceCriteria?: string[];  // Completion requirements
}

export interface SessionContext {
  issueId: string;
  epicId: string;
  convoyId?: string;
  budget: number;
  costConsumed: number;
  iteration: number;
  iterationCosts: number[];          // Cost of each iteration
  filesModified: string[];
  status: SessionStatus;
  budgetWarned: boolean;
  budgetExhaustedReason?: string;
  terminationReason?: string;
  error?: string;
  previewUrl?: string;
  acceptanceCriteria?: string[];
}

export type SessionStatus =
  | 'running'
  | 'paused'
  | 'complete'
  | 'budget_exhausted'
  | 'error';

export interface SessionState {
  conversationHistory: Message[];
  context: SessionContext;
  lastCheckpoint: number;
}

// ============================================================================
// Messages
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

// ============================================================================
// Budget
// ============================================================================

export interface BudgetStatus {
  allocated: number;
  consumed: number;
  remaining: number;
  percentUsed: number;
  atWarningThreshold: boolean;
  atHardStop: boolean;
  estimatedIterationsRemaining: number;
}

export interface CanAffordResult {
  canAfford: boolean;
  reason?: string;
  estimatedCost?: number;
  budget: BudgetStatus;
}

// ============================================================================
// Quality Gates
// ============================================================================

export interface QualityGateResults {
  allPassed: boolean;
  failures: GateFailure[];
}

export interface GateFailure {
  gate: string;
  issue: string;
}

// ============================================================================
// Convoy
// ============================================================================

export interface ConvoyTask {
  title: string;
  description: string;
  labels?: string[];
  acceptanceCriteria?: string[];
}

export interface ConvoySubmission {
  name: string;
  tasks: ConvoyTask[];
  budget: number;
}

// ============================================================================
// Checkpoints
// ============================================================================

export interface Checkpoint {
  iteration: number;
  costConsumed: number;
  filesModified: string[];
  conversationHistory: Message[];
  timestamp: number;
}

// ============================================================================
// Events
// ============================================================================

export type EventType =
  | 'session_started'
  | 'budget_warning'
  | 'budget_exhausted'
  | 'completion_rejected'
  | 'quality_gate_failed'
  | 'checkpoint_created'
  | 'session_completed'
  | 'session_error';

export interface AgenticEvent {
  sessionId?: string;
  issueId: string;
  eventType: EventType;
  eventData: any;
  createdAt: number;
}

// ============================================================================
// Beads Integration
// ============================================================================

export interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  labels: string[];
  status: string;
  acceptance?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Environment Bindings
// ============================================================================

export interface Env {
  ANTHROPIC_API_KEY: string;
  DB: D1Database;
  AGENTIC_QUEUE: Queue;
  AGENTIC_SESSION: DurableObjectNamespace;
  SITE_BUCKET: R2Bucket;
}
