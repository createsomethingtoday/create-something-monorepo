/**
 * Prompts — Judgment tier (user-controlled).
 * Three workflow guidance prompts for non-technical users.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './playbooks.js';

export function registerPrompts(server: McpServer) {
  // ==========================================================================
  // workflow_setup
  // ==========================================================================

  server.prompt(
    'workflow_setup',
    'Generate a personalized workflow guide for using MCP hosts effectively. The entry point for non-technical users who have MCPs installed but need guidance on how to work.',
    {
      host: z.enum(['codex', 'cursor', 'claude-desktop', 'auto']).optional()
        .describe('Which MCP host the user is working in. Use "auto" or omit to detect from context.'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('The user\'s work domain (default: general)')
    },
    async ({ host, domain }) => {
      const selectedDomain = domain || 'general';
      const autoDetect = !host || host === 'auto';

      let hostSection: string;

      if (autoDetect) {
        const summaries = HOST_PLAYBOOKS.map(p =>
          `- **${p.name}**: ${p.description} Best for: ${p.bestFor.slice(0, 2).join(', ')}.`
        ).join('\n');

        hostSection = `Determine the host from context:
- IDE with file editing → **Cursor**
- Project folder with git → **Codex**
- Conversation thread → **Claude Desktop**

Available hosts:
${summaries}

Once determined, read \`playbooks://hosts/{slug}\` for the full playbook.`;
      } else {
        const playbook = HOST_PLAYBOOKS.find(p => p.slug === host);
        if (playbook) {
          const patterns = playbook.workflowPatterns
            .filter(wp => !wp.domain || wp.domain === selectedDomain || wp.domain === 'general')
            .map(wp => `  - **${wp.name}**: ${wp.description}`)
            .join('\n');

          hostSection = `The user is working in **${playbook.name}**.

**Mental Model:** ${playbook.mentalModel}

**Best for:** ${playbook.bestFor.join(', ')}

**Anti-patterns:**
${playbook.antiPatterns.map(a => `- ${a}`).join('\n')}

**Workflow patterns:**
${patterns}

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
            text: `You are a workflow advisor helping a user set up their AI-assisted work environment.

**Domain:** ${selectedDomain}

---

${hostSection}

---

## Your Task

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
  // host_comparison
  // ==========================================================================

  server.prompt(
    'host_comparison',
    'Compare MCP hosts (Codex, Cursor, Claude Desktop) for a specific task type.',
    {
      task_type: z.enum(['project-management', 'research', 'document-drafting', 'data-analysis', 'general']).optional()
        .describe('The type of work to compare hosts for (default: general)')
    },
    async ({ task_type }) => {
      const selectedType = task_type || 'general';
      const comparison = HOST_COMPARISONS.find(c => c.taskType === selectedType);

      const focusedComparison = comparison
        ? comparison.recommendations
            .map(r => `- **${r.host}** [${r.fit.toUpperCase()}]: ${r.reason}`)
            .join('\n')
        : 'Read `playbooks://comparison` for the full matrix.';

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Help the user choose the right MCP host. Be direct and opinionated.

**Task type:** ${selectedType}

## Recommendations

${focusedComparison}

## Graduation path
${GRADUATION_PATH.stages.map(s => `Stage ${s.stage}: **${s.host}** — ${s.trigger}`).join('\n')}

## Task

1. Lead with a clear recommendation — which host and why
2. Acknowledge trade-offs briefly
3. Provide a quick-start — what to do right now
4. Mention graduation if they're in a host that's limiting them`
          }
        }]
      };
    }
  );

  // ==========================================================================
  // project_structure
  // ==========================================================================

  server.prompt(
    'project_structure',
    'Generate a recommended project folder structure optimized for AI-assisted work.',
    {
      host: z.enum(['codex', 'cursor']).optional()
        .describe('Which host to optimize for (default: codex)'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('Work domain (default: general)'),
      team_size: z.enum(['solo', 'small-team', 'organization']).optional()
        .describe('Team context (default: solo)')
    },
    async ({ host, domain, team_size }) => {
      const selectedHost = host || 'codex';
      const selectedDomain = domain || 'general';
      const selectedTeam = team_size || 'solo';
      const playbook = HOST_PLAYBOOKS.find(p => p.slug === selectedHost);
      const folderTemplate = playbook?.folderTemplate;

      const domainHints: Record<string, string> = {
        construction: `Add: \`rfis/\`, \`daily-logs/\`, \`submittals/\`, \`safety/\`, \`photos/\`, \`contacts/\`. Instructions: RFI standards, daily log format, Procore MCP data.`,
        legal: `Add: \`cases/\`, \`research/\`, \`correspondence/\`, \`filings/\`, \`templates/\`, \`deadlines/\`. Instructions: jurisdiction formatting, citation style.`,
        agency: `Add: \`clients/\`, \`proposals/\`, \`deliverables/\`, \`brand-guidelines/\`, \`analytics/\`. Instructions: voice guide, review process, per-client MCPs.`,
        general: `Customize by adding domain-specific folders as your workflow develops.`
      };

      const teamHints: Record<string, string> = {
        solo: 'Solo: keep it simple. Clear naming, consistent organization.',
        'small-team': 'Small team: add `shared/` and `handoffs/`. Clear naming conventions.',
        organization: 'Organization: add `standards/`, `reviews/`, `approved/`, `archive/`. Encode approval workflows.'
      };

      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Help design a project folder structure for AI-assisted work. Folder structure IS context architecture.

**Host:** ${selectedHost === 'codex' ? 'Codex (autonomous)' : 'Cursor (IDE)'}
**Domain:** ${selectedDomain}
**Team:** ${selectedTeam}

## Base Template
${folderTemplate ? `\`\`\`
${folderTemplate.structure}
\`\`\`
${folderTemplate.keyFiles.map(f => `- \`${f.path}\`: ${f.purpose}`).join('\n')}` : 'Use a clear hierarchy with descriptive names.'}

## Domain: ${selectedDomain}
${domainHints[selectedDomain] || domainHints.general}

## Team: ${selectedTeam}
${teamHints[selectedTeam]}

## ${selectedHost === 'codex' ? 'AGENTS.md' : '.cursor/rules/'}
${selectedHost === 'codex'
  ? 'AGENTS.md is the most important file. Include: who you are, how you work, what MCPs are available, what to do, what NOT to do.'
  : '.cursor/rules/ holds .mdc files: style-guide, templates, data-sources, review-process, domain-knowledge.'}

## Task
1. Generate the complete folder structure
2. Write the key instruction file content
3. Provide a 5-minute quick start
4. Suggest what to add later`
          }
        }]
      };
    }
  );
}
