/**
 * Types for AI-native proposal and approval system
 */

/**
 * Allowed change types (guardrails)
 * These are the ONLY changes the agent can propose
 */
export const ALLOWED_CHANGE_TYPES = [
  'preview_duration',      // 30-90 seconds
  'cta_text',              // From approved library
  'spacing_adjustment',    // Within token bounds
  'element_visibility',    // Show/hide hints
  'animation_timing',      // Within performance budget
  'feature_flag_toggle',   // Non-critical flags only
  'content_order',         // Category/video ordering
  'gate_messaging',        // A/B test variants
] as const;

export type ChangeType = typeof ALLOWED_CHANGE_TYPES[number];

/**
 * Impact levels for proposals
 */
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Proposal status workflow
 */
export type ProposalStatus = 
  | 'pending'
  | 'approved' 
  | 'rejected'
  | 'applied'
  | 'rolled_back';

/**
 * Value bounds for numeric changes
 */
export const VALUE_BOUNDS: Record<string, { min: number; max: number }> = {
  preview_duration: { min: 30, max: 90 },     // seconds
  spacing_adjustment: { min: 0, max: 48 },     // px, within design tokens
  animation_timing: { min: 100, max: 500 },    // ms
  debounce: { min: 100, max: 1000 },           // ms
  rollout_percentage: { min: 0, max: 100 },    // %
};

/**
 * Approved CTA copy library
 * Agent can ONLY use these pre-approved texts
 */
export const APPROVED_CTA_COPY = [
  'Become a Founding Member',
  'Unlock Full Access',
  'Join Now - $99 Lifetime',
  'Start Watching',
  'Continue Watching',
  'Get Full Access',
  'Subscribe to Continue',
  'Claim Your Access',
  'Watch Now',
  'Preview Available',
] as const;

export type ApprovedCTACopy = typeof APPROVED_CTA_COPY[number];

/**
 * Blocked patterns - proposals containing these are rejected
 */
export const BLOCKED_PATTERNS = [
  /route|page|navigation/i,
  /price|payment|stripe|checkout.*flow/i,
  /auth|session|login|permission|role/i,
  /schema|migration|database|table/i,
  /api.*endpoint|server.*route/i,
  /security|cors|rate.?limit|cookie/i,
  /membership|subscription.*level/i,
] as const;

/**
 * Agent proposal
 */
export interface Proposal {
  id?: string;
  changeType: ChangeType;
  impactLevel: ImpactLevel;
  title: string;
  description: string;
  justification: string;
  
  // Change details
  currentValue: unknown;
  proposedValue: unknown;
  rollbackPlan: string;
  
  // Impact estimates
  affectedUsersEstimate?: number;
  conversionImpactEstimate?: number;
  
  // Source
  sourcePatternId?: string;
  sourceEvidence?: Record<string, unknown>;
}

/**
 * Stored proposal in database
 */
export interface StoredProposal extends Proposal {
  id: string;
  status: ProposalStatus;
  createdAt: number;
  updatedAt: number;
  
  // Review
  reviewedAt?: number;
  reviewedBy?: string;
  reviewerNotes?: string;
  
  // Application
  appliedAt?: number;
  appliedBy?: string;
  
  // Rollback
  rolledBackAt?: number;
  rolledBackBy?: string;
  rollbackReason?: string;
  
  // Auto-approval
  autoApproveAfter?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  actorType: 'agent' | 'human' | 'system';
  actorId: string;
  action: 'propose' | 'approve' | 'reject' | 'modify' | 'apply' | 'rollback' | 'override' | 'escalate' | 'dismiss';
  targetType: 'proposal' | 'rule' | 'feature_flag' | 'pattern' | 'escalation';
  targetId: string;
  details: Record<string, unknown>;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

/**
 * Escalation for issues beyond agent guardrails
 */
export interface Escalation {
  id: string;
  sourcePatternId?: string;
  title: string;
  analysis: string;
  suggestedAction: string;
  whyBlocked: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  assignedTo?: string;
  response?: string;
  resolution?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

/**
 * Applied change tracking
 */
export interface AppliedChange {
  id: string;
  proposalId: string;
  changeType: ChangeType;
  target: string;
  beforeValue: unknown;
  afterValue: unknown;
  isActive: boolean;
  appliedAt: number;
  appliedBy: string;
  rolledBackAt?: number;
  rolledBackBy?: string;
}
