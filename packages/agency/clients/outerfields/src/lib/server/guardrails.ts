/**
 * Guardrails Validation
 * 
 * Enforces boundaries on what the AI agent can propose.
 * All proposals must pass validation before being created.
 */

import {
  ALLOWED_CHANGE_TYPES,
  APPROVED_CTA_COPY,
  BLOCKED_PATTERNS,
  VALUE_BOUNDS,
  type Proposal,
  type ValidationResult,
  type ChangeType,
  type ImpactLevel
} from '$lib/types/proposals';

/**
 * Validate a proposal against guardrails
 */
export function validateProposal(proposal: Proposal): ValidationResult {
  const warnings: string[] = [];
  
  // 1. Check if change type is allowed
  if (!ALLOWED_CHANGE_TYPES.includes(proposal.changeType as any)) {
    return {
      valid: false,
      reason: `Change type '${proposal.changeType}' is not in the allowed list. Allowed types: ${ALLOWED_CHANGE_TYPES.join(', ')}`
    };
  }
  
  // 2. Check for blocked patterns in description and justification
  const textToCheck = `${proposal.title} ${proposal.description} ${proposal.justification}`;
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return {
        valid: false,
        reason: `Proposal contains blocked pattern: ${pattern.toString()}. This type of change requires human-initiated development.`
      };
    }
  }
  
  // 3. Check value bounds for numeric changes
  if (typeof proposal.proposedValue === 'number') {
    const bounds = VALUE_BOUNDS[proposal.changeType];
    
    if (bounds) {
      if (proposal.proposedValue < bounds.min || proposal.proposedValue > bounds.max) {
        return {
          valid: false,
          reason: `Value ${proposal.proposedValue} is outside allowed bounds [${bounds.min}, ${bounds.max}] for ${proposal.changeType}`
        };
      }
    }
  }
  
  // 4. Check CTA text against approved library
  if (proposal.changeType === 'cta_text') {
    const proposedText = String(proposal.proposedValue);
    
    if (!APPROVED_CTA_COPY.includes(proposedText as any)) {
      return {
        valid: false,
        reason: `CTA text "${proposedText}" is not in the approved copy library. Approved options: ${APPROVED_CTA_COPY.join(', ')}`
      };
    }
  }
  
  // 5. Validate impact level matches change type
  const impactValidation = validateImpactLevel(proposal.changeType, proposal.impactLevel);
  if (!impactValidation.valid) {
    return impactValidation;
  }
  
  // 6. Check for required fields
  if (!proposal.rollbackPlan || proposal.rollbackPlan.trim().length < 10) {
    return {
      valid: false,
      reason: 'Proposal must include a detailed rollback plan (at least 10 characters)'
    };
  }
  
  if (!proposal.justification || proposal.justification.trim().length < 20) {
    return {
      valid: false,
      reason: 'Proposal must include a data-backed justification (at least 20 characters)'
    };
  }
  
  // 7. Warn about high-impact changes
  if (proposal.impactLevel === 'high') {
    warnings.push('High-impact proposal will require admin approval before application');
  }
  
  if (proposal.affectedUsersEstimate && proposal.affectedUsersEstimate > 1000) {
    warnings.push(`This change may affect ${proposal.affectedUsersEstimate} users`);
  }
  
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate impact level for change type
 */
function validateImpactLevel(changeType: ChangeType, impactLevel: ImpactLevel): ValidationResult {
  // Some change types can never be high/critical
  const maxImpactByType: Record<ChangeType, ImpactLevel> = {
    'preview_duration': 'medium',
    'cta_text': 'low',
    'spacing_adjustment': 'low',
    'element_visibility': 'low',
    'animation_timing': 'low',
    'feature_flag_toggle': 'medium',
    'content_order': 'low',
    'gate_messaging': 'medium',
  };
  
  const maxImpact = maxImpactByType[changeType];
  const impactOrder: ImpactLevel[] = ['low', 'medium', 'high', 'critical'];
  
  if (impactOrder.indexOf(impactLevel) > impactOrder.indexOf(maxImpact)) {
    return {
      valid: false,
      reason: `Change type '${changeType}' cannot have impact level '${impactLevel}'. Maximum allowed: '${maxImpact}'`
    };
  }
  
  return { valid: true };
}

/**
 * Determine if a proposal can auto-apply
 */
export function canAutoApply(proposal: Proposal): boolean {
  // Only low-impact proposals can auto-apply
  if (proposal.impactLevel !== 'low') {
    return false;
  }
  
  // Only certain change types can auto-apply
  const autoApplyTypes: ChangeType[] = [
    'spacing_adjustment',
    'element_visibility',
    'animation_timing',
  ];
  
  return autoApplyTypes.includes(proposal.changeType);
}

/**
 * Calculate auto-approve deadline (24 hours for low-impact)
 */
export function getAutoApproveDeadline(proposal: Proposal): number | null {
  if (!canAutoApply(proposal)) {
    return null;
  }
  
  // Auto-approve after 24 hours if no objection
  return Date.now() + (24 * 60 * 60 * 1000);
}

/**
 * Check if proposal text suggests a major change
 * Used to provide helpful guidance to the agent
 */
export function detectMajorChangeIntent(text: string): string[] {
  const suggestions: string[] = [];
  
  const majorChangeIndicators = [
    { pattern: /add.*page|new.*route|create.*page/i, suggestion: 'Adding pages requires human-initiated development. Consider proposing a navigation hint instead.' },
    { pattern: /change.*price|update.*pricing|modify.*cost/i, suggestion: 'Pricing changes are outside agent scope. Use pcn_escalate_to_human to flag this for review.' },
    { pattern: /auth|login|permission/i, suggestion: 'Authentication changes require security review. Escalate this to a human.' },
    { pattern: /database|schema|migration/i, suggestion: 'Database changes are outside agent scope. Document the pattern and escalate.' },
  ];
  
  for (const { pattern, suggestion } of majorChangeIndicators) {
    if (pattern.test(text)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}
