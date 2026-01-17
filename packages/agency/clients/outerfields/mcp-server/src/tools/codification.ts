/**
 * Codification MCP Tools
 * 
 * Tools for proposing and managing system changes with guardrails.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Allowed change types (guardrails)
 */
const ALLOWED_CHANGE_TYPES = [
  'preview_duration',
  'cta_text', 
  'spacing_adjustment',
  'element_visibility',
  'animation_timing',
  'feature_flag_toggle',
  'content_order',
  'gate_messaging',
] as const;

/**
 * Approved CTA copy
 */
const APPROVED_CTA_COPY = [
  'Become a Founding Member',
  'Unlock Full Access',
  'Join Now - $99 Lifetime',
  'Start Watching',
  'Continue Watching',
  'Get Full Access',
  'Subscribe to Continue',
  'Claim Your Access',
];

/**
 * Value bounds
 */
const VALUE_BOUNDS = {
  preview_duration: { min: 30, max: 90, unit: 'seconds' },
  spacing_adjustment: { min: 0, max: 48, unit: 'px' },
  animation_timing: { min: 100, max: 500, unit: 'ms' },
};

export const CODIFICATION_TOOLS: Tool[] = [
  {
    name: 'pcn_suggest_improvements',
    description: `Get improvement suggestions for a detected pattern.

Based on pattern analysis, suggests small UI/UX changes that can be proposed.

IMPORTANT: This tool only suggests changes within guardrails:
- Preview duration (30-90 seconds)
- CTA text (from approved library)
- Spacing adjustments (0-48px)
- Animation timing (100-500ms)
- Feature flag toggles
- Content ordering
- Gate messaging variants

For changes outside these bounds, use pcn_escalate_to_human instead.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern_id: {
          type: 'string',
          description: 'Pattern ID to get suggestions for'
        },
        pattern_description: {
          type: 'string',
          description: 'Description of the pattern (if no ID available)'
        }
      }
    }
  },
  {
    name: 'pcn_update_rules',
    description: \`Propose a rule update based on pattern analysis.

IMPORTANT: This creates a PROPOSAL that requires human approval.
Changes are NOT applied immediately.

Allowed change types:
${ALLOWED_CHANGE_TYPES.map(t => \`- \${t}\`).join('\\n')}

Value bounds:
- preview_duration: 30-90 seconds
- spacing_adjustment: 0-48 px
- animation_timing: 100-500 ms

Approved CTA text:
${APPROVED_CTA_COPY.map(t => \`- "\${t}"\`).join('\\n')}

The proposal includes:
- Data-backed justification (required)
- Rollback plan (required)
- Impact level classification\`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        change_type: {
          type: 'string',
          enum: ALLOWED_CHANGE_TYPES as unknown as string[],
          description: 'Type of change to propose'
        },
        current_value: {
          description: 'Current value being changed'
        },
        proposed_value: {
          description: 'New value to propose'
        },
        justification: {
          type: 'string',
          description: 'Data-backed reasoning for this change (min 20 chars)'
        },
        rollback_plan: {
          type: 'string',
          description: 'How to undo this change if needed (min 10 chars)'
        },
        source_pattern_id: {
          type: 'string',
          description: 'Pattern ID that triggered this proposal (optional)'
        }
      },
      required: ['change_type', 'current_value', 'proposed_value', 'justification', 'rollback_plan']
    }
  },
  {
    name: 'pcn_escalate_to_human',
    description: \`Escalate an issue to human attention when it's outside agent guardrails.

Use this when:
- Pattern suggests a major change (new pages, pricing, auth)
- Analysis indicates structural problems
- Change would affect business logic
- Security-related concerns

This creates a ticket for human review without attempting changes.\`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern_id: {
          type: 'string',
          description: 'Related pattern ID (optional)'
        },
        title: {
          type: 'string',
          description: 'Brief title for the escalation'
        },
        analysis: {
          type: 'string',
          description: 'Your analysis of the issue'
        },
        suggested_action: {
          type: 'string',
          description: 'What you think should be done'
        },
        why_blocked: {
          type: 'string',
          description: 'Why this is outside agent guardrails'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level for human review'
        }
      },
      required: ['title', 'analysis', 'suggested_action', 'why_blocked']
    }
  },
  {
    name: 'pcn_list_proposals',
    description: `List pending proposals awaiting review.

Shows proposals created by the agent that need human approval.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'applied', 'rolled_back', 'all'],
          description: 'Filter by status (default: pending)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of proposals to return (default: 10)'
        }
      }
    }
  }
];

/**
 * Handle codification tool calls
 */
export async function handleCodificationTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'pcn_suggest_improvements':
      return handleSuggestImprovements(args);
    case 'pcn_update_rules':
      return handleUpdateRules(args);
    case 'pcn_escalate_to_human':
      return handleEscalate(args);
    case 'pcn_list_proposals':
      return handleListProposals(args);
    default:
      throw new Error(\`Unknown codification tool: \${name}\`);
  }
}

function handleSuggestImprovements(args: Record<string, unknown>): string {
  const patternId = args.pattern_id as string;
  const description = args.pattern_description as string;
  
  return \`# Improvement Suggestions

## For Pattern: \${patternId || 'Custom analysis'}
\${description ? \`\\nDescription: \${description}\` : ''}

### Available Actions (Within Guardrails)

**1. Adjust Preview Duration**
- Current default: 45 seconds
- Allowed range: 30-90 seconds
- Use when: Users drop off before seeing enough value

**2. Update Gate Messaging**
- Test different CTA copy variants
- A/B test urgency vs value messaging
- Use when: Gate shown but low conversion

**3. Adjust Animation Timing**
- Range: 100-500ms
- Use when: Interactions feel sluggish or jarring

**4. Toggle Feature Flags**
- Show/hide tooltips, hints
- Use when: Users seem confused at specific points

**5. Reorder Content**
- Change category display order
- Use when: Popular content is buried

### Outside Guardrails (Require Human)

These changes cannot be proposed by the agent:
- Adding new pages or routes
- Changing pricing or payment flow
- Modifying authentication
- Database schema changes

For these, use \`pcn_escalate_to_human\`.

### How to Propose a Change

\\\`\\\`\\\`
pcn_update_rules({
  change_type: "preview_duration",
  current_value: 45,
  proposed_value: 55,
  justification: "65% of users who dismiss the gate do so between 40-50 seconds. Extending to 55s gives more time to see value.",
  rollback_plan: "Revert preview_duration to 45 seconds"
})
\\\`\\\`\\\`
\`;
}

function handleUpdateRules(args: Record<string, unknown>): string {
  const changeType = args.change_type as string;
  const currentValue = args.current_value;
  const proposedValue = args.proposed_value;
  const justification = args.justification as string;
  const rollbackPlan = args.rollback_plan as string;
  
  // Validate change type
  if (!ALLOWED_CHANGE_TYPES.includes(changeType as any)) {
    return \`# Proposal Rejected

**Reason:** Change type '\${changeType}' is not allowed.

Allowed change types:
\${ALLOWED_CHANGE_TYPES.map(t => \`- \${t}\`).join('\\n')}

For changes outside these types, use \`pcn_escalate_to_human\`.
\`;
  }
  
  // Validate value bounds
  const bounds = VALUE_BOUNDS[changeType as keyof typeof VALUE_BOUNDS];
  if (bounds && typeof proposedValue === 'number') {
    if (proposedValue < bounds.min || proposedValue > bounds.max) {
      return \`# Proposal Rejected

**Reason:** Value \${proposedValue} is outside allowed bounds.

For \${changeType}:
- Minimum: \${bounds.min} \${bounds.unit}
- Maximum: \${bounds.max} \${bounds.unit}
- Proposed: \${proposedValue} \${bounds.unit}
\`;
    }
  }
  
  // Validate CTA text
  if (changeType === 'cta_text' && !APPROVED_CTA_COPY.includes(proposedValue as string)) {
    return \`# Proposal Rejected

**Reason:** CTA text is not in approved copy library.

Proposed: "\${proposedValue}"

Approved options:
\${APPROVED_CTA_COPY.map(t => \`- "\${t}"\`).join('\\n')}
\`;
  }
  
  // Validate justification
  if (!justification || justification.length < 20) {
    return \`# Proposal Rejected

**Reason:** Justification must be at least 20 characters with data-backed reasoning.

Provided: "\${justification || '(empty)}'}"
\`;
  }
  
  // Validate rollback plan
  if (!rollbackPlan || rollbackPlan.length < 10) {
    return \`# Proposal Rejected

**Reason:** Rollback plan must be at least 10 characters.

Provided: "\${rollbackPlan || '(empty)'}"
\`;
  }
  
  // Success - proposal would be created
  const proposalId = \`prop_\${Date.now()}_demo\`;
  
  return \`# Proposal Created

**ID:** \${proposalId}
**Status:** Pending human review

## Change Details

| Field | Value |
|-------|-------|
| Type | \${changeType} |
| Current | \${JSON.stringify(currentValue)} |
| Proposed | \${JSON.stringify(proposedValue)} |

## Justification

\${justification}

## Rollback Plan

\${rollbackPlan}

## Next Steps

1. Proposal added to review queue
2. Admin will receive notification
3. After approval, change can be applied
4. Rollback available with one click

**Note:** In production, this would insert into the \`agent_proposals\` table
and send a notification to admins.
\`;
}

function handleEscalate(args: Record<string, unknown>): string {
  const title = args.title as string;
  const analysis = args.analysis as string;
  const suggestedAction = args.suggested_action as string;
  const whyBlocked = args.why_blocked as string;
  const priority = (args.priority as string) || 'medium';
  
  const escalationId = \`esc_\${Date.now()}_demo\`;
  
  return \`# Escalation Created

**ID:** \${escalationId}
**Priority:** \${priority.toUpperCase()}
**Status:** Open

## \${title}

### Analysis

\${analysis}

### Suggested Action

\${suggestedAction}

### Why This Requires Human Intervention

\${whyBlocked}

## What Happens Next

1. Escalation logged to \`escalations\` table
2. Admin receives notification (priority: \${priority})
3. Human reviews and takes action
4. Resolution logged for future reference

**Note:** In production, this would insert into the \`escalations\` table
and trigger a notification via email/Slack.
\`;
}

function handleListProposals(args: Record<string, unknown>): string {
  const status = (args.status as string) || 'pending';
  const limit = (args.limit as number) || 10;
  
  return \`# Proposals List

**Filter:** \${status}
**Limit:** \${limit}

## No Proposals Found

The database is not connected in this context, or no proposals match the filter.

### How Proposals Work

1. Agent detects pattern via \`pcn_analyze_patterns\`
2. Agent proposes change via \`pcn_update_rules\`
3. Proposal stored with status "pending"
4. Admin reviews in dashboard
5. If approved → can be applied
6. If applied → rollback available

### Proposal Statuses

| Status | Description |
|--------|-------------|
| pending | Awaiting human review |
| approved | Approved, ready to apply |
| rejected | Rejected by reviewer |
| applied | Change is live |
| rolled_back | Was applied, then reverted |
\`;
}
