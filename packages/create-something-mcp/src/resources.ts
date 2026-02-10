/**
 * Resources — Database tier (application-controlled).
 * Browsable content across all CREATE SOMETHING properties.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PAPERS } from './content/generated/papers.js';
import { CANON_PAGES } from './content/generated/canon.js';
import { PATTERNS } from './content/generated/patterns.js';
import { GRAPH_NODES, GRAPH_EDGES } from './content/generated/graph.js';
import { MASTERS } from './content/masters.js';
import { PRAXIS_EXERCISES } from './content/praxis.js';
import { PRODUCTS } from './content/products.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './content/playbooks.js';
import {
  TIERS,
  CROSS_CUTTING_CONCERNS,
  MCP_MAPPINGS,
  CLOUDFLARE_MAPPINGS,
  AUTOMOTIVE_MAPPINGS,
  SAMPLING_EXPLANATION,
  POLICY_AS_ARTIFACT
} from './content/framework.js';

export function registerResources(server: McpServer) {
  // ==========================================================================
  // Papers (.io)
  // ==========================================================================

  server.resource(
    'papers-list',
    'papers://list',
    { description: `Index of ${PAPERS.length} research papers across methodology, architecture, and philosophy`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(PAPERS.map(p => ({
          slug: p.slug,
          title: p.title,
          category: p.category,
          date: p.date,
          readingTime: p.readingTime,
          difficulty: p.difficulty,
          uri: `papers://${p.slug}`
        })), null, 2)
      }]
    })
  );

  for (const paper of PAPERS) {
    server.resource(
      `paper-${paper.slug}`,
      `papers://${paper.slug}`,
      { description: `Paper: ${paper.title} (${paper.category})`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `# ${paper.title}\n\n${paper.subtitle ? `*${paper.subtitle}*\n\n` : ''}**Category:** ${paper.category} | **Reading Time:** ${paper.readingTime || '?'} min | **Difficulty:** ${paper.difficulty || 'intermediate'}\n\n${paper.content}`
        }]
      })
    );
  }

  // ==========================================================================
  // Canon Design System (.ltd)
  // ==========================================================================

  server.resource(
    'canon-list',
    'canon://list',
    { description: `Canon Design System: ${CANON_PAGES.length} pages across foundations, concepts, guidelines, and resources`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_PAGES.map(c => ({
          slug: c.slug,
          section: c.section,
          title: c.title,
          uri: `canon://${c.slug}`
        })), null, 2)
      }]
    })
  );

  for (const page of CANON_PAGES) {
    server.resource(
      `canon-${page.slug.replace(/\//g, '-')}`,
      `canon://${page.slug}`,
      { description: `Canon ${page.section}: ${page.title}`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `# ${page.title}\n\n**Section:** ${page.section}\n\n${page.content}`
        }]
      })
    );
  }

  // ==========================================================================
  // Design Patterns (.ltd)
  // ==========================================================================

  server.resource(
    'patterns-list',
    'patterns://list',
    { description: `${PATTERNS.length} design patterns from the CREATE SOMETHING philosophy`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(PATTERNS.map(p => ({
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle,
          uri: `patterns://${p.slug}`
        })), null, 2)
      }]
    })
  );

  for (const pattern of PATTERNS) {
    server.resource(
      `pattern-${pattern.slug}`,
      `patterns://${pattern.slug}`,
      { description: `Pattern: ${pattern.title}`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `# ${pattern.title}\n\n${pattern.subtitle ? `*${pattern.subtitle}*\n\n` : ''}${pattern.content}`
        }]
      })
    );
  }

  // ==========================================================================
  // Masters (.ltd)
  // ==========================================================================

  server.resource(
    'masters-list',
    'masters://list',
    { description: `${MASTERS.length} philosophical and design masters who influence CREATE SOMETHING`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(MASTERS.map(m => ({
          slug: m.slug,
          name: m.name,
          discipline: m.discipline,
          era: m.era,
          uri: `masters://${m.slug}`
        })), null, 2)
      }]
    })
  );

  for (const master of MASTERS) {
    server.resource(
      `master-${master.slug}`,
      `masters://${master.slug}`,
      { description: `Master: ${master.name} — ${master.discipline}`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `# ${master.name}\n\n**Discipline:** ${master.discipline} | **Era:** ${master.era}\n\n## Philosophy\n\n${master.philosophy}\n\n## Principles\n\n${master.principles.map(p => `- ${p}`).join('\n')}\n\n## Influence on CREATE SOMETHING\n\n${master.influence}`
        }]
      })
    );
  }

  // ==========================================================================
  // Three-Tier Framework
  // ==========================================================================

  server.resource(
    'framework-definitions',
    'framework://definitions',
    { description: 'All three tier definitions (Database, Automation, Judgment)', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(TIERS, null, 2) }]
    })
  );

  for (const [key, tier] of Object.entries(TIERS)) {
    server.resource(
      `framework-definitions-${key}`,
      `framework://definitions/${key}`,
      { description: `${tier.name} tier: ${tier.definition}`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(tier, null, 2) }]
      })
    );
  }

  server.resource(
    'framework-crosscutting',
    'framework://crosscutting',
    { description: 'Four cross-cutting concerns: Touchpoints, Artifacts, Orchestration, Insight', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CROSS_CUTTING_CONCERNS, null, 2) }]
    })
  );

  server.resource(
    'framework-mappings-mcp',
    'framework://mappings/mcp',
    { description: 'MCP primitives → framework tiers via control models', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(MCP_MAPPINGS, null, 2) }]
    })
  );

  server.resource(
    'framework-mappings-cloudflare',
    'framework://mappings/cloudflare',
    { description: 'Cloudflare services → framework tiers', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(CLOUDFLARE_MAPPINGS, null, 2) }]
    })
  );

  server.resource(
    'framework-mappings-automotive',
    'framework://mappings/automotive',
    { description: 'Automotive Framework metaphor: Chassis, Engine, Fuel Tank, etc.', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(AUTOMOTIVE_MAPPINGS, null, 2) }]
    })
  );

  server.resource(
    'framework-sampling',
    'framework://sampling',
    { description: 'The recursive property: how MCP sampling allows Automation to request Judgment', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(SAMPLING_EXPLANATION, null, 2) }]
    })
  );

  server.resource(
    'framework-policy',
    'framework://policy-as-artifact',
    { description: 'Policy as artifact: how constraints flow through tiers as data', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(POLICY_AS_ARTIFACT, null, 2) }]
    })
  );

  // ==========================================================================
  // Knowledge Graph (.io)
  // ==========================================================================

  server.resource(
    'graph-nodes',
    'graph://nodes',
    { description: `Knowledge graph: ${GRAPH_NODES.length} connected concept nodes`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(GRAPH_NODES.map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          concepts: n.concepts
        })), null, 2)
      }]
    })
  );

  server.resource(
    'graph-edges',
    'graph://edges',
    { description: `Knowledge graph: ${GRAPH_EDGES.length} relationships between concepts`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(GRAPH_EDGES.slice(0, 200).map(e => ({
          source: e.source,
          target: e.target,
          type: e.type,
          reason: e.reason
        })), null, 2)
      }]
    })
  );

  // ==========================================================================
  // Praxis Exercises (.space)
  // ==========================================================================

  server.resource(
    'praxis-exercises',
    'praxis://exercises',
    { description: `${PRAXIS_EXERCISES.length} interactive coding exercises teaching patterns through the Subtractive Triad`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(PRAXIS_EXERCISES.map(e => ({
          id: e.id,
          number: e.number,
          title: e.title,
          pattern: e.pattern,
          estimatedMinutes: e.estimatedMinutes,
          situation: e.context.situation,
          task: e.context.task,
          starterCode: e.starterCode,
          solution: e.solution,
          whyItMatters: e.whyItMatters
        })), null, 2)
      }]
    })
  );

  // ==========================================================================
  // Products & Services (.agency)
  // ==========================================================================

  server.resource(
    'products-list',
    'products://list',
    { description: `${PRODUCTS.length} products and services from CREATE SOMETHING`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(PRODUCTS, null, 2)
      }]
    })
  );

  // ==========================================================================
  // Host Playbooks — Workflow Intelligence (.space)
  // ==========================================================================

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

  for (const playbook of HOST_PLAYBOOKS) {
    server.resource(
      `playbook-${playbook.slug}`,
      `playbooks://hosts/${playbook.slug}`,
      { description: `${playbook.name} workflow playbook: mental model, patterns, anti-patterns, and folder structure`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: formatPlaybookMarkdown(playbook)
        }]
      })
    );
  }

  server.resource(
    'playbooks-comparison',
    'playbooks://comparison',
    { description: 'Host comparison matrix: which host is best for which task type (project management, research, document drafting, data analysis)', mimeType: 'application/json' },
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

  server.resource(
    'playbooks-graduation',
    'playbooks://graduation-path',
    { description: 'The Graduation Path: Claude Desktop → Cursor → Codex. How to progress through MCP hosts as skills develop.', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: formatGraduationPathMarkdown()
      }]
    })
  );
}

// ============================================================================
// Playbook formatting helpers
// ============================================================================

function formatPlaybookMarkdown(playbook: typeof HOST_PLAYBOOKS[number]): string {
  const sections = [
    `# ${playbook.name} — Host Workflow Playbook`,
    '',
    playbook.description,
    '',
    '## Mental Model',
    '',
    playbook.mentalModel,
    '',
    '## Strengths',
    '',
    ...playbook.strengths.map(s => `- ${s}`),
    '',
    '## Best For',
    '',
    ...playbook.bestFor.map(b => `- ${b}`),
    '',
    '## Anti-Patterns (What NOT to Do)',
    '',
    ...playbook.antiPatterns.map(a => `- ${a}`),
    '',
    '## Configuration',
    '',
    `Config location: \`${playbook.configLocation}\``,
    '',
    '## Workflow Patterns',
    ''
  ];

  for (const pattern of playbook.workflowPatterns) {
    sections.push(
      `### ${pattern.name}`,
      '',
      pattern.description,
      pattern.domain ? `\n*Domain: ${pattern.domain}*` : '',
      '',
      ...pattern.steps.map((s, i) => `${i + 1}. ${s}`),
      ''
    );
  }

  if (playbook.folderTemplate) {
    sections.push(
      '## Recommended Folder Structure',
      '',
      playbook.folderTemplate.description,
      '',
      '```',
      playbook.folderTemplate.structure,
      '```',
      '',
      '### Key Files',
      '',
      ...playbook.folderTemplate.keyFiles.map(f =>
        `- **\`${f.path}\`**: ${f.purpose}`
      ),
      ''
    );
  }

  return sections.join('\n');
}

function formatGraduationPathMarkdown(): string {
  const sections = [
    `# ${GRADUATION_PATH.title}`,
    '',
    GRADUATION_PATH.description,
    ''
  ];

  for (const stage of GRADUATION_PATH.stages) {
    sections.push(
      `## Stage ${stage.stage}: ${stage.host}`,
      '',
      `**Trigger:** ${stage.trigger}`,
      '',
      '**Skills to develop:**',
      '',
      ...stage.skills.map(s => `- ${s}`),
      '',
      `**When to graduate:** ${stage.graduationSignal}`,
      ''
    );
  }

  sections.push(
    '## MCP Usage Across Hosts',
    '',
    MCP_HOST_PATTERNS.description,
    ''
  );

  for (const pattern of MCP_HOST_PATTERNS.patterns) {
    sections.push(
      `### ${pattern.aspect}`,
      '',
      `- **Codex:** ${pattern.codex}`,
      `- **Cursor:** ${pattern.cursor}`,
      `- **Claude Desktop:** ${pattern.claudeDesktop}`,
      ''
    );
  }

  return sections.join('\n');
}
