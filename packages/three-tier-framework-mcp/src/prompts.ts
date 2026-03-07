/**
 * Three-Tier Framework — Prompt Handlers (Judgment Tier)
 * 
 * User-controlled templates that shape how agents reason.
 * MCP Prompts primitive — the Judgment tier of this server.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { TIERS, CROSS_CUTTING_CONCERNS } from './framework/definitions.js';
import { MCP_MAPPINGS, SAMPLING_EXPLANATION, POLICY_AS_ARTIFACT } from './framework/mappings.js';

// ============================================================================
// Shared context blocks
// ============================================================================

const FRAMEWORK_CONTEXT = `You are working with the Three-Tier Framework for agent systems.

The three tiers:
- **Database** (What exists): ${TIERS.database.description} Control model: ${TIERS.database.controlModel}. MCP primitive: ${TIERS.database.mcpPrimitive}.
- **Automation** (What happens): ${TIERS.automation.description} Control model: ${TIERS.automation.controlModel}. MCP primitive: ${TIERS.automation.mcpPrimitive}.
- **Judgment** (What should happen): ${TIERS.judgment.description} Control model: ${TIERS.judgment.controlModel}. MCP primitive: ${TIERS.judgment.mcpPrimitive}.

Four cross-cutting concerns span all tiers:
${CROSS_CUTTING_CONCERNS.map(c => `- **${c.name}** (${c.definition}): ${c.role}`).join('\n')}

Key properties:
- **Causality**: Database feeds Automation feeds Judgment. Debug in that order.
- **Blurriness**: Boundaries between tiers are elastic, not rigid. Sophisticated automation contains embedded judgment.
- **Recursive property**: MCP sampling allows Automation to request Judgment, creating a feedback loop.
- **Policy as artifact**: Constraints flow through tiers as data, not external scaffolding.`;

const DEBUGGING_CONTEXT = `The Three-Tier debugging heuristic follows the causality chain:
1. **Database** — ${TIERS.database.debugQuestion} ${TIERS.database.failureMode}
2. **Automation** — ${TIERS.automation.debugQuestion} ${TIERS.automation.failureMode}
3. **Judgment** — ${TIERS.judgment.debugQuestion} ${TIERS.judgment.failureMode}

Always check tiers in order. Lower-tier failures cascade upward.`;

const MCP_DESIGN_CONTEXT = `MCP primitives map to framework tiers via control models:
${MCP_MAPPINGS.map(m => `- **${m.mcpPrimitive}** (${m.controlModel}) → ${m.frameworkTier}: ${m.rationale}`).join('\n')}

The sampling mechanism allows Tools to request LLM access back through the Client, creating the recursive property where Automation can invoke Judgment.

When designing an MCP server, consider:
1. What data should be exposed as Resources? (Database tier, application-controlled)
2. What actions should be exposed as Tools? (Automation tier, model-controlled)
3. What templates should be exposed as Prompts? (Judgment tier, user-controlled)
4. Does any Tool need to request Judgment via sampling?`;

const POLICY_CONTEXT = `${POLICY_AS_ARTIFACT.summary}

Tier operations on policy:
${POLICY_AS_ARTIFACT.tierOperations.map(t => `- **${t.tier}**: ${t.operation}`).join('\n')}

What policy-as-artifact enables:
${POLICY_AS_ARTIFACT.enables.map(e => `- ${e}`).join('\n')}

Risks and mitigations:
${POLICY_AS_ARTIFACT.risks.map(r => `- ${r}`).join('\n')}`;

// ============================================================================
// Registration
// ============================================================================

export function registerPrompts(server: Server): void {

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'architecture_review',
        description: 'Review a system architecture against the Three-Tier Framework. Classifies components into tiers and identifies cross-cutting concerns.',
        arguments: [
          { name: 'system_name', description: 'Name of the system to review', required: true },
          { name: 'components', description: 'Comma-separated list of system components', required: true }
        ]
      },
      {
        name: 'tier_analysis',
        description: 'Analyze which tier(s) a new feature should target and why.',
        arguments: [
          { name: 'feature_description', description: 'Description of the feature to analyze', required: true }
        ]
      },
      {
        name: 'policy_audit',
        description: 'Audit policy artifacts in a system. Identifies which constraints are versioned, contextual, or reflexive.',
        arguments: [
          { name: 'system_description', description: 'Description of the system to audit', required: true }
        ]
      },
      {
        name: 'mcp_design',
        description: 'Design an MCP server using the Three-Tier Framework. Maps domain use cases to Resources, Tools, and Prompts.',
        arguments: [
          { name: 'domain', description: 'The domain this MCP server will serve', required: true },
          { name: 'use_cases', description: 'Comma-separated list of use cases', required: true }
        ]
      },
      {
        name: 'debugging_session',
        description: 'Start a structured debugging session using the Three-Tier causality heuristic.',
        arguments: [
          { name: 'failure_description', description: 'Description of the failure or unexpected behavior', required: true }
        ]
      }
    ]
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'architecture_review': {
        const systemName = args?.system_name || 'Unknown System';
        const components = (args?.components || '').split(',').map((c: string) => c.trim()).filter(Boolean);
        
        return {
          description: `Architecture review of ${systemName} against the Three-Tier Framework`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `${FRAMEWORK_CONTEXT}\n\n---\n\nPlease review the architecture of **${systemName}** against the Three-Tier Framework.\n\nComponents to classify:\n${components.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}\n\nFor each component:\n1. Identify its primary tier (Database, Automation, or Judgment)\n2. Note if it spans multiple tiers\n3. Identify which cross-cutting concerns it touches (Touchpoints, Artifacts, Orchestration, Insight)\n\nThen provide an overall assessment:\n- Are all three tiers represented?\n- Are there gaps in any tier?\n- Does the system leverage the recursive property (Automation requesting Judgment via sampling)?\n- Are policy artifacts identified and properly versioned?`
              }
            }
          ]
        };
      }

      case 'tier_analysis': {
        const featureDescription = args?.feature_description || 'Unknown feature';
        
        return {
          description: `Tier analysis for: ${featureDescription}`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `${FRAMEWORK_CONTEXT}\n\n---\n\nAnalyze which tier(s) this feature should target:\n\n**Feature**: ${featureDescription}\n\nPlease determine:\n1. **Primary tier**: Which tier does this feature primarily belong to? Why?\n2. **Secondary tiers**: Does it span other tiers? How?\n3. **Cross-cutting concerns**: Which concerns does it touch?\n4. **Implementation guidance**: Based on the tier classification, what MCP primitives should be used?\n5. **Debugging considerations**: What failure modes are most likely based on the tier?`
              }
            }
          ]
        };
      }

      case 'policy_audit': {
        const systemDescription = args?.system_description || 'Unknown system';
        
        return {
          description: `Policy artifact audit for: ${systemDescription}`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `${FRAMEWORK_CONTEXT}\n\n${POLICY_CONTEXT}\n\n---\n\nAudit the policy artifacts in this system:\n\n**System**: ${systemDescription}\n\nFor each constraint or policy you identify:\n1. **Classification**: Is it mutable, immutable, or contextual?\n2. **Current tier**: Where does it currently live (Database, Rules, Policy)?\n3. **Should it move?**: Based on the policy-as-artifact model, where should it be stored, transformed, and evaluated?\n4. **Versioning**: Is it versioned? Should it be?\n5. **Insight**: Is the policy selection traced? Can you audit why this policy was chosen?`
              }
            }
          ]
        };
      }

      case 'mcp_design': {
        const domain = args?.domain || 'Unknown domain';
        const useCases = (args?.use_cases || '').split(',').map((c: string) => c.trim()).filter(Boolean);
        
        return {
          description: `MCP server design for ${domain}`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `${FRAMEWORK_CONTEXT}\n\n${MCP_DESIGN_CONTEXT}\n\n---\n\nDesign an MCP server for the **${domain}** domain.\n\nUse cases:\n${useCases.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}\n\nFor each use case, determine:\n1. What **Resources** should be exposed? (What data exists that agents need to read?)\n2. What **Tools** should be exposed? (What actions should agents be able to take?)\n3. What **Prompts** should be exposed? (What templates guide how agents reason about this domain?)\n\nThen provide:\n- A resource URI scheme (e.g., \`domain://entity/id\`)\n- Tool definitions with input schemas\n- Prompt templates with arguments\n- Whether any tools should use sampling (requesting judgment mid-execution)\n- The Automotive Framework mapping for the server's components`
              }
            }
          ]
        };
      }

      case 'debugging_session': {
        const failureDescription = args?.failure_description || 'Unknown failure';
        
        return {
          description: `Debugging session for: ${failureDescription}`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `${FRAMEWORK_CONTEXT}\n\n${DEBUGGING_CONTEXT}\n\n---\n\nLet's debug this failure using the Three-Tier causality heuristic:\n\n**Failure**: ${failureDescription}\n\nWork through each tier in order:\n\n**Step 1: Database Tier**\n- ${TIERS.database.debugQuestion}\n- What data does this operation depend on?\n- Is all required data accessible, fresh, and correctly shaped?\n\n**Step 2: Automation Tier**\n- ${TIERS.automation.debugQuestion}\n- Did the relevant tool/worker/function execute without error?\n- Is the transformation logic correct?\n\n**Step 3: Judgment Tier**\n- ${TIERS.judgment.debugQuestion}\n- Is the correct prompt or system message being applied?\n- Are constraints appropriate for this context?\n\nAfter checking all three tiers, identify the most likely root cause and recommend a fix.`
              }
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
