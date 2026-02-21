/**
 * Resources — Database tier (application-controlled).
 * Just the playbook content. Nothing else.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './playbooks.js';
import type { HostPlaybook } from './playbooks.js';
import { WORKFLOWS } from './workflows.js';
import { exportWorkflowToAtlasStudio, exportOutcomePlaybookToAtlasStudio } from './atlas-studio.js';
import { OUTCOME_PLAYBOOKS } from './outcome-playbooks.js';

export function registerResources(server: McpServer) {
  // List
  server.resource(
    'playbooks-list',
    'playbooks://list',
    { description: `Host workflow playbooks for ${HOST_PLAYBOOKS.length} MCP hosts: ${HOST_PLAYBOOKS.map(p => p.name).join(', ')}`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(HOST_PLAYBOOKS.map(p => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          bestFor: p.bestFor,
          uri: `playbooks://hosts/${p.slug}`
        })), null, 2)
      }]
    })
  );

  // Per-host playbooks
  for (const playbook of HOST_PLAYBOOKS) {
    server.resource(
      `playbook-${playbook.slug}`,
      `playbooks://hosts/${playbook.slug}`,
      { description: `${playbook.name} workflow playbook: mental model, patterns, anti-patterns, folder structure`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: formatPlaybookMarkdown(playbook)
        }]
      })
    );
  }

  // Structured workflows (machine-readable)
  server.resource(
    'playbooks-workflows-list',
    'playbooks://workflows/list',
    { description: `Structured workflows (${WORKFLOWS.length}) derived from host playbooks`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(WORKFLOWS.map((w) => ({
          id: w.id,
          hostSlug: w.hostSlug,
          hostName: w.hostName,
          name: w.name,
          description: w.description,
          domain: w.domain,
          uri: `playbooks://workflows/${w.id}`,
          atlasStudioUri: `playbooks://workflows/${w.id}/atlas-studio`,
        })), null, 2)
      }]
    })
  );

  for (const workflow of WORKFLOWS) {
    server.resource(
      `workflow-${workflow.id}`,
      `playbooks://workflows/${workflow.id}`,
      { description: `Workflow: ${workflow.name} (${workflow.hostName})`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(workflow, null, 2),
        }],
      }),
    );

    server.resource(
      `workflow-${workflow.id}-atlas-studio`,
      `playbooks://workflows/${workflow.id}/atlas-studio`,
      { description: `Atlas Studio import JSON for workflow: ${workflow.name} (${workflow.hostName})`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(exportWorkflowToAtlasStudio(workflow), null, 2),
        }],
      }),
    );
  }

  // Outcome playbooks (AI-native workflow library)
  server.resource(
    'playbooks-outcomes-list',
    'playbooks://outcomes/list',
    { description: `Outcome playbooks (${OUTCOME_PLAYBOOKS.length}) — AI-native workflows for construction, agency, and ops`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(OUTCOME_PLAYBOOKS.map((p) => ({
          id: p.id,
          name: p.name,
          vertical: p.vertical,
          priority: p.priority,
          description: p.description,
          oversight: p.oversight,
          uri: `playbooks://outcomes/${p.id}`,
          atlasStudioUri: `playbooks://outcomes/${p.id}/atlas-studio`,
        })), null, 2),
      }],
    }),
  );

  for (const playbook of OUTCOME_PLAYBOOKS) {
    server.resource(
      `outcome-${playbook.id}`,
      `playbooks://outcomes/${playbook.id}`,
      { description: `Outcome playbook: ${playbook.name} (${playbook.vertical})`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(playbook, null, 2),
        }],
      }),
    );

    server.resource(
      `outcome-${playbook.id}-atlas-studio`,
      `playbooks://outcomes/${playbook.id}/atlas-studio`,
      { description: `Atlas Studio import JSON for outcome playbook: ${playbook.name}`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(exportOutcomePlaybookToAtlasStudio(playbook), null, 2),
        }],
      }),
    );
  }

  // Comparison matrix
  server.resource(
    'playbooks-comparison',
    'playbooks://comparison',
    { description: 'Host comparison: which host for which task type', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          comparisons: HOST_COMPARISONS,
          graduationPath: GRADUATION_PATH,
          mcpPatterns: MCP_HOST_PATTERNS
        }, null, 2)
      }]
    })
  );

  // Graduation path
  server.resource(
    'playbooks-graduation',
    'playbooks://graduation-path',
    { description: 'The Graduation Path: Claude Desktop -> Cursor -> Codex', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: formatGraduationPathMarkdown()
      }]
    })
  );
}

function formatPlaybookMarkdown(playbook: HostPlaybook): string {
  const sections = [
    `# ${playbook.name} — Host Workflow Playbook`,
    '', playbook.description,
    '', '## Mental Model', '', playbook.mentalModel,
    '', '## Strengths', '', ...playbook.strengths.map(s => `- ${s}`),
    '', '## Best For', '', ...playbook.bestFor.map(b => `- ${b}`),
    '', '## Anti-Patterns', '', ...playbook.antiPatterns.map(a => `- ${a}`),
    '', `Config: \`${playbook.configLocation}\``,
    '', '## Workflow Patterns', ''
  ];
  for (const p of playbook.workflowPatterns) {
    sections.push(
      `### ${p.name}`,
      '',
      p.description,
      '',
      ...p.steps.map((s, i) => `${i + 1}. ${s.notes || s.customLabel || s.referenceId}`),
      ''
    );
  }
  if (playbook.folderTemplate) {
    sections.push('## Folder Structure', '', playbook.folderTemplate.description, '', '```', playbook.folderTemplate.structure, '```', '',
      ...playbook.folderTemplate.keyFiles.map(f => `- **\`${f.path}\`**: ${f.purpose}`), '');
  }
  return sections.join('\n');
}

function formatGraduationPathMarkdown(): string {
  const sections = [
    `# ${GRADUATION_PATH.title}`, '', GRADUATION_PATH.description, ''
  ];
  for (const s of GRADUATION_PATH.stages) {
    sections.push(`## Stage ${s.stage}: ${s.host}`, '', `**Trigger:** ${s.trigger}`, '', ...s.skills.map(sk => `- ${sk}`), '', `**Graduate when:** ${s.graduationSignal}`, '');
  }
  return sections.join('\n');
}
