/**
 * Proposal Management
 * 
 * CRUD operations for agent proposals with built-in guardrails.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  Proposal, 
  StoredProposal, 
  ValidationResult,
  AppliedChange 
} from '$lib/types/proposals';
import { validateProposal, canAutoApply, getAutoApproveDeadline } from './guardrails';
import { logAudit } from './audit';

/**
 * Generate unique proposal ID
 */
function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new proposal (with validation)
 */
export async function createProposal(
  db: D1Database,
  proposal: Proposal,
  agentId: string = 'agent'
): Promise<{ success: boolean; proposalId?: string; error?: string; warnings?: string[] }> {
  // Validate against guardrails
  const validation = validateProposal(proposal);
  
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }
  
  const id = generateProposalId();
  const now = Date.now();
  const autoApproveAfter = getAutoApproveDeadline(proposal);
  
  try {
    await db.prepare(`
      INSERT INTO agent_proposals (
        id, change_type, impact_level,
        title, description, justification,
        current_value, proposed_value, rollback_plan,
        affected_users_estimate, conversion_impact_estimate,
        source_pattern_id, source_evidence,
        status, auto_approve_after,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).bind(
      id,
      proposal.changeType,
      proposal.impactLevel,
      proposal.title,
      proposal.description,
      proposal.justification,
      JSON.stringify(proposal.currentValue),
      JSON.stringify(proposal.proposedValue),
      proposal.rollbackPlan,
      proposal.affectedUsersEstimate || null,
      proposal.conversionImpactEstimate || null,
      proposal.sourcePatternId || null,
      proposal.sourceEvidence ? JSON.stringify(proposal.sourceEvidence) : null,
      autoApproveAfter,
      now,
      now
    ).run();
    
    // Log the proposal creation
    await logAudit(db, {
      actorType: 'agent',
      actorId: agentId,
      action: 'propose',
      targetType: 'proposal',
      targetId: id,
      details: {
        changeType: proposal.changeType,
        impactLevel: proposal.impactLevel,
        title: proposal.title,
        canAutoApply: canAutoApply(proposal),
        autoApproveAfter
      }
    });
    
    return { 
      success: true, 
      proposalId: id,
      warnings: validation.warnings 
    };
  } catch (error) {
    console.error('Failed to create proposal:', error);
    return { success: false, error: 'Database error creating proposal' };
  }
}

/**
 * Get pending proposals
 */
export async function getPendingProposals(
  db: D1Database,
  limit: number = 50
): Promise<StoredProposal[]> {
  const result = await db.prepare(`
    SELECT * FROM agent_proposals 
    WHERE status = 'pending'
    ORDER BY 
      CASE impact_level 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      created_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return (result.results || []).map(parseProposalRow);
}

/**
 * Get a proposal by ID
 */
export async function getProposal(
  db: D1Database,
  id: string
): Promise<StoredProposal | null> {
  const result = await db.prepare(`
    SELECT * FROM agent_proposals WHERE id = ?
  `).bind(id).first();
  
  return result ? parseProposalRow(result) : null;
}

/**
 * Approve a proposal
 */
export async function approveProposal(
  db: D1Database,
  id: string,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(db, id);
  
  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }
  
  if (proposal.status !== 'pending') {
    return { success: false, error: `Cannot approve proposal with status '${proposal.status}'` };
  }
  
  const now = Date.now();
  
  try {
    await db.prepare(`
      UPDATE agent_proposals 
      SET status = 'approved', reviewed_at = ?, reviewed_by = ?, reviewer_notes = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, reviewerId, notes || null, now, id).run();
    
    await logAudit(db, {
      actorType: 'human',
      actorId: reviewerId,
      action: 'approve',
      targetType: 'proposal',
      targetId: id,
      details: { notes },
      beforeState: { status: 'pending' },
      afterState: { status: 'approved' }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to approve proposal:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Reject a proposal
 */
export async function rejectProposal(
  db: D1Database,
  id: string,
  reviewerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const proposal = await getProposal(db, id);
  
  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }
  
  if (proposal.status !== 'pending') {
    return { success: false, error: `Cannot reject proposal with status '${proposal.status}'` };
  }
  
  const now = Date.now();
  
  try {
    await db.prepare(`
      UPDATE agent_proposals 
      SET status = 'rejected', reviewed_at = ?, reviewed_by = ?, reviewer_notes = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, reviewerId, reason, now, id).run();
    
    await logAudit(db, {
      actorType: 'human',
      actorId: reviewerId,
      action: 'reject',
      targetType: 'proposal',
      targetId: id,
      details: { reason },
      beforeState: { status: 'pending' },
      afterState: { status: 'rejected' }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reject proposal:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Apply an approved proposal
 */
export async function applyProposal(
  db: D1Database,
  id: string,
  appliedBy: string
): Promise<{ success: boolean; changeId?: string; error?: string }> {
  const proposal = await getProposal(db, id);
  
  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }
  
  if (proposal.status !== 'approved') {
    return { success: false, error: `Cannot apply proposal with status '${proposal.status}'. Must be approved first.` };
  }
  
  const now = Date.now();
  const changeId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Record the applied change
    await db.prepare(`
      INSERT INTO applied_changes (
        id, proposal_id, change_type, target,
        before_value, after_value, is_active,
        applied_at, applied_by
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      changeId,
      id,
      proposal.changeType,
      `config:${proposal.changeType}`,
      JSON.stringify(proposal.currentValue),
      JSON.stringify(proposal.proposedValue),
      now,
      appliedBy
    ).run();
    
    // Update proposal status
    await db.prepare(`
      UPDATE agent_proposals 
      SET status = 'applied', applied_at = ?, applied_by = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, appliedBy, now, id).run();
    
    await logAudit(db, {
      actorType: appliedBy === 'agent' ? 'agent' : 'human',
      actorId: appliedBy,
      action: 'apply',
      targetType: 'proposal',
      targetId: id,
      details: { changeId, changeType: proposal.changeType },
      beforeState: proposal.currentValue,
      afterState: proposal.proposedValue
    });
    
    return { success: true, changeId };
  } catch (error) {
    console.error('Failed to apply proposal:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Rollback an applied change
 */
export async function rollbackChange(
  db: D1Database,
  changeId: string,
  rolledBackBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const change = await db.prepare(`
    SELECT * FROM applied_changes WHERE id = ? AND is_active = 1
  `).bind(changeId).first<any>();
  
  if (!change) {
    return { success: false, error: 'Active change not found' };
  }
  
  const now = Date.now();
  
  try {
    // Mark change as rolled back
    await db.prepare(`
      UPDATE applied_changes 
      SET is_active = 0, rolled_back_at = ?, rolled_back_by = ?
      WHERE id = ?
    `).bind(now, rolledBackBy, changeId).run();
    
    // Update proposal status
    await db.prepare(`
      UPDATE agent_proposals 
      SET status = 'rolled_back', rolled_back_at = ?, rolled_back_by = ?, rollback_reason = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, rolledBackBy, reason, now, change.proposal_id).run();
    
    await logAudit(db, {
      actorType: 'human',
      actorId: rolledBackBy,
      action: 'rollback',
      targetType: 'proposal',
      targetId: change.proposal_id,
      details: { changeId, reason },
      beforeState: JSON.parse(change.after_value),
      afterState: JSON.parse(change.before_value),
      reason
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to rollback change:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Get active applied changes
 */
export async function getActiveChanges(db: D1Database): Promise<AppliedChange[]> {
  const result = await db.prepare(`
    SELECT * FROM applied_changes WHERE is_active = 1 ORDER BY applied_at DESC
  `).all();
  
  return (result.results || []).map(row => ({
    id: row.id as string,
    proposalId: row.proposal_id as string,
    changeType: row.change_type as any,
    target: row.target as string,
    beforeValue: JSON.parse(row.before_value as string),
    afterValue: JSON.parse(row.after_value as string),
    isActive: row.is_active === 1,
    appliedAt: row.applied_at as number,
    appliedBy: row.applied_by as string,
    rolledBackAt: row.rolled_back_at as number | undefined,
    rolledBackBy: row.rolled_back_by as string | undefined
  }));
}

/**
 * Parse database row to StoredProposal
 */
function parseProposalRow(row: any): StoredProposal {
  return {
    id: row.id,
    changeType: row.change_type,
    impactLevel: row.impact_level,
    title: row.title,
    description: row.description,
    justification: row.justification,
    currentValue: JSON.parse(row.current_value),
    proposedValue: JSON.parse(row.proposed_value),
    rollbackPlan: row.rollback_plan,
    affectedUsersEstimate: row.affected_users_estimate || undefined,
    conversionImpactEstimate: row.conversion_impact_estimate || undefined,
    sourcePatternId: row.source_pattern_id || undefined,
    sourceEvidence: row.source_evidence ? JSON.parse(row.source_evidence) : undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewerNotes: row.reviewer_notes || undefined,
    appliedAt: row.applied_at || undefined,
    appliedBy: row.applied_by || undefined,
    rolledBackAt: row.rolled_back_at || undefined,
    rolledBackBy: row.rolled_back_by || undefined,
    rollbackReason: row.rollback_reason || undefined,
    autoApproveAfter: row.auto_approve_after || undefined
  };
}
