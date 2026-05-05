/**
 * Three-Tier Framework MCP Server — Cloudflare Worker
 *
 * The Three-Tier Framework (Database, Automation, Judgment) as a remote MCP server.
 * First MCP server in the repo to use all three primitives AND remote deployment.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex)
 *   /sse  — SSE fallback transport (Cursor, legacy clients)
 *   /, /health — Health/info JSON
 *
 * Architecture (demonstrates its own thesis):
 *   Database tier (Resources)  — Framework definitions, mappings, reference data
 *   Automation tier (Tools)    — Classification, debugging, analysis + sampling feedback
 *   Judgment tier (Prompts)    — Architecture review, tier analysis, design guidance
 *
 * The recursive property: Tools with validate=true request LLM judgment via
 * MCP sampling — Automation requesting Judgment through the feedback loop.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';

// Framework data (embedded in source — zero external dependencies)
import { TIERS, CROSS_CUTTING_CONCERNS } from '../src/framework/definitions.js';
import {
  MCP_MAPPINGS,
  CLOUDFLARE_MAPPINGS,
  AUTOMOTIVE_MAPPINGS,
  SAMPLING_EXPLANATION,
  POLICY_AS_ARTIFACT
} from '../src/framework/mappings.js';
import { FRAMEWORK_DOCUMENT } from '../src/framework/document.js';
import {
  classifyComponent,
  debugSystem,
  analyzeMCPServer,
  identifyPolicyArtifacts,
  mapToAutomotive,
  architectureDiff
} from '../src/framework/heuristics.js';
import { CASE_STUDIES, CASE_STUDY_LIST } from '../src/framework/examples.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
}

// =============================================================================
// Shared prompt context blocks (for Judgment tier prompts)
// =============================================================================

const FRAMEWORK_CONTEXT = `You are working with the Three-Tier Framework for agent systems.

The three tiers:
- **Database** (What exists): ${TIERS.database.description} Control model: ${TIERS.database.controlModel}. MCP primitive: ${TIERS.database.mcpPrimitive}.
- **Automation** (What happens): ${TIERS.automation.description} Control model: ${TIERS.automation.controlModel}. MCP primitive: ${TIERS.automation.mcpPrimitive}.
- **Judgment** (What should happen): ${TIERS.judgment.description} Control model: ${TIERS.judgment.controlModel}. MCP primitive: ${TIERS.judgment.mcpPrimitive}.

Four cross-cutting concerns span all tiers:
${CROSS_CUTTING_CONCERNS.map(c => `- **${c.name}** (${c.definition}): ${c.role}`).join('\n')}

Key properties:
- **Causality**: Database feeds Automation feeds Judgment. Debug in that order.
- **Blurriness**: Boundaries between tiers are elastic, not rigid.
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
${POLICY_AS_ARTIFACT.tierOperations.map((t: { tier: string; operation: string }) => `- **${t.tier}**: ${t.operation}`).join('\n')}

What policy-as-artifact enables:
${POLICY_AS_ARTIFACT.enables.map((e: string) => `- ${e}`).join('\n')}

Risks and mitigations:
${POLICY_AS_ARTIFACT.risks.map((r: string) => `- ${r}`).join('\n')}`;

// =============================================================================
// MCP Agent — Durable Object with all three primitives
// =============================================================================

export class ThreeTierFrameworkMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'three-tier-framework',
    version: '1.0.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTIxIDhhMiAyIDAgMCAwLTEtMS43M2wtNy00YTIgMiAwIDAgMC0yIDBsLTcgNEEyIDIgMCAwIDAgMyA4djhhMiAyIDAgMCAwIDEgMS43M2w3IDRhMiAyIDAgMCAwIDIgMGw3LTRBMiAyIDAgMCAwIDIxIDE2WiIvPjxwYXRoIGQ9Im0zLjMgNyA4LjcgNSA4LjctNSIvPjxwYXRoIGQ9Ik0xMiAyMlYxMiIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as any,
        'three-tier-framework',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: 'three-tier-framework',
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
        },
      );
    }

    // =========================================================================
    // DATABASE TIER — Resources (application-controlled)
    // =========================================================================

    this.server.resource(
      'definitions',
      'framework://definitions',
      { description: 'All three tier definitions (Database, Automation, Judgment) as structured JSON', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIERS, null, 2) }]
      })
    );

    this.server.resource(
      'definitions-database',
      'framework://definitions/database',
      { description: 'Database tier definition', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIERS.database, null, 2) }]
      })
    );

    this.server.resource(
      'definitions-automation',
      'framework://definitions/automation',
      { description: 'Automation tier definition', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIERS.automation, null, 2) }]
      })
    );

    this.server.resource(
      'definitions-judgment',
      'framework://definitions/judgment',
      { description: 'Judgment tier definition', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIERS.judgment, null, 2) }]
      })
    );

    this.server.resource(
      'crosscutting',
      'framework://crosscutting',
      { description: 'Four cross-cutting concerns: Touchpoints, Artifacts, Orchestration, Insight', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CROSS_CUTTING_CONCERNS, null, 2) }]
      })
    );

    this.server.resource(
      'mappings-mcp',
      'framework://mappings/mcp',
      { description: 'How MCP primitives map to framework tiers via control models', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(MCP_MAPPINGS, null, 2) }]
      })
    );

    this.server.resource(
      'mappings-cloudflare',
      'framework://mappings/cloudflare',
      { description: 'How Cloudflare services map to framework tiers', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CLOUDFLARE_MAPPINGS, null, 2) }]
      })
    );

    this.server.resource(
      'mappings-automotive',
      'framework://mappings/automotive',
      { description: 'Automotive Framework metaphor mapped to tiers', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(AUTOMOTIVE_MAPPINGS, null, 2) }]
      })
    );

    this.server.resource(
      'sampling',
      'framework://sampling',
      { description: 'The recursive property: how MCP sampling allows Automation to request Judgment', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(SAMPLING_EXPLANATION, null, 2) }]
      })
    );

    this.server.resource(
      'policy-as-artifact',
      'framework://policy-as-artifact',
      { description: 'How policy flows through tiers as data, not external scaffolding', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(POLICY_AS_ARTIFACT, null, 2) }]
      })
    );

    this.server.resource(
      'full',
      'framework://full',
      { description: 'Complete Three-Tier Framework document (v1.3) as markdown', mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: FRAMEWORK_DOCUMENT }]
      })
    );

    // Case Studies
    this.server.resource(
      'examples',
      'framework://examples',
      { description: 'Index of case studies analyzing real systems through the framework', mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CASE_STUDY_LIST, null, 2) }]
      })
    );

    for (const [slug, caseStudy] of Object.entries(CASE_STUDIES)) {
      this.server.resource(
        `example-${slug}`,
        `framework://examples/${slug}`,
        { description: `Case Study: ${caseStudy.name}`, mimeType: 'application/json' },
        async (uri) => ({
          contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(caseStudy, null, 2) }]
        })
      );
    }

    // =========================================================================
    // AUTOMATION TIER — Tools (model-controlled) + Sampling feedback
    // =========================================================================

    this.server.tool(
      'classify_component',
      'Classify a component or service into framework tier(s) (Database, Automation, Judgment) with confidence scores and rationale.',
      {
        description: z.string().describe('Description of the component or service to classify'),
        context: z.string().optional().describe('Optional additional context about the system'),
        validate: z.boolean().optional().describe('Request LLM validation via MCP sampling (recursive property)')
      },
      async ({ description, context, validate }) => {
        const result = classifyComponent(description, context);

        if (validate) {
          const validation = await this.requestValidation(
            'classify_component', description, result
          );
          if (validation) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ ...result, validation }, null, 2) }] };
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      'debug_system',
      'Apply the Three-Tier causality heuristic to debug a failure: (1) Database — is data there? (2) Automation — did execution work? (3) Judgment — was policy correct?',
      {
        failure: z.string().describe('Description of the failure or unexpected behavior'),
        context: z.string().optional().describe('Optional system context or recent changes'),
        validate: z.boolean().optional().describe('Request LLM validation via MCP sampling')
      },
      async ({ failure, context, validate }) => {
        const result = debugSystem(failure, context);

        if (validate) {
          const validation = await this.requestValidation(
            'debug_system', failure, result
          );
          if (validation) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ ...result, validation }, null, 2) }] };
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      'analyze_mcp_server',
      'Analyze an MCP server against the Three-Tier Framework. Maps its primitives to tiers, identifies coverage gaps, and recommends improvements.',
      {
        name: z.string().describe('Name of the MCP server to analyze'),
        tools: z.array(z.string()).optional().describe('List of tool names this server exposes'),
        resources: z.array(z.string()).optional().describe('List of resource URIs this server exposes'),
        prompts: z.array(z.string()).optional().describe('List of prompt names this server exposes'),
        validate: z.boolean().optional().describe('Request LLM validation via MCP sampling')
      },
      async ({ name, tools, resources, prompts, validate }) => {
        const result = analyzeMCPServer(name, tools, resources, prompts);

        if (validate) {
          const validation = await this.requestValidation(
            'analyze_mcp_server', name, result
          );
          if (validation) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ ...result, validation }, null, 2) }] };
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      'identify_policy_artifacts',
      'Identify which constraints in a system are policy artifacts that should flow through tiers. Classifies each as mutable/immutable and maps to tiers.',
      {
        system: z.string().describe('Description of the system to audit'),
        constraints: z.array(z.string()).optional().describe('List of known constraints or policies'),
        validate: z.boolean().optional().describe('Request LLM validation via MCP sampling')
      },
      async ({ system, constraints, validate }) => {
        const result = identifyPolicyArtifacts(system, constraints);

        if (validate) {
          const validation = await this.requestValidation(
            'identify_policy_artifacts', system, result
          );
          if (validation) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ result, validation }, null, 2) }] };
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      'map_to_automotive',
      'Map system components to the Automotive Framework vocabulary (Chassis, Engine, Fuel Tank, Turbocharger, etc.).',
      {
        components: z.array(z.string()).describe('List of component names or descriptions to map'),
        validate: z.boolean().optional().describe('Request LLM validation via MCP sampling')
      },
      async ({ components, validate }) => {
        const result = mapToAutomotive(components);

        if (validate) {
          const validation = await this.requestValidation(
            'map_to_automotive', components.join(', '), result
          );
          if (validation) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ result, validation }, null, 2) }] };
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      'architecture_diff',
      'Compare two systems through the Three-Tier Framework. Shows tier coverage differences, gaps, boundary components, and recommendations.',
      {
        system_a_name: z.string().describe('Name of the first system'),
        system_a_components: z.array(z.string()).describe('Component descriptions for the first system'),
        system_b_name: z.string().describe('Name of the second system'),
        system_b_components: z.array(z.string()).describe('Component descriptions for the second system')
      },
      async ({ system_a_name, system_a_components, system_b_name, system_b_components }) => {
        const result = architectureDiff(system_a_name, system_a_components, system_b_name, system_b_components);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    // =========================================================================
    // JUDGMENT TIER — Prompts (user-controlled)
    // =========================================================================

    this.server.prompt(
      'architecture_review',
      'Review a system architecture against the Three-Tier Framework. Classifies components into tiers and identifies cross-cutting concerns.',
      {
        system_name: z.string().describe('Name of the system to review'),
        components: z.string().describe('Comma-separated list of system components')
      },
      async ({ system_name, components }) => {
        const componentList = components.split(',').map(c => c.trim()).filter(Boolean);
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${FRAMEWORK_CONTEXT}\n\n---\n\nPlease review the architecture of **${system_name}** against the Three-Tier Framework.\n\nComponents to classify:\n${componentList.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nFor each component:\n1. Identify its primary tier (Database, Automation, or Judgment)\n2. Note if it spans multiple tiers\n3. Identify which cross-cutting concerns it touches\n\nThen provide an overall assessment:\n- Are all three tiers represented?\n- Are there gaps in any tier?\n- Does the system leverage the recursive property (Automation requesting Judgment)?\n- Are policy artifacts identified and properly versioned?`
            }
          }]
        };
      }
    );

    this.server.prompt(
      'tier_analysis',
      'Analyze which tier(s) a new feature should target and why.',
      {
        feature_description: z.string().describe('Description of the feature to analyze')
      },
      async ({ feature_description }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${FRAMEWORK_CONTEXT}\n\n---\n\nAnalyze which tier(s) this feature should target:\n\n**Feature**: ${feature_description}\n\nPlease determine:\n1. **Primary tier**: Which tier does this feature primarily belong to? Why?\n2. **Secondary tiers**: Does it span other tiers? How?\n3. **Cross-cutting concerns**: Which concerns does it touch?\n4. **Implementation guidance**: Based on the tier classification, what MCP primitives should be used?\n5. **Debugging considerations**: What failure modes are most likely based on the tier?`
          }
        }]
      })
    );

    this.server.prompt(
      'policy_audit',
      'Audit policy artifacts in a system. Identifies which constraints are versioned, contextual, or reflexive.',
      {
        system_description: z.string().describe('Description of the system to audit')
      },
      async ({ system_description }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${FRAMEWORK_CONTEXT}\n\n${POLICY_CONTEXT}\n\n---\n\nAudit the policy artifacts in this system:\n\n**System**: ${system_description}\n\nFor each constraint or policy you identify:\n1. **Classification**: Is it mutable, immutable, or contextual?\n2. **Current tier**: Where does it currently live?\n3. **Should it move?**: Based on the policy-as-artifact model, where should it be stored, transformed, and evaluated?\n4. **Versioning**: Is it versioned? Should it be?\n5. **Insight**: Is the policy selection traced? Can you audit why this policy was chosen?`
          }
        }]
      })
    );

    this.server.prompt(
      'mcp_design',
      'Design an MCP server using the Three-Tier Framework. Maps domain use cases to Resources, Tools, and Prompts.',
      {
        domain: z.string().describe('The domain this MCP server will serve'),
        use_cases: z.string().describe('Comma-separated list of use cases')
      },
      async ({ domain, use_cases }) => {
        const useCaseList = use_cases.split(',').map(c => c.trim()).filter(Boolean);
        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${FRAMEWORK_CONTEXT}\n\n${MCP_DESIGN_CONTEXT}\n\n---\n\nDesign an MCP server for the **${domain}** domain.\n\nUse cases:\n${useCaseList.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nFor each use case, determine:\n1. What **Resources** should be exposed? (What data exists that agents need to read?)\n2. What **Tools** should be exposed? (What actions should agents be able to take?)\n3. What **Prompts** should be exposed? (What templates guide how agents reason?)\n\nThen provide:\n- A resource URI scheme\n- Tool definitions with input schemas\n- Prompt templates with arguments\n- Whether any tools should use sampling (requesting judgment mid-execution)\n- The Automotive Framework mapping for the server's components`
            }
          }]
        };
      }
    );

    this.server.prompt(
      'debugging_session',
      'Start a structured debugging session using the Three-Tier causality heuristic.',
      {
        failure_description: z.string().describe('Description of the failure or unexpected behavior')
      },
      async ({ failure_description }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${FRAMEWORK_CONTEXT}\n\n${DEBUGGING_CONTEXT}\n\n---\n\nLet's debug this failure using the Three-Tier causality heuristic:\n\n**Failure**: ${failure_description}\n\nWork through each tier in order:\n\n**Step 1: Database Tier**\n- ${TIERS.database.debugQuestion}\n- What data does this operation depend on?\n- Is all required data accessible, fresh, and correctly shaped?\n\n**Step 2: Automation Tier**\n- ${TIERS.automation.debugQuestion}\n- Did the relevant tool/worker/function execute without error?\n- Is the transformation logic correct?\n\n**Step 3: Judgment Tier**\n- ${TIERS.judgment.debugQuestion}\n- Is the correct prompt or system message being applied?\n- Are constraints appropriate for this context?\n\nAfter checking all three tiers, identify the most likely root cause and recommend a fix.`
          }
        }]
      })
    );
  }

  // ===========================================================================
  // Sampling Feedback Loop — The Recursive Property
  // ===========================================================================

  /**
   * Request LLM validation of a tool's heuristic output via MCP sampling.
   * This is the recursive property in action: Automation requesting Judgment.
   * 
   * Gracefully degrades: if the client doesn't support sampling, returns null
   * and the tool returns the raw heuristic result.
   */
  private async requestValidation(
    toolName: string,
    input: string,
    heuristicResult: unknown
  ): Promise<{ validated: boolean; refinement: string } | null> {
    try {
      const response = await (this.server as any).server.createMessage({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `The ${toolName} tool produced this result for "${input}":\n\n${JSON.stringify(heuristicResult, null, 2)}\n\nIs this classification accurate? If not, what would you change and why? Reply with "VALID" if correct, or explain the correction needed.`
          }
        }],
        systemPrompt: 'You are validating Three-Tier Framework classifications. Be concise. Reply with "VALID" if the classification is correct, or briefly explain the correction needed.',
        maxTokens: 200,
        includeContext: 'thisServer' as const
      });

      const text = typeof response.content === 'object' && 'text' in response.content
        ? response.content.text
        : String(response.content);
      const validated = text.toUpperCase().includes('VALID');

      return { validated, refinement: text };
    } catch {
      // Client doesn't support sampling, or request failed — graceful degradation
      return null;
    }
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Streamable HTTP transport (Claude Code, Codex)
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return ThreeTierFrameworkMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback transport (Cursor, legacy clients)
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return ThreeTierFrameworkMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'three-tier-framework',
        version: '1.0.0',
        description: 'The Three-Tier Framework (Database, Automation, Judgment) as a remote MCP server',
        framework: 'https://createsomething.io/papers/three-tier-framework',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — Cursor, legacy clients)',
        },
        capabilities: {
          resources: '11 URIs (Database tier — framework definitions, mappings)',
          tools: '5 tools (Automation tier — classify, debug, analyze, identify, map)',
          prompts: '5 prompts (Judgment tier — architecture review, tier analysis, design)',
        },
        recursive_property: 'Tools with validate=true request LLM validation via MCP sampling',
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
