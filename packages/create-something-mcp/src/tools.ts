/**
 * Tools — Automation tier (model-controlled).
 * Search, relate, classify, apply, and audit across all content.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { search, findRelated } from './search.js';
import {
  registerFlueRunHistoryTools,
  type FlueRunHistoryToolOptions,
} from './flue-run-history-tools.js';
import {
  classifyComponent,
  debugSystem,
  analyzeMCPServer,
  mapToAutomotive,
  TIERS,
  CROSS_CUTTING_CONCERNS
} from './content/framework.js';
import { MASTERS } from './content/masters.js';

/**
 * Annotation that marks content as visible to both user and assistant.
 * MCP spec 2025-11-25: annotations.audience tells the client WHO should see each content item.
 * Without this, tool results may only be consumed by the model and hidden from the user.
 */
const USER_VISIBLE = {
  annotations: {
    audience: ['user' as const, 'assistant' as const],
    priority: 0.8,
  }
};

export interface RegisterToolsOptions {
  flueRunHistory?: FlueRunHistoryToolOptions;
}

export function registerTools(server: McpServer, options: RegisterToolsOptions = {}) {
  // ==========================================================================
  // search — Cross-property full-text search
  // ==========================================================================

  server.tool(
    'search',
    'Search across all CREATE SOMETHING content: papers, Canon design system, patterns, masters, praxis exercises, products, full property markdown documents, and framework definitions. Returns ranked results with matched terms.',
    {
      query: z.string().describe('Search query — can be a concept, term, or phrase'),
      type: z.enum(['paper', 'canon', 'pattern', 'master', 'praxis', 'product', 'framework', 'playbook', 'document']).optional()
        .describe('Filter results to a specific content type'),
      property: z.enum(['io', 'ltd', 'space', 'agency', 'framework']).optional()
        .describe('Filter results to a specific property'),
      limit: z.number().min(1).max(50).optional()
        .describe('Maximum number of results (default: 10)')
    },
    async ({ query, type, property, limit }) => {
      const results = search(query, { type, property, limit: limit || 10 });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No results found for "${query}". Try broader terms or different filters.`,
            ...USER_VISIBLE,
          }]
        };
      }

      const PROPERTY_LABELS: Record<string, string> = { io: '.io', ltd: '.ltd', space: '.space', agency: '.agency', framework: 'Framework' };
      const TYPE_ICONS: Record<string, string> = { paper: 'Paper', canon: 'Canon', pattern: 'Pattern', master: 'Master', praxis: 'Praxis', product: 'Product', framework: 'Framework', playbook: 'Playbook', document: 'Document' };

      const lines = [`## Search: "${query}"\n`, `**${results.length} results found**\n`];

      for (const [i, r] of results.entries()) {
        const prop = PROPERTY_LABELS[r.item.property] || r.item.property;
        const typeLabel = TYPE_ICONS[r.item.type] || r.item.type;
        lines.push(`### ${i + 1}. ${r.item.title}`);
        lines.push(`**${typeLabel}** | ${prop} | Score: ${r.score} | \`${r.item.uri}\``);
        if (r.item.description) {
          lines.push(`\n${r.item.description.slice(0, 300)}`);
        }
        lines.push('');
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  // ==========================================================================
  // relate — Knowledge graph traversal
  // ==========================================================================

  server.tool(
    'relate',
    'Find related concepts in the CREATE SOMETHING knowledge graph. Given a concept, traverses the graph to find connected ideas, files, and relationships.',
    {
      concept: z.string().describe('Concept, topic, or file path to find connections for'),
      depth: z.number().min(1).max(3).optional().describe('How many hops to traverse (default: 1)')
    },
    async ({ concept, depth }) => {
      const result = await findRelated(concept, depth || 1);

      if (result.nodes.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No graph connections found for "${concept}". Try a broader term or check \`graph://nodes\` for available concepts.`,
            ...USER_VISIBLE,
          }]
        };
      }

      const lines = [
        `## Related to: "${concept}"\n`,
        `**${result.nodes.length} connected nodes** | **${result.edges.length} relationships** | Depth: ${depth || 1}\n`,
        `### Connected Nodes\n`,
        '| Title | Type | Concepts |',
        '|-------|------|----------|'
      ];

      for (const n of result.nodes.slice(0, 30)) {
        const concepts = n.concepts.length > 0 ? n.concepts.join(', ') : '—';
        lines.push(`| ${n.title} | ${n.type} | ${concepts} |`);
      }

      if (result.edges.length > 0) {
        lines.push('', '### Key Relationships\n');
        const shown = result.edges.filter(e => e.reason).slice(0, 20);
        for (const e of shown) {
          const from = e.source.split('/').pop() || e.source;
          const to = e.target.split('/').pop() || e.target;
          lines.push(`- **${from}** → **${to}** — ${e.reason}`);
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  // ==========================================================================
  // classify_component — Three-Tier Framework classification
  // ==========================================================================

  server.tool(
    'classify_component',
    'Classify a component or service into Three-Tier Framework tiers (Database, Automation, Judgment) with confidence scores and boundary analysis.',
    {
      description: z.string().describe('Description of the component or service to classify'),
      context: z.string().optional().describe('Additional context about the system')
    },
    async ({ description, context }) => {
      const result = classifyComponent(description, context);

      const tierDef = TIERS[result.primary as keyof typeof TIERS];
      const lines = [
        `## Classification: ${tierDef?.name || result.primary} Tier\n`,
        `**Input:** ${description}\n`,
        `${result.rationale}\n`,
      ];

      if (result.tiers.length > 0) {
        lines.push('### Tier Scores\n');
        for (const t of result.tiers) {
          const bar = '█'.repeat(Math.round(t.confidence * 20)) + '░'.repeat(20 - Math.round(t.confidence * 20));
          lines.push(`- **${TIERS[t.tier as keyof typeof TIERS]?.name || t.tier}** ${bar} ${Math.round(t.confidence * 100)}%`);
          if (t.signals.length > 0) lines.push(`  Signals: ${t.signals.join(', ')}`);
        }
      }

      if (result.spansTiers && result.boundaryNote) {
        lines.push('', `### Boundary Analysis\n`, result.boundaryNote);
      }

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  // ==========================================================================
  // apply_triad — Subtractive Triad analysis
  // ==========================================================================

  server.tool(
    'apply_triad',
    'Apply the Subtractive Triad (DRY / Rams / Heidegger) to analyze any artifact. Returns structured analysis at all three levels: implementation duplication, artifact excess, and system disconnection.',
    {
      artifact: z.string().describe('Description of the artifact to analyze (code, design, system, process, etc.)'),
      context: z.string().optional().describe('Additional context about the artifact\'s purpose and environment')
    },
    async ({ artifact, context }) => {
      const analysis = {
        artifact,
        triad: [
          {
            level: 'Implementation',
            discipline: 'DRY',
            question: 'Have I built this before?',
            action: 'Unify',
            master: 'Engineering discipline',
            analysis: analyzeDRY(artifact, context)
          },
          {
            level: 'Artifact',
            discipline: 'Rams (Weniger, aber besser)',
            question: 'Does this earn its existence?',
            action: 'Remove',
            master: MASTERS.find(m => m.slug === 'dieter-rams')?.name || 'Dieter Rams',
            analysis: analyzeRams(artifact, context)
          },
          {
            level: 'System',
            discipline: 'Heidegger (Hermeneutic circle)',
            question: 'Does this serve the whole?',
            action: 'Reconnect',
            master: MASTERS.find(m => m.slug === 'martin-heidegger')?.name || 'Martin Heidegger',
            analysis: analyzeHeidegger(artifact, context)
          }
        ],
        synthesis: `Apply subtractive revelation at all three scales: eliminate duplication (DRY), eliminate excess (Rams), eliminate disconnection (Heidegger). Truth emerges through disciplined removal.`
      };

      const lines = [
        `## Subtractive Triad Analysis\n`,
        `**Artifact:** ${artifact}\n`,
      ];

      for (const level of analysis.triad) {
        lines.push(`### Level ${level.level === 'Implementation' ? '1' : level.level === 'Artifact' ? '2' : '3'}: ${level.level} — ${level.discipline}`);
        lines.push(`> *"${level.question}"* → **${level.action}**\n`);
        lines.push(`${level.analysis}\n`);
      }

      lines.push(`### Synthesis\n`, analysis.synthesis);

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  // ==========================================================================
  // audit_design — Canon compliance check
  // ==========================================================================

  server.tool(
    'audit_design',
    'Audit a UI/UX design against Canon design system principles. Checks color usage, typography, spacing, motion, and philosophical alignment.',
    {
      design: z.string().describe('Description of the design to audit — include colors, typography, layout, and interaction details'),
      section: z.enum(['colors', 'typography', 'spacing', 'motion', 'layout', 'all']).optional()
        .describe('Focus the audit on a specific Canon section (default: all)')
    },
    async ({ design, section }) => {
      const checks = buildCanonChecks(section || 'all');

      const lines = [
        `## Canon Design Audit\n`,
        `**Design:** ${design.slice(0, 300)}\n`,
        `**Section:** ${section || 'all'}\n`,
        '### Guiding Principles\n',
        '| Principle | Question | Guidance |',
        '|-----------|----------|----------|',
        '| Subtractive | Can anything be removed? | Every element must earn its existence |',
        '| Honest Materials | Are tokens used as intended? | Canon tokens encode decisions — respect their purpose |',
        '| Transparent Use | Does the interface recede? | Zuhandenheit: the design disappears in use |',
        '| Mathematical Harmony | Does spacing follow the scale? | Golden ratio and modular scale create harmony |',
        '',
      ];

      for (const check of checks) {
        lines.push(`### ${check.area}\n`);
        for (const item of check.items) {
          lines.push(`- [ ] ${item}`);
        }
        lines.push('');
      }

      lines.push('---\n*Canon compliance is not checklist adherence — it is alignment with the philosophy that less reveals more.*');

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n'),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  registerFlueRunHistoryTools(server, options.flueRunHistory);
}

// ============================================================================
// Triad analysis helpers
// ============================================================================

function analyzeDRY(artifact: string, context?: string): string {
  const lower = artifact.toLowerCase();
  const signals = [];

  if (/similar|same|duplicate|repeat|copy|redundant/i.test(lower)) {
    signals.push('Duplication signals detected — look for patterns that can be unified.');
  }
  if (/wrapper|adapter|bridge|proxy/i.test(lower)) {
    signals.push('Abstraction layers present — verify each serves a distinct purpose.');
  }
  if (/config|setting|option|flag/i.test(lower)) {
    signals.push('Configuration proliferation — can these be unified into fewer, more powerful options?');
  }

  return signals.length > 0
    ? `Observations: ${signals.join(' ')}`
    : 'No obvious duplication signals. Look deeper: are there patterns in this artifact that exist elsewhere in the system?';
}

function analyzeRams(artifact: string, context?: string): string {
  const lower = artifact.toLowerCase();
  const signals = [];

  if (/decoration|ornament|extra|bonus|fancy/i.test(lower)) {
    signals.push('Decorative elements detected — each must earn its existence.');
  }
  if (/feature|capability|option|mode/i.test(lower)) {
    signals.push('Feature surface detected — apply "less, but better": fewer features, each excellent.');
  }
  if (/complex|complicated|intricate/i.test(lower)) {
    signals.push('Complexity noted — simplicity is not simple. It requires the most effort to achieve.');
  }

  return signals.length > 0
    ? `Observations: ${signals.join(' ')}`
    : 'No excess signals detected. Ask: if this artifact were reduced to half its current scope, what would remain? That is the essential form.';
}

function analyzeHeidegger(artifact: string, context?: string): string {
  const lower = artifact.toLowerCase();
  const signals = [];

  if (/standalone|isolated|independent|separate/i.test(lower)) {
    signals.push('Isolation detected — does this serve the whole, or does it exist disconnected?');
  }
  if (/tool|interface|ui|ux/i.test(lower)) {
    signals.push('Tool/interface present — does it achieve Zuhandenheit (receding into use) or does it demand attention?');
  }
  if (/automat|fill|every|all|complete/i.test(lower)) {
    signals.push('Completeness drive detected — beware Gestell (enframing). Not every gap needs filling.');
  }

  return signals.length > 0
    ? `Observations: ${signals.join(' ')}`
    : 'No disconnection signals. Verify: does this artifact participate in the hermeneutic circle? Does understanding it require the whole, and does the whole benefit from its presence?';
}

// ============================================================================
// Canon audit checks
// ============================================================================

function buildCanonChecks(section: string) {
  const checks: { area: string; items: string[] }[] = [];

  if (section === 'all' || section === 'colors') {
    checks.push({
      area: 'Colors',
      items: [
        'Background uses Canon tokens (--bg-primary through --bg-quaternary)?',
        'Text uses Canon foreground tokens (--fg-primary through --fg-quaternary)?',
        'Semantic colors only for success/error/warning/info — not decoration?',
        'Opacity hierarchy instead of new color values?',
        'WCAG AA contrast maintained (4.5:1 for body, 3:1 for large text)?'
      ]
    });
  }

  if (section === 'all' || section === 'typography') {
    checks.push({
      area: 'Typography',
      items: [
        'Font family from Canon type stack (Inter, system fallbacks)?',
        'Font sizes follow the modular scale?',
        'Line heights match Canon recommendations?',
        'Heading hierarchy is semantically meaningful?',
        'Body text optimized for readability (16px base, 1.5-1.75 line height)?'
      ]
    });
  }

  if (section === 'all' || section === 'spacing') {
    checks.push({
      area: 'Spacing',
      items: [
        'Component internals use Canon tokens (--space-xs through --space-xl)?',
        'Page-level spacing uses Tailwind utilities (py-16, px-6, gap-8)?',
        'Avoid --space-2xl and --space-3xl for page padding (too large)?',
        'Consistent rhythm: related items closer, unrelated items farther?',
        'Nav offset uses calc(var(--header-height) + var(--space-md))?'
      ]
    });
  }

  if (section === 'all' || section === 'motion') {
    checks.push({
      area: 'Motion',
      items: [
        'Animations use Canon timing tokens (--duration-fast, --duration-normal)?',
        'Easing follows Canon curves (--ease-out, --ease-spring)?',
        'Motion has purpose — entrance, exit, state change?',
        'Respects prefers-reduced-motion?',
        'No gratuitous animation — every transition earns its existence?'
      ]
    });
  }

  if (section === 'all' || section === 'layout') {
    checks.push({
      area: 'Layout',
      items: [
        'Uses Tailwind for structure (flex, grid, gap-*)?',
        'Glass containers where appropriate (.glass-* classes)?',
        'Responsive breakpoints follow Canon system?',
        'Content width constrained for readability?',
        'Visual hierarchy established through spacing, not decoration?'
      ]
    });
  }

  return checks;
}
