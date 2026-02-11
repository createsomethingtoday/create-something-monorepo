/**
 * Tools — Automation tier (model-controlled).
 *
 * Exposes playbook content as tools for hosts that only support tools
 * (Codex, ChatGPT). Resources and Prompts are invisible to these hosts,
 * so the same content must be callable via tools.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './playbooks.js';
import type { HostPlaybook } from './playbooks.js';

export function registerTools(server: McpServer) {
  // ==========================================================================
  // get_playbook — retrieve workflow guidance for a specific host
  // ==========================================================================

  server.tool(
    'get_playbook',
    'Get the workflow playbook for an MCP host (Codex, Cursor, or Claude Desktop). Returns mental model, best practices, anti-patterns, workflow patterns, and recommended folder structure.',
    {
      host: z.enum(['codex', 'cursor', 'claude-desktop'])
        .describe('Which host to get the playbook for'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('Work domain to filter workflow patterns (default: all)'),
    },
    async ({ host, domain }) => {
      const playbook = HOST_PLAYBOOKS.find(p => p.slug === host);
      if (!playbook) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown host: ${host}` }) }] };
      }

      const patterns = domain
        ? playbook.workflowPatterns.filter(wp => !wp.domain || wp.domain === domain || wp.domain === 'general')
        : playbook.workflowPatterns;

      return {
        content: [{
          type: 'text',
          text: formatPlaybook(playbook, patterns),
        }],
      };
    }
  );

  // ==========================================================================
  // compare_hosts — which host is best for a task type
  // ==========================================================================

  server.tool(
    'compare_hosts',
    'Compare Codex, Cursor, and Claude Desktop for a specific type of work. Returns ranked recommendations with reasons.',
    {
      task_type: z.enum(['project-management', 'research', 'document-drafting', 'data-analysis', 'general']).optional()
        .describe('Type of work (default: general)'),
    },
    async ({ task_type }) => {
      const selectedType = task_type || 'general';
      const comparison = HOST_COMPARISONS.find(c => c.taskType === selectedType);

      if (!comparison) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown task type: ${selectedType}`, available: HOST_COMPARISONS.map(c => c.taskType) }) }] };
      }

      const lines = [
        `# Host Comparison: ${selectedType}`,
        '',
        ...comparison.recommendations.map(r =>
          `**${r.host}** [${r.fit.toUpperCase()}]: ${r.reason}`
        ),
        '',
        '## Graduation Path',
        ...GRADUATION_PATH.stages.map(s =>
          `Stage ${s.stage}: **${s.host}** — ${s.trigger}. Graduate when: ${s.graduationSignal}`
        ),
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // ==========================================================================
  // get_folder_structure — recommended project structure for a host
  // ==========================================================================

  server.tool(
    'get_folder_structure',
    'Get the recommended folder structure for AI-assisted work in Codex or Cursor. Includes key files and their purposes.',
    {
      host: z.enum(['codex', 'cursor']).optional()
        .describe('Which host (default: codex)'),
    },
    async ({ host }) => {
      const selectedHost = host || 'codex';
      const playbook = HOST_PLAYBOOKS.find(p => p.slug === selectedHost);

      if (!playbook?.folderTemplate) {
        return { content: [{ type: 'text', text: `No folder template available for ${selectedHost}.` }] };
      }

      const lines = [
        `# ${playbook.name} — Recommended Folder Structure`,
        '',
        playbook.folderTemplate.description,
        '',
        '```',
        playbook.folderTemplate.structure,
        '```',
        '',
        '## Key Files',
        '',
        ...playbook.folderTemplate.keyFiles.map(f =>
          `**\`${f.path}\`**: ${f.purpose}`
        ),
        '',
        `## ${selectedHost === 'codex' ? 'AGENTS.md' : '.cursor/rules/'} Guidance`,
        '',
        selectedHost === 'codex'
          ? 'AGENTS.md is the most important file. Include: who you are, how you work, what MCPs are available, what to do, what NOT to do. Write it like onboarding a team member.'
          : '.cursor/rules/ holds .mdc files (style-guide, templates, data-sources, review-process, domain-knowledge). Auto-included when relevant.',
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );
}

// ============================================================================
// Formatting helper
// ============================================================================

function formatPlaybook(playbook: HostPlaybook, patterns: HostPlaybook['workflowPatterns']): string {
  const lines = [
    `# ${playbook.name} — Workflow Playbook`,
    '',
    `## Mental Model`,
    playbook.mentalModel,
    '',
    `## Best For`,
    ...playbook.bestFor.map(b => `- ${b}`),
    '',
    `## Anti-Patterns (Avoid These)`,
    ...playbook.antiPatterns.map(a => `- ${a}`),
    '',
    `## Strengths`,
    ...playbook.strengths.map(s => `- ${s}`),
    '',
    `## Workflow Patterns`,
  ];

  for (const p of patterns) {
    lines.push('', `### ${p.name}`, p.description, '', ...p.steps.map((s, i) => `${i + 1}. ${s}`));
  }

  if (playbook.folderTemplate) {
    lines.push(
      '', '## Recommended Folder Structure', '',
      '```', playbook.folderTemplate.structure, '```', '',
      ...playbook.folderTemplate.keyFiles.map(f => `- **\`${f.path}\`**: ${f.purpose}`)
    );
  }

  lines.push('', `Config location: \`${playbook.configLocation}\``);

  return lines.join('\n');
}
