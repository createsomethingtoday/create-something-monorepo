/**
 * Tools — Automation tier (model-controlled).
 * Search, relate, classify, apply, and audit across all content.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { search, findRelated } from './search.js';
import { CANON_REGISTRY_MANIFEST } from './content/generated/canon-registry.js';
import type {
  CanonExtensionIntakePacket,
  CanonExtensionRoutingDecision,
  CanonProjectOverlayArtifactKind,
  CanonProjectOverlayManifest,
  CanonProjectOverlayReview,
  CanonRegistryItem,
  CanonRegistryKind,
  CanonRegistryMaturity,
  CanonRegistryModality
} from './content/types.js';
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

const CANON_REGISTRY_KIND_VALUES = ['component', 'token', 'template', 'adapter', 'policy'] as const;
const CANON_REGISTRY_MODALITY_VALUES = ['web', 'chat', 'app', 'voice', 'glasses'] as const;
const CANON_REGISTRY_MATURITY_VALUES = ['stable', 'candidate', 'experimental'] as const;
const CANON_OVERLAY_ARTIFACT_KIND_VALUES = [
  'theme',
  'tokens',
  'templates',
  'copy-rules',
  'surface-policy',
  'registry'
] as const;
const CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS: CanonProjectOverlayArtifactKind[] = [
  'theme',
  'tokens',
  'templates',
  'copy-rules',
  'surface-policy',
  'registry'
];

function getCanonRegistryItem(id: string): CanonRegistryItem | undefined {
  return CANON_REGISTRY_MANIFEST.items.find((item) => item.id === id);
}

function scoreCanonRegistryItem(item: CanonRegistryItem, query: string): number {
  if (!query) return 1;

  const haystacks = [
    item.id,
    item.name,
    item.kind,
    item.maturity,
    item.description,
    item.sourcePath,
    item.importPath ?? '',
    item.docsPath ?? '',
    ...item.tags,
    ...item.modalities,
    ...(item.dependencies ?? []),
    item.contract.accessibility ?? '',
    item.contract.evidence ?? '',
    item.contract.motion ?? '',
    item.contract.extension ?? ''
  ].map((value) => value.toLowerCase());

  return query
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => {
      if (item.id.toLowerCase() === token || item.name.toLowerCase() === token) return score + 8;
      if (haystacks.some((value) => value.includes(token))) return score + 1;
      return score;
    }, 0);
}

function searchCanonRegistryItems(input: {
  query?: string;
  kind?: CanonRegistryKind;
  modality?: CanonRegistryModality;
  maturity?: CanonRegistryMaturity;
  limit?: number;
}): CanonRegistryItem[] {
  const query = input.query?.trim().toLowerCase() ?? '';
  const limit = input.limit ?? 10;

  return CANON_REGISTRY_MANIFEST.items
    .filter((item) => !input.kind || item.kind === input.kind)
    .filter((item) => !input.modality || item.modalities.includes(input.modality))
    .filter((item) => !input.maturity || item.maturity === input.maturity)
    .map((item) => ({ item, score: scoreCanonRegistryItem(item, query) }))
    .filter((result) => !query || result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((result) => result.item);
}

function renderCanonRegistryItem(item: CanonRegistryItem): string {
  const lines = [
    `## ${item.name}`,
    '',
    `- ID: \`${item.id}\``,
    `- Kind: \`${item.kind}\``,
    `- Maturity: \`${item.maturity}\``,
    `- Modalities: ${item.modalities.map((m) => `\`${m}\``).join(', ')}`,
    `- Source: \`${item.sourcePath}\``,
  ];

  if (item.importPath) lines.push(`- Import: \`${item.importPath}\``);
  if (item.docsPath) lines.push(`- Docs: \`${item.docsPath}\``);
  if (item.dependencies?.length) {
    lines.push(`- Dependencies: ${item.dependencies.map((id) => `\`${id}\``).join(', ')}`);
  }

  lines.push('', item.description, '', '### Contract');

  for (const [key, value] of Object.entries(item.contract)) {
    if (value) lines.push(`- **${key}**: ${value}`);
  }

  return lines.join('\n');
}

function routeCanonExtensionIntake(
  packet: CanonExtensionIntakePacket
): CanonExtensionRoutingDecision {
  if (packet.matchesRegistryItemId) {
    const existing = getCanonRegistryItem(packet.matchesRegistryItemId);
    if (existing?.maturity === 'stable') {
      return {
        stage: 'canon-stable',
        action: 'use-existing',
        rationale: `${existing.id} is already stable in Canon; extend through configuration or overlay copy instead of forking the primitive.`,
        requiredEvidence: [
          'Name the consuming surface and import path.',
          'Document any local copy, integration, or content differences outside Canon.'
        ],
        stopBeforeStable: []
      };
    }
  }

  if (packet.deprecatesRegistryItemId) {
    const existing = getCanonRegistryItem(packet.deprecatesRegistryItemId);
    return {
      stage: existing ? 'deprecated' : 'project-local',
      action: existing ? 'mark-deprecated' : 'needs-review',
      rationale: existing
        ? `${existing.id} exists in Canon; replacement proposals must keep migration guidance and replacement routing discoverable.`
        : `${packet.deprecatesRegistryItemId} is not a Canon registry item; confirm the source of truth before deprecation work.`,
      requiredEvidence: [
        'Replacement registry item or overlay path.',
        'Migration guidance for existing consumers.',
        'Compatibility or rollback note.'
      ],
      stopBeforeStable: [
        'Do not remove the old item until consumers and replacement routing are documented.'
      ]
    };
  }

  const uniqueSurfaceIds = new Set(packet.surfaces.map((surface) => surface.surfaceId));
  if (uniqueSurfaceIds.size >= 2) {
    return {
      stage: 'candidate',
      action: 'promote-candidate',
      rationale:
        'The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.',
      requiredEvidence: [
        'Source-adjacent implementation path.',
        'At least two surface proofs or client receipts.',
        'Accessibility, evidence, motion, and extension contract notes.',
        'Registry dependencies and modality list.'
      ],
      stopBeforeStable: [
        'Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.'
      ]
    };
  }

  return {
    stage: 'project-local',
    action: 'keep-local',
    rationale:
      'The proposal has fewer than two distinct surfaces, so the project overlay should keep ownership while collecting evidence.',
    requiredEvidence: [
      'Local owner and source path.',
      'Problem statement tied to a real workflow.',
      'Proof from a second surface or client before candidate promotion.'
    ],
    stopBeforeStable: [
      'Do not add a stable Canon export from a one-off overlay.',
      'Do not create a parallel primitive when a stable registry item already matches the need.'
    ]
  };
}

function renderCanonExtensionRoutingDecision(
  packet: CanonExtensionIntakePacket,
  decision: CanonExtensionRoutingDecision
): string {
  const lines = [
    '## Canon Extension Routing',
    '',
    `- Intake: \`${packet.id}\``,
    `- Title: ${packet.title}`,
    `- Requested kind: \`${packet.requestedKind}\``,
    `- Requested modalities: ${packet.requestedModalities.map((m) => `\`${m}\``).join(', ')}`,
    `- Owner: ${packet.owner}`,
    `- Source package: \`${packet.sourcePackage}\``,
  ];

  if (packet.sourcePath) lines.push(`- Source path: \`${packet.sourcePath}\``);
  if (packet.tags.length) lines.push(`- Tags: ${packet.tags.map((tag) => `\`${tag}\``).join(', ')}`);
  if (packet.dependencies?.length) {
    lines.push(`- Dependencies: ${packet.dependencies.map((id) => `\`${id}\``).join(', ')}`);
  }
  if (packet.matchesRegistryItemId) {
    lines.push(`- Matches registry item: \`${packet.matchesRegistryItemId}\``);
  }
  if (packet.deprecatesRegistryItemId) {
    lines.push(`- Deprecates registry item: \`${packet.deprecatesRegistryItemId}\``);
  }

  lines.push('', packet.summary, '', '### Decision');
  lines.push(`- Stage: \`${decision.stage}\``);
  lines.push(`- Action: \`${decision.action}\``);
  lines.push(`- Rationale: ${decision.rationale}`);

  if (packet.surfaces.length) {
    lines.push('', '### Surface Evidence');
    for (const surface of packet.surfaces) {
      const details = [
        `\`${surface.surfaceId}\``,
        surface.name,
        `modality: \`${surface.modality}\``
      ];
      if (surface.sourcePath) details.push(`source: \`${surface.sourcePath}\``);
      if (surface.proof) details.push(`proof: ${surface.proof}`);
      lines.push(`- ${details.join(' | ')}`);
    }
  }

  lines.push('', '### Required Evidence');
  for (const evidence of decision.requiredEvidence) lines.push(`- ${evidence}`);

  if (decision.stopBeforeStable.length) {
    lines.push('', '### Stop Before Stable');
    for (const stop of decision.stopBeforeStable) lines.push(`- ${stop}`);
  }

  return lines.join('\n');
}

function reviewCanonProjectOverlay(
  manifest: CanonProjectOverlayManifest
): CanonProjectOverlayReview {
  const presentArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter((kind) =>
    manifest.artifacts.some((artifact) => artifact.kind === kind)
  );
  const missingArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter(
    (kind) => !presentArtifacts.includes(kind)
  );
  const extensionDecisions = (manifest.extensionIntakes ?? []).map((packet) => ({
    packet,
    decision: routeCanonExtensionIntake(packet)
  }));
  const needsReview = extensionDecisions.some(({ decision }) => decision.action === 'needs-review');
  const needsEvidence = extensionDecisions.some(({ decision }) => decision.stage === 'project-local');
  const status = needsReview
    ? 'needs-review'
    : missingArtifacts.length
      ? 'needs-artifacts'
      : needsEvidence
        ? 'needs-evidence'
        : 'ready';
  const stopConditions = [
    ...(missingArtifacts.length
      ? [
          `Add missing overlay artifacts before treating ${manifest.id} as a complete Canon overlay: ${missingArtifacts.join(', ')}.`
        ]
      : []),
    ...extensionDecisions.flatMap(({ decision }) => decision.stopBeforeStable),
    'Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.',
    'Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts.'
  ];

  return {
    status,
    requiredArtifacts: CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS,
    presentArtifacts,
    missingArtifacts,
    extensionDecisions,
    stopConditions: [...new Set(stopConditions)],
    summary:
      status === 'ready'
        ? `${manifest.name} declares the complete Canon overlay artifact set and has no project-local evidence gaps.`
        : `${manifest.name} is ${status}; keep it project-owned until missing artifacts and evidence gaps are resolved.`
  };
}

function renderCanonProjectOverlayReview(
  manifest: CanonProjectOverlayManifest,
  review: CanonProjectOverlayReview
): string {
  const lines = [
    '## Canon Project Overlay Review',
    '',
    `- Overlay: \`${manifest.id}\``,
    `- Name: ${manifest.name}`,
    `- Status: \`${review.status}\``,
    `- Owner: ${manifest.owner}`,
    `- Source package: \`${manifest.sourcePackage}\``,
    `- Target modalities: ${manifest.targetModalities.map((m) => `\`${m}\``).join(', ')}`,
  ];

  if (manifest.sourcePath) lines.push(`- Source path: \`${manifest.sourcePath}\``);
  if (manifest.tags?.length) lines.push(`- Tags: ${manifest.tags.map((tag) => `\`${tag}\``).join(', ')}`);

  lines.push('', review.summary, '', '### Overlay Artifacts');
  lines.push(`- Required: ${review.requiredArtifacts.map((kind) => `\`${kind}\``).join(', ')}`);
  lines.push(`- Present: ${review.presentArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`);
  lines.push(`- Missing: ${review.missingArtifacts.map((kind) => `\`${kind}\``).join(', ') || 'none'}`);

  for (const artifact of manifest.artifacts) {
    const details = [`\`${artifact.kind}\``, `path: \`${artifact.path}\``];
    if (artifact.description) details.push(artifact.description);
    if (artifact.registryItemIds?.length) {
      details.push(`registry: ${artifact.registryItemIds.map((id) => `\`${id}\``).join(', ')}`);
    }
    lines.push(`- ${details.join(' | ')}`);
  }

  if (review.extensionDecisions.length) {
    lines.push('', '### Extension Intake Decisions');
    for (const { packet, decision } of review.extensionDecisions) {
      lines.push(
        `- \`${packet.id}\`: \`${decision.stage}\` / \`${decision.action}\` — ${decision.rationale}`
      );
    }
  }

  lines.push('', '### Stop Conditions');
  for (const stop of review.stopConditions) lines.push(`- ${stop}`);

  return lines.join('\n');
}

export function registerTools(server: McpServer) {
  // ==========================================================================
  // search — Cross-property full-text search
  // ==========================================================================

  server.tool(
    'search',
    'Search across all CREATE SOMETHING content: papers, Canon design system, patterns, masters, praxis exercises, products, full property markdown documents, and framework definitions. Returns ranked results with matched terms.',
    {
      query: z.string().describe('Search query — can be a concept, term, or phrase'),
      type: z.enum(['paper', 'canon', 'canon-registry', 'pattern', 'master', 'praxis', 'product', 'framework', 'playbook', 'document']).optional()
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
      const TYPE_ICONS: Record<string, string> = { paper: 'Paper', canon: 'Canon', 'canon-registry': 'Canon Registry', pattern: 'Pattern', master: 'Master', praxis: 'Praxis', product: 'Product', framework: 'Framework', playbook: 'Playbook', document: 'Document' };

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

  // ==========================================================================
  // Canon registry — machine-readable design system lookup
  // ==========================================================================

  server.tool(
    'canon_registry_search',
    'Search the machine-readable Canon registry for components, tokens, templates, adapters, and policies. Use this before inventing local UI or choosing a modality pattern.',
    {
      query: z.string().optional().describe('Optional search query such as "decision evidence", "glasses routing", or "tokens"'),
      kind: z.enum(CANON_REGISTRY_KIND_VALUES).optional().describe('Filter by Canon artifact kind'),
      modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).optional().describe('Filter by target surface: web, chat, app, voice, or glasses'),
      maturity: z.enum(CANON_REGISTRY_MATURITY_VALUES).optional().describe('Filter by maturity stage'),
      limit: z.number().min(1).max(25).optional().describe('Maximum number of results (default: 10)')
    },
    async ({ query, kind, modality, maturity, limit }) => {
      const results = searchCanonRegistryItems({ query, kind, modality, maturity, limit });

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No Canon registry items matched. Try a broader query or remove filters.',
            ...USER_VISIBLE,
          }]
        };
      }

      const lines = [
        '## Canon Registry Search',
        '',
        `Results: ${results.length}`,
        '',
        '| ID | Kind | Maturity | Modalities | Description |',
        '|----|------|----------|------------|-------------|',
      ];

      for (const item of results) {
        lines.push(`| \`${item.id}\` | ${item.kind} | ${item.maturity} | ${item.modalities.join(', ')} | ${item.description.replace(/\|/g, '\\|')} |`);
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

  server.tool(
    'canon_registry_get',
    'Get one Canon registry item by id, including source path, import path, docs path, modalities, dependencies, and contract notes.',
    {
      id: z.string().describe('Canon registry item id, for example component.clear-decision-panel or template.glasses-routing-hud')
    },
    async ({ id }) => {
      const item = getCanonRegistryItem(id);

      if (!item) {
        return {
          content: [{
            type: 'text' as const,
            text: `Canon registry item not found: ${id}`,
            ...USER_VISIBLE,
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: renderCanonRegistryItem(item),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  server.tool(
    'canon_template_get',
    'Get a Canon template by id or by modality. Use this to start web/chat/app/voice/glasses surfaces from Canon instead of ad hoc UI.',
    {
      id: z.string().optional().describe('Template id, for example template.web-governed-workflow'),
      modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).optional().describe('Find the strongest template for a target modality'),
      query: z.string().optional().describe('Optional template search query')
    },
    async ({ id, modality, query }) => {
      const item = id
        ? getCanonRegistryItem(id)
        : searchCanonRegistryItems({ query, modality, kind: 'template', limit: 1 })[0];

      if (!item || item.kind !== 'template') {
        return {
          content: [{
            type: 'text' as const,
            text: id ? `Canon template not found: ${id}` : 'No Canon template matched the requested modality/query.',
            ...USER_VISIBLE,
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: renderCanonRegistryItem(item),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  server.tool(
    'canon_extension_route',
    'Route a Canon extension intake packet. Use this when a project or client overlay proposes a new component, template, adapter, token, or policy and needs project-local, candidate, stable-reuse, or deprecation guidance.',
    {
      id: z.string().describe('Stable intake id, for example overlay.client-proof-panel'),
      title: z.string().describe('Human-readable extension proposal title'),
      summary: z.string().describe('What the overlay proposes and why it exists'),
      requestedKind: z.enum(CANON_REGISTRY_KIND_VALUES).describe('Requested Canon artifact kind'),
      requestedModalities: z.array(z.enum(CANON_REGISTRY_MODALITY_VALUES)).min(1)
        .describe('Target modalities such as web, chat, app, voice, or glasses'),
      owner: z.string().describe('Owner responsible for the overlay evidence'),
      sourcePackage: z.string().describe('Source package or project proposing the extension'),
      sourcePath: z.string().optional().describe('Optional source path for the overlay implementation'),
      tags: z.array(z.string()).optional().describe('Optional tags that describe the proposal'),
      surfaces: z.array(z.object({
        surfaceId: z.string().describe('Distinct surface or client id'),
        name: z.string().describe('Human-readable surface name'),
        modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).describe('Surface modality'),
        sourcePath: z.string().optional().describe('Optional source path for this surface evidence'),
        proof: z.string().optional().describe('Optional receipt, launch evidence, or review proof')
      })).optional().describe('Surface evidence. Two distinct surface ids route the proposal to candidate promotion.'),
      dependencies: z.array(z.string()).optional().describe('Optional Canon registry dependency ids'),
      matchesRegistryItemId: z.string().optional().describe('Existing Canon registry item this proposal may duplicate'),
      deprecatesRegistryItemId: z.string().optional().describe('Existing Canon registry item this proposal would replace')
    },
    async ({
      id,
      title,
      summary,
      requestedKind,
      requestedModalities,
      owner,
      sourcePackage,
      sourcePath,
      tags,
      surfaces,
      dependencies,
      matchesRegistryItemId,
      deprecatesRegistryItemId
    }) => {
      const packet: CanonExtensionIntakePacket = {
        id,
        title,
        summary,
        requestedKind,
        requestedModalities,
        owner,
        sourcePackage,
        sourcePath,
        tags: tags ?? [],
        surfaces: surfaces ?? [],
        dependencies,
        matchesRegistryItemId,
        deprecatesRegistryItemId
      };
      const decision = routeCanonExtensionIntake(packet);

      return {
        content: [{
          type: 'text' as const,
          text: renderCanonExtensionRoutingDecision(packet, decision),
          ...USER_VISIBLE,
        }]
      };
    }
  );

  server.tool(
    'canon_overlay_review',
    'Review a project/client Canon overlay manifest. Use this to keep theme, tokens, templates, copy rules, surface policy, registry metadata, and extension intakes as overlays instead of forks.',
    {
      id: z.string().describe('Stable overlay id, for example overlay.client-workflow-system'),
      name: z.string().describe('Human-readable overlay name'),
      owner: z.string().describe('Owner responsible for overlay evidence and local policy'),
      sourcePackage: z.string().describe('Source package or project that owns this overlay'),
      sourcePath: z.string().optional().describe('Optional path to the overlay manifest or package root'),
      targetModalities: z.array(z.enum(CANON_REGISTRY_MODALITY_VALUES)).min(1)
        .describe('Modalities this overlay targets, such as web, chat, app, voice, or glasses'),
      tags: z.array(z.string()).optional().describe('Optional overlay tags'),
      artifacts: z.array(z.object({
        kind: z.enum(CANON_OVERLAY_ARTIFACT_KIND_VALUES).describe('Overlay artifact kind'),
        path: z.string().describe('Path to the overlay artifact, such as theme.css or registry.json'),
        description: z.string().optional().describe('Short artifact purpose'),
        registryItemIds: z.array(z.string()).optional().describe('Canon registry items this artifact configures or depends on')
      })).optional().describe('Declared overlay artifacts. Complete overlays include theme, tokens, templates, copy-rules, surface-policy, and registry.'),
      extensionIntakes: z.array(z.object({
        id: z.string().describe('Stable intake id, for example overlay.client-proof-panel'),
        title: z.string().describe('Human-readable extension proposal title'),
        summary: z.string().describe('What the overlay proposes and why it exists'),
        requestedKind: z.enum(CANON_REGISTRY_KIND_VALUES).describe('Requested Canon artifact kind'),
        requestedModalities: z.array(z.enum(CANON_REGISTRY_MODALITY_VALUES)).min(1)
          .describe('Target modalities such as web, chat, app, voice, or glasses'),
        owner: z.string().describe('Owner responsible for the overlay evidence'),
        sourcePackage: z.string().describe('Source package or project proposing the extension'),
        sourcePath: z.string().optional().describe('Optional source path for the overlay implementation'),
        tags: z.array(z.string()).optional().describe('Optional tags that describe the proposal'),
        surfaces: z.array(z.object({
          surfaceId: z.string().describe('Distinct surface or client id'),
          name: z.string().describe('Human-readable surface name'),
          modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).describe('Surface modality'),
          sourcePath: z.string().optional().describe('Optional source path for this surface evidence'),
          proof: z.string().optional().describe('Optional receipt, launch evidence, or review proof')
        })).optional().describe('Surface evidence. Two distinct surface ids route the proposal to candidate promotion.'),
        dependencies: z.array(z.string()).optional().describe('Optional Canon registry dependency ids'),
        matchesRegistryItemId: z.string().optional().describe('Existing Canon registry item this proposal may duplicate'),
        deprecatesRegistryItemId: z.string().optional().describe('Existing Canon registry item this proposal would replace')
      })).optional().describe('Optional Canon extension intake packets attached to this overlay')
    },
    async ({
      id,
      name,
      owner,
      sourcePackage,
      sourcePath,
      targetModalities,
      tags,
      artifacts,
      extensionIntakes
    }) => {
      const manifest: CanonProjectOverlayManifest = {
        id,
        name,
        owner,
        sourcePackage,
        sourcePath,
        targetModalities,
        tags,
        artifacts: artifacts ?? [],
        extensionIntakes: extensionIntakes?.map((packet) => ({
          ...packet,
          tags: packet.tags ?? [],
          surfaces: packet.surfaces ?? []
        }))
      };
      const review = reviewCanonProjectOverlay(manifest);

      return {
        content: [{
          type: 'text' as const,
          text: renderCanonProjectOverlayReview(manifest, review),
          ...USER_VISIBLE,
        }]
      };
    }
  );
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
