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

      // Build host context based on selection or auto-detect guidance
      let hostContext: string;
      if (autoDetect) {
        hostContext = `The user hasn't specified which host they're using. Determine this from context:
- If you're running inside an IDE with file editing capabilities, they're likely in **Cursor**.
- If you're running with access to a project folder and git, they're likely in **Codex**.
- If you're in a conversation thread with no file system access, they're likely in **Claude Desktop**.

Once you determine the host, use the appropriate playbook below.`;
      } else {
        const playbook = HOST_PLAYBOOKS.find(p => p.slug === host);
        hostContext = playbook
          ? `The user is working in **${playbook.name}**.\n\n${playbook.mentalModel}`
          : `Host: ${host}`;
      }

      // Build the full playbook reference
      const playbookReference = HOST_PLAYBOOKS.map(p => {
        const relevantPatterns = p.workflowPatterns
          .filter(wp => !wp.domain || wp.domain === selectedDomain || wp.domain === 'general')
          .map(wp => `  - **${wp.name}**: ${wp.description}`)
          .join('\n');

        return `### ${p.name}
**Mental Model:** ${p.mentalModel}

**Best for:** ${p.bestFor.join(', ')}

**Anti-patterns to avoid:**
${p.antiPatterns.map(a => `- ${a}`).join('\n')}

**Relevant workflow patterns:**
${relevantPatterns}

${p.folderTemplate ? `**Recommended folder structure:**
\`\`\`
${p.folderTemplate.structure}
\`\`\`` : ''}`;
      }).join('\n\n---\n\n');

      // Build the graduation path reference
      const graduationRef = GRADUATION_PATH.stages.map(s =>
        `**Stage ${s.stage} — ${s.host}:** ${s.trigger}. Graduate when: ${s.graduationSignal}`
      ).join('\n');

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are a workflow advisor helping a user set up their AI-assisted work environment. Your goal is to move them from just "asking questions" (Database tier) to producing real outcomes (Automation/Judgment tiers).

${hostContext}

**User's domain:** ${selectedDomain}

---

## Host Playbooks Reference

${playbookReference}

---

## The Graduation Path

${graduationRef}

---

## Your Task

Based on the user's host and domain, provide a personalized workflow setup guide:

1. **Confirm their host** — verify or detect which environment they're in
2. **Assess their current usage** — are they mostly asking questions (Database tier) or producing outcomes?
3. **Recommend a workflow** — pick the most relevant workflow pattern for their domain
4. **Set up their structure** — provide the folder structure, config files, and key files they need
5. **Identify anti-patterns** — warn them about the most common mistakes for their host
6. **Suggest next steps** — what should they do first? What's the 5-minute quick win?

Be specific and actionable. Use plain language — the user may not be technical. Avoid jargon. Focus on outcomes, not technology.

If they're in Claude Desktop and their needs suggest Codex would serve them better, gently suggest the graduation path — but don't push. Meet them where they are.`
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

      // Build the comparison matrix for all task types
      const fullMatrix = HOST_COMPARISONS.map(c => {
        const recs = c.recommendations
          .map(r => `  - **${r.host}** (${r.fit}): ${r.reason}`)
          .join('\n');
        return `### ${c.taskType}\n${recs}`;
      }).join('\n\n');

      // Build MCP patterns reference
      const mcpPatterns = MCP_HOST_PATTERNS.patterns.map(p =>
        `### ${p.aspect}\n- **Codex:** ${p.codex}\n- **Cursor:** ${p.cursor}\n- **Claude Desktop:** ${p.claudeDesktop}`
      ).join('\n\n');

      // Highlighted comparison for the requested type
      const focusedComparison = comparison
        ? comparison.recommendations
            .map(r => `- **${r.host}** [${r.fit.toUpperCase()}]: ${r.reason}`)
            .join('\n')
        : 'No specific comparison available for this task type.';

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are helping a user choose the right MCP host for their work. Provide clear, opinionated guidance — not "it depends" but "here's what I'd recommend and why."

**Task type in focus:** ${selectedType}

## Recommendation for ${selectedType}

${focusedComparison}

---

## Full Comparison Matrix

${fullMatrix}

---

## How MCP Usage Differs by Host

${mcpPatterns}

---

## The Graduation Path

${GRADUATION_PATH.description}

${GRADUATION_PATH.stages.map(s => `**Stage ${s.stage} — ${s.host}:** ${s.trigger}`).join('\n')}

---

## Your Task

1. **Lead with a clear recommendation** for ${selectedType} — which host and why
2. **Acknowledge trade-offs** — what the recommended host is less good at
3. **Explain the MCP difference** — how MCP servers behave differently in each host for this task type
4. **Provide a quick-start** — what should they do right now to get started with the recommended host?
5. **Mention the graduation path** if relevant — are they in a host that's limiting them?

Be direct and opinionated. Users need clarity, not a feature comparison table. If one host is clearly better for their task, say so.`
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

      // Build domain-specific additions
      const domainAdditions: Record<string, string> = {
        construction: `
### Construction-Specific Additions

For construction project management, add these to your structure:

- \`rfis/\` — RFI tracking: \`rfis/open/\`, \`rfis/responded/\`, \`rfis/closed/\`
- \`daily-logs/\` — Daily field reports organized by date
- \`submittals/\` — Submittal tracking and review status
- \`safety/\` — Safety reports, incident logs, toolbox talks
- \`photos/\` — Site photos organized by date or area
- \`contacts/\` — Subcontractor and stakeholder contact sheets

**Template suggestions for AGENTS.md / .cursor/rules:**
- Include your company's RFI response standards
- Define your daily log format and required fields
- Specify which Procore data to pull via MCP
- Set tone and formality level for client-facing documents`,
        legal: `
### Legal Practice Additions

For legal work, add these to your structure:

- \`cases/\` — One folder per case or matter
- \`research/\` — Legal research memos and case law
- \`correspondence/\` — Client and opposing counsel correspondence
- \`filings/\` — Court filings organized by case
- \`templates/\` — Standard legal document templates (motions, briefs, letters)
- \`deadlines/\` — Tracking file for court dates and filing deadlines

**Template suggestions for AGENTS.md / .cursor/rules:**
- Include your jurisdiction's formatting requirements
- Define citation style preferences
- Set confidentiality reminders for client data
- Specify document naming conventions`,
        agency: `
### Agency / Client Services Additions

For agency work, add these to your structure:

- \`clients/\` — One folder per client
- \`proposals/\` — Proposal drafts and templates
- \`deliverables/\` — Active deliverable tracking
- \`brand-guidelines/\` — Client brand guides and assets
- \`analytics/\` — Performance reports and metrics
- \`invoicing/\` — Invoice tracking and templates

**Template suggestions for AGENTS.md / .cursor/rules:**
- Include your agency's voice and style guide
- Define deliverable review process
- Specify MCP servers per client (QuickBooks for invoicing, etc.)`,
        general: `
### General Workspace

The default structure works well for most use cases. Customize by adding domain-specific folders as your workflow develops.`
      };

      // Team size adjustments
      const teamAdjustments: Record<string, string> = {
        solo: 'As a solo user, keep the structure simple. You are both the operator and the reviewer. Focus on clear naming and consistent organization.',
        'small-team': `With a small team, add coordination layers:
- \`shared/\` — Files that multiple team members reference
- \`handoffs/\` — Documents in transition between team members
- Use clear naming conventions so team members can find files without asking
- In AGENTS.md, document who is responsible for what`,
        organization: `For organizational use, add governance:
- \`standards/\` — Organizational standards and SOPs
- \`reviews/\` — Documents pending review with clear ownership
- \`approved/\` — Only documents that have passed review
- \`archive/\` — Completed and retired documents with dates
- In AGENTS.md, encode approval workflows and role-based access patterns
- Consider separate project folders per department or team`
      };

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `You are helping a user design their project folder structure for AI-assisted work. This is one of the most impactful decisions they'll make — folder structure IS context architecture. How they organize files determines how well the AI understands their work.

**Host:** ${selectedHost === 'codex' ? 'Codex (autonomous, folder-native)' : 'Cursor (IDE, file-aware)'}
**Domain:** ${selectedDomain}
**Team size:** ${selectedTeam}

---

## Key Principle

> Your folder structure is your context window. The AI reads your files to understand your world. A well-organized project folder means the AI starts every session already understanding your work. A messy folder means re-explaining everything every time.

---

## Base Template for ${playbook?.name || selectedHost}

${folderTemplate ? `${folderTemplate.description}

\`\`\`
${folderTemplate.structure}
\`\`\`

### Key Files
${folderTemplate.keyFiles.map(f => `- **\`${f.path}\`**: ${f.purpose}`).join('\n')}` : 'Use a clear hierarchical structure with descriptive folder names.'}

---

${domainAdditions[selectedDomain] || domainAdditions.general}

---

## Team Size: ${selectedTeam}

${teamAdjustments[selectedTeam]}

---

## ${selectedHost === 'codex' ? 'AGENTS.md' : '.cursor/rules/'} Guidance

${selectedHost === 'codex' ? `The AGENTS.md file is the single most important file in your project. It tells the AI:

1. **Who you are** — your role, your organization, your responsibilities
2. **How you work** — your standards, preferred formats, tone and formality
3. **What's available** — which MCP servers are connected and what they provide
4. **What to do** — recurring tasks, default behaviors, quality standards
5. **What NOT to do** — boundaries, confidentiality rules, things that require human approval

Write AGENTS.md as if you're onboarding a new team member. The more specific you are, the better the output. In monorepos, place additional AGENTS.md files in subdirectories — the closest file to the working directory takes precedence.` : `The .cursor/rules/ directory holds .mdc files — each one teaches the AI about a specific aspect of your work:

1. **style-guide.mdc** — writing tone, formality, terminology
2. **templates.mdc** — how to use your document templates
3. **data-sources.mdc** — which MCP servers to use for what data
4. **review-process.mdc** — how documents should be reviewed and approved
5. **domain-knowledge.mdc** — industry-specific knowledge the AI should know

Each rule file is automatically included when relevant. Think of them as institutional knowledge that compounds over time.`}

---

## Your Task

1. **Generate the complete folder structure** — tailored to their domain and team size
2. **Write the key instruction file** — AGENTS.md or .cursor/rules/ content that's immediately useful
3. **Explain WHY each folder exists** — help them understand the architecture, not just copy the structure
4. **Provide a 5-minute quick start** — what's the minimum they need to create right now to start getting value?
5. **Suggest what to add later** — as their workflow matures, what folders and rules should they add?

Be specific. Use their domain language. If they're in construction, mention RFIs and daily logs. If they're in legal, mention cases and filings. Make it feel tailored to them, not generic.`
          }
        }]
      };
    }
  );
}
