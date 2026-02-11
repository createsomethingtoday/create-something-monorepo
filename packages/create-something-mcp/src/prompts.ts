/**
 * Prompts — Judgment tier (user-controlled).
 * Templates that guide how agents reason about CREATE SOMETHING content and philosophy.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TIERS, CROSS_CUTTING_CONCERNS, MCP_MAPPINGS, AUTOMOTIVE_MAPPINGS, POLICY_AS_ARTIFACT } from './content/framework.js';
import { MASTERS } from './content/masters.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './content/playbooks.js';

// ============================================================================
// Shared context blocks
// ============================================================================

const FRAMEWORK_CONTEXT = `You are working with the Three-Tier Framework for agent systems.

The three tiers:
- **Database** (What exists): ${TIERS.database.description} Control model: ${TIERS.database.controlModel}. MCP primitive: ${TIERS.database.mcpPrimitive}.
- **Automation** (What happens): ${TIERS.automation.description} Control model: ${TIERS.automation.controlModel}. MCP primitive: ${TIERS.automation.mcpPrimitive}.
- **Judgment** (What should happen): ${TIERS.judgment.description} Control model: ${TIERS.judgment.controlModel}. MCP primitive: ${TIERS.judgment.mcpPrimitive}.

Four cross-cutting concerns:
${CROSS_CUTTING_CONCERNS.map(c => `- **${c.name}** (${c.definition}): ${c.role}`).join('\n')}

Key properties:
- **Causality**: Database feeds Automation feeds Judgment. Debug in that order.
- **Recursive property**: MCP sampling allows Automation to request Judgment.
- **Policy as artifact**: Constraints flow through tiers as data, not external scaffolding.`;

const TRIAD_CONTEXT = `You are applying the Subtractive Triad — CREATE SOMETHING's meta-principle that creation is the discipline of removing what obscures.

The three levels:
${MASTERS.map(m => {
  if (m.slug === 'dieter-rams') return `- **Artifact level (Rams)**: "Does this earn its existence?" → Remove. ${m.philosophy}`;
  if (m.slug === 'martin-heidegger') return `- **System level (Heidegger)**: "Does this serve the whole?" → Reconnect. ${m.philosophy}`;
  return null;
}).filter(Boolean).join('\n')}
- **Implementation level (DRY)**: "Have I built this before?" → Unify.

For any decision, ask the three questions in order:
1. DRY (Implementation) → Eliminate duplication
2. Weniger, aber besser (Artifact) → Eliminate excess
3. Hermeneutic circle (System) → Eliminate disconnection`;

const CANON_CONTEXT = `You are reviewing through the Canon Design System lens — CREATE SOMETHING's design philosophy.

Core principles:
- **Tailwind for structure, Canon for aesthetics**: Use Tailwind for layout (flex, grid, gap-*, p-*). Use Canon tokens for colors, typography, borders, shadows, motion.
- **Glass Design System**: The transparent interface between user and outcome. Glass conveys "The Automation Layer" — the interface recedes, and you focus on your destination.
- **Subtractive**: Every element must earn its existence. If removing it does not reduce clarity or function, remove it.
- **Honest materials**: Canon tokens encode decisions. Using them correctly means respecting their purpose.
- **Mathematical harmony**: Golden ratio spacing scale and modular type scale create visual harmony.

Color philosophy: Black and white for structure. Opacity for hierarchy. Semantic colors when something needs attention.
Typography: Inter as primary. Modular scale for sizes. Readability over decoration.
Spacing: Golden ratio scale for component internals. Tailwind utilities for page-level layout.
Motion: Every animation earns its existence. Respect prefers-reduced-motion.`;

// ============================================================================
// Register prompts
// ============================================================================

export function registerPrompts(server: McpServer) {
  // ==========================================================================
  // architecture_review
  // ==========================================================================

  server.prompt(
    'architecture_review',
    'Review a system architecture against the Three-Tier Framework. Classifies components into tiers, identifies gaps, and maps to Automotive Framework.',
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
            text: `${FRAMEWORK_CONTEXT}

---

Review the architecture of **${system_name}** against the Three-Tier Framework.

Components to classify:
${componentList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each component:
1. Identify its primary tier (Database, Automation, or Judgment)
2. Note if it spans multiple tiers (boundary component)
3. Identify which cross-cutting concerns it touches

Then provide:
- Overall tier coverage assessment
- Gaps in any tier
- Whether the system leverages the recursive property (Automation requesting Judgment)
- Automotive Framework mapping (Chassis, Engine, Fuel Tank, etc.)
- Recommendations for strengthening the architecture`
          }
        }]
      };
    }
  );

  // ==========================================================================
  // design_review
  // ==========================================================================

  server.prompt(
    'design_review',
    'Review a UI/UX design through the Canon Design System and Glass lens. Checks philosophy alignment, token usage, and subtractive principles.',
    {
      design_description: z.string().describe('Description of the design to review — include colors, typography, layout, interactions')
    },
    async ({ design_description }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `${CANON_CONTEXT}

---

Review this design through the Canon lens:

**Design:** ${design_description}

Evaluate:
1. **Subtractive test**: Can anything be removed without loss of function or clarity?
2. **Color audit**: Does it use Canon's black/white foundation with opacity hierarchy?
3. **Typography audit**: Does it follow the modular type scale?
4. **Spacing audit**: Component internals with Canon tokens, page layout with Tailwind?
5. **Motion audit**: Does every animation earn its existence?
6. **Glass test**: Does the interface recede into transparent use (Zuhandenheit)?
7. **Honest materials**: Are design tokens used as intended?

Provide specific recommendations for each area, citing Canon principles.`
        }
      }]
    })
  );

  // ==========================================================================
  // triad_analysis
  // ==========================================================================

  server.prompt(
    'triad_analysis',
    'Apply the Subtractive Triad (DRY / Rams / Heidegger) to any artifact — code, design, system, process, document. The universal quality gate.',
    {
      artifact_description: z.string().describe('Description of the artifact to analyze'),
      artifact_type: z.enum(['code', 'design', 'system', 'process', 'document', 'other']).optional()
        .describe('Type of artifact (helps focus the analysis)')
    },
    async ({ artifact_description, artifact_type }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `${TRIAD_CONTEXT}

---

Apply the Subtractive Triad to this ${artifact_type || 'artifact'}:

**Artifact:** ${artifact_description}

Work through each level:

**Level 1: DRY (Implementation)**
- Have I built this before? Is there duplication?
- What can be unified without losing clarity?
- Score: How DRY is this artifact? (1-10)

**Level 2: Rams (Artifact)**
- Does every element earn its existence?
- What can be removed without loss of function?
- "Less, but better" — what would the essential form look like?
- Score: How well does this embody "weniger, aber besser"? (1-10)

**Level 3: Heidegger (System)**
- Does this serve the whole? Is it connected to its context?
- Does it achieve Zuhandenheit (transparent use) or demand attention?
- Does it enable dwelling, or does it fill space (Gestell)?
- Score: How well does this serve the hermeneutic whole? (1-10)

**Synthesis:**
- Overall Triad score (average)
- One concrete recommendation per level
- The single most impactful subtraction`
        }
      }]
    })
  );

  // ==========================================================================
  // mcp_design
  // ==========================================================================

  server.prompt(
    'mcp_design',
    'Design an MCP server using the Three-Tier Framework. Maps domain use cases to Resources (Database), Tools (Automation), and Prompts (Judgment).',
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
            text: `${FRAMEWORK_CONTEXT}

MCP primitives map to tiers:
${MCP_MAPPINGS.map(m => `- **${m.mcpPrimitive}** (${m.controlModel}) → ${m.frameworkTier}: ${m.rationale}`).join('\n')}

Automotive Framework mapping:
${AUTOMOTIVE_MAPPINGS.map(m => `- **${m.vehiclePart}** = ${m.technology} (${m.function})`).join('\n')}

---

Design an MCP server for the **${domain}** domain.

Use cases:
${useCaseList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each use case, determine:
1. What **Resources** to expose? (What data exists that agents need to read?)
2. What **Tools** to expose? (What actions should agents invoke?)
3. What **Prompts** to expose? (What templates guide reasoning?)

Provide:
- Resource URI scheme (e.g., \`${domain.toLowerCase().replace(/\s+/g, '-')}://data/...\`)
- Tool definitions with input schemas
- Prompt templates with arguments
- Whether any tools should use sampling (recursive property)
- Automotive Framework mapping for the server
- Deployment recommendation (Cloudflare Workers, stdio, or both)`
          }
        }]
      };
    }
  );

  // ==========================================================================
  // research_dive
  // ==========================================================================

  server.prompt(
    'research_dive',
    'Deep exploration of a topic across all CREATE SOMETHING properties. Connects papers, patterns, Canon principles, and philosophical foundations.',
    {
      topic: z.string().describe('The topic to explore in depth'),
      depth: z.enum(['overview', 'detailed', 'comprehensive']).optional()
        .describe('How deep to go (default: detailed)')
    },
    async ({ topic, depth }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You have access to the CREATE SOMETHING content library through MCP resources. Use the \`search\` tool and resource URIs to explore this topic thoroughly.

**Topic:** ${topic}
**Depth:** ${depth || 'detailed'}

Explore across all properties:

1. **Papers (.io)**: Search for research papers on this topic. Use \`search\` with type="paper" or read papers://list.
2. **Canon (.ltd)**: Check if Canon design system addresses this. Use \`search\` with type="canon" or read canon://list.
3. **Patterns (.ltd)**: Find relevant design patterns. Use \`search\` with type="pattern" or read patterns://list.
4. **Masters (.ltd)**: Which masters' principles apply? Read masters://list.
5. **Framework**: How does the Three-Tier Framework relate? Read framework://definitions.
6. **Graph**: What connections exist? Use the \`relate\` tool with the topic.

Synthesize findings into:
- **Overview**: What CREATE SOMETHING thinks about ${topic}
- **Key sources**: Which papers, patterns, and Canon pages are most relevant
- **Philosophical grounding**: Which masters and principles underpin this thinking
- **Connections**: How this topic connects to other concepts (from the knowledge graph)
- **Practical application**: How to apply this understanding in real work`
        }
      }]
    })
  );

  // ==========================================================================
  // workflow_setup — Host workflow intelligence (Judgment tier)
  // ==========================================================================

  server.prompt(
    'workflow_setup',
    'Generate a personalized workflow guide for using MCP hosts effectively. Adapts to the user\'s host environment and work domain. The entry point for non-technical users who have MCPs installed but need guidance on how to work.',
    {
      host: z.enum(['codex', 'cursor', 'claude-desktop', 'auto']).optional()
        .describe('Which MCP host the user is working in. Use "auto" or omit to detect from context.'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('The user\'s work domain — helps tailor workflow recommendations (default: general)')
    },
    async ({ host, domain }) => {
      const selectedDomain = domain || 'general';
      const autoDetect = !host || host === 'auto';

      // Build host-specific or auto-detect content
      let hostSection: string;

      if (autoDetect) {
        // Auto mode: brief summaries only, instruct model to read the right resource
        const summaries = HOST_PLAYBOOKS.map(p =>
          `- **${p.name}**: ${p.description} Best for: ${p.bestFor.slice(0, 2).join(', ')}.`
        ).join('\n');

        hostSection = `The user hasn't specified which host they're using. Determine from context:
- IDE with file editing → **Cursor**
- Project folder with git → **Codex**
- Conversation thread → **Claude Desktop**

Available hosts:
${summaries}

Once you determine the host, read \`playbooks://hosts/{slug}\` for the full playbook (e.g., \`playbooks://hosts/codex\`).`;
      } else {
        // Specific host: embed only that host's playbook
        const playbook = HOST_PLAYBOOKS.find(p => p.slug === host);
        if (playbook) {
          const relevantPatterns = playbook.workflowPatterns
            .filter(wp => !wp.domain || wp.domain === selectedDomain || wp.domain === 'general')
            .map(wp => `  - **${wp.name}**: ${wp.description}`)
            .join('\n');

          hostSection = `The user is working in **${playbook.name}**.

**Mental Model:** ${playbook.mentalModel}

**Best for:** ${playbook.bestFor.join(', ')}

**Anti-patterns to avoid:**
${playbook.antiPatterns.map(a => `- ${a}`).join('\n')}

**Workflow patterns:**
${relevantPatterns}

${playbook.folderTemplate ? `**Folder structure:**
\`\`\`
${playbook.folderTemplate.structure}
\`\`\`

**Key files:**
${playbook.folderTemplate.keyFiles.map(f => `- \`${f.path}\`: ${f.purpose}`).join('\n')}` : ''}`;
        } else {
          hostSection = `Host: ${host}`;
        }
      }

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are a workflow advisor helping a user set up their AI-assisted work environment. Your goal is to move them from just "asking questions" to producing real outcomes.

**Domain:** ${selectedDomain}

---

${hostSection}

---

## Your Task

Provide a personalized workflow setup guide:

1. **Confirm their host** — verify or detect which environment they're in
2. **Recommend a workflow** — pick the most relevant pattern for their domain
3. **Set up their structure** — folder structure, config files, and key files
4. **Identify anti-patterns** — the most common mistakes for their host
5. **Suggest next steps** — the 5-minute quick win to start getting value

Be specific and actionable. Plain language — the user may not be technical.`
          }
        }]
      };
    }
  );

  // ==========================================================================
  // host_comparison — "Which host should I use for what?"
  // ==========================================================================

  server.prompt(
    'host_comparison',
    'Compare MCP hosts (Codex, Cursor, Claude Desktop) for a specific task type. Helps users choose the right tool for their work.',
    {
      task_type: z.enum(['project-management', 'research', 'document-drafting', 'data-analysis', 'general']).optional()
        .describe('The type of work to compare hosts for (default: general)')
    },
    async ({ task_type }) => {
      const selectedType = task_type || 'general';
      const comparison = HOST_COMPARISONS.find(c => c.taskType === selectedType);

      // Only send the focused comparison for the requested task type
      const focusedComparison = comparison
        ? comparison.recommendations
            .map(r => `- **${r.host}** [${r.fit.toUpperCase()}]: ${r.reason}`)
            .join('\n')
        : 'No specific comparison available. Read `playbooks://comparison` for the full matrix.';

      // Brief MCP patterns (one line each, not full paragraphs)
      const mcpBrief = MCP_HOST_PATTERNS.patterns.map(p =>
        `- **${p.aspect}**: Codex (autonomous), Cursor (visible), Claude Desktop (conversational)`
      ).join('\n');

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are helping a user choose the right MCP host. Be direct and opinionated.

**Task type:** ${selectedType}

## Recommendations

${focusedComparison}

## MCP behavior by host
${mcpBrief}

## Graduation path
${GRADUATION_PATH.stages.map(s => `Stage ${s.stage}: **${s.host}** — ${s.trigger}`).join('\n')}

For other task types, read \`playbooks://comparison\`.

## Your Task

1. **Lead with a clear recommendation** — which host and why
2. **Acknowledge trade-offs** briefly
3. **Provide a quick-start** — what to do right now
4. **Mention graduation** if they're in a host that's limiting them

Be direct. Users need clarity, not a feature table.`
          }
        }]
      };
    }
  );

  // ==========================================================================
  // project_structure — "How should I organize my files for AI?"
  // ==========================================================================

  server.prompt(
    'project_structure',
    'Generate a recommended project folder structure optimized for AI-assisted work. Teaches users that folder structure IS their context architecture — how you organize files determines how well the AI understands your work.',
    {
      host: z.enum(['codex', 'cursor']).optional()
        .describe('Which host to optimize for (default: codex — the most structure-dependent)'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('Work domain for tailored templates (default: general)'),
      team_size: z.enum(['solo', 'small-team', 'organization']).optional()
        .describe('Team context affects structure complexity (default: solo)')
    },
    async ({ host, domain, team_size }) => {
      const selectedHost = host || 'codex';
      const selectedDomain = domain || 'general';
      const selectedTeam = team_size || 'solo';

      const playbook = HOST_PLAYBOOKS.find(p => p.slug === selectedHost);
      const folderTemplate = playbook?.folderTemplate;

      // Only include the selected domain's additions
      const domainAdditions: Record<string, string> = {
        construction: `Add: \`rfis/\` (open/responded/closed), \`daily-logs/\`, \`submittals/\`, \`safety/\`, \`photos/\`, \`contacts/\`. In instructions: RFI response standards, daily log format, Procore MCP data, client-facing tone.`,
        legal: `Add: \`cases/\` (per matter), \`research/\`, \`correspondence/\`, \`filings/\`, \`templates/\`, \`deadlines/\`. In instructions: jurisdiction formatting, citation style, confidentiality reminders.`,
        agency: `Add: \`clients/\` (per client), \`proposals/\`, \`deliverables/\`, \`brand-guidelines/\`, \`analytics/\`, \`invoicing/\`. In instructions: voice/style guide, deliverable review process, MCP servers per client.`,
        general: `Customize by adding domain-specific folders as your workflow develops.`
      };

      // Only the selected team size
      const teamNote: Record<string, string> = {
        solo: 'Solo: keep it simple. Focus on clear naming and consistent organization.',
        'small-team': 'Small team: add `shared/` and `handoffs/`. Clear naming so team members find files without asking.',
        organization: 'Organization: add `standards/`, `reviews/`, `approved/`, `archive/`. Encode approval workflows in instructions.'
      };

      const instructionFile = selectedHost === 'codex' ? 'AGENTS.md' : '.cursor/rules/';

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Help the user design their project folder structure for AI-assisted work. Folder structure IS context architecture.

**Host:** ${selectedHost === 'codex' ? 'Codex (autonomous)' : 'Cursor (IDE)'}
**Domain:** ${selectedDomain}
**Team:** ${selectedTeam}

> Your folder structure is your context window. Well-organized = AI understands your work from session one.

## Base Template

${folderTemplate ? `\`\`\`
${folderTemplate.structure}
\`\`\`
${folderTemplate.keyFiles.map(f => `- \`${f.path}\`: ${f.purpose}`).join('\n')}` : 'Use a clear hierarchy with descriptive names.'}

## Domain: ${selectedDomain}
${domainAdditions[selectedDomain] || domainAdditions.general}

## Team: ${selectedTeam}
${teamNote[selectedTeam]}

## ${instructionFile}
${selectedHost === 'codex'
  ? 'AGENTS.md is the most important file. Include: who you are, how you work, what MCPs are available, what to do, what NOT to do. Write it like onboarding a team member.'
  : '.cursor/rules/ holds .mdc files: style-guide, templates, data-sources, review-process, domain-knowledge. Auto-included when relevant.'}

## Task
1. Generate the complete folder structure for their domain and team
2. Write the key instruction file content
3. Provide a 5-minute quick start
4. Suggest what to add later as workflow matures

Be specific. Use their domain language.`
          }
        }]
      };
    }
  );
}
