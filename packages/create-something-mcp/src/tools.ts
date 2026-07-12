/**
 * Tools — Automation tier (model-controlled).
 * Search, relate, classify, apply, and audit across all content.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { renderCanonDesignAudit } from '@create-something/canon/design-audit';
import { validateAuthIntegration } from '@create-something/auth-platform';
import { search, findRelated } from './search.js';
import {
  createCanonOverlayInstantiatePreview,
  renderCanonOverlayInstantiatePreview
} from './canon-overlay-preview.js';
import {
  getCanonOverlayTemplateFile,
  listCanonOverlayTemplateFilePaths,
  renderCanonOverlayTemplateFile,
  renderCanonOverlayTemplateFilePack
} from './canon-overlay-template-file-pack.js';
import {
  getCanonOverlayCandidateReviewPacket,
  listCanonOverlayCandidateReviewPacketIds,
  renderCanonOverlayCandidateReviewHandoff
} from './canon-overlay-candidate-handoff.js';
import {
  getCanonOverlayCandidatePromotionPlan,
  listCanonOverlayCandidatePromotionPlanIds,
  renderCanonOverlayCandidatePromotionPlan
} from './canon-overlay-candidate-promotion-plan.js';
import {
  getCanonOverlayCandidatePromotionReadinessReport,
  listCanonOverlayCandidatePromotionReadinessReportIds,
  renderCanonOverlayCandidatePromotionReadinessReport
} from './canon-overlay-candidate-promotion-readiness.js';
import {
  applyCanonOverlayCandidatePromotionApprovalTarget,
  getCanonOverlayCandidatePromotionApprovalRecord,
  getCanonOverlayCandidatePromotionApprovalTargetTemplate,
  getCanonOverlayCandidatePromotionApprovalValidationReport,
  listCanonOverlayCandidatePromotionApprovalRecordIds,
  renderCanonOverlayCandidatePromotionApprovalRecord,
  renderCanonOverlayCandidatePromotionApprovalTargetTemplate,
  renderCanonOverlayCandidatePromotionApprovalValidationReport,
  validateCanonOverlayCandidatePromotionApprovalRecord
} from './canon-overlay-candidate-promotion-approval-record.js';
import {
  getCanonPublicExportClassification,
  getCanonRegistryItem,
  renderCanonExtensionRoutingDecision,
  renderCanonProjectOverlayReview,
  renderCanonPublicExportClassification,
  renderCanonRegistryItem,
  reviewCanonProjectOverlay,
  routeCanonExtensionIntake,
  searchCanonPublicExportClassifications,
  searchCanonRegistry
} from '@create-something/canon/registry';
import type {
  CanonExtensionIntakePacket,
  CanonProjectOverlayManifest
} from '@create-something/canon/registry';
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
    priority: 0.8
  }
};

const CANON_REGISTRY_KIND_VALUES = ['component', 'token', 'template', 'adapter', 'policy'] as const;
const CANON_REGISTRY_MODALITY_VALUES = ['web', 'chat', 'app', 'voice', 'glasses'] as const;
const CANON_REGISTRY_MATURITY_VALUES = ['stable', 'candidate', 'experimental'] as const;
const CANON_APPROVAL_TARGET_SCHEMA = z.object({
  approvalOwner: z.string().nullable().optional(),
  approvalEvidence: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  registryAction: z.string().nullable().optional(),
  registryItemId: z.string().nullable().optional(),
  exportPath: z.string().nullable().optional(),
  exportName: z.string().nullable().optional(),
  docsPath: z.string().nullable().optional(),
  maturityTarget: z.string().nullable().optional(),
  implementationOwner: z.string().nullable().optional()
});
const CANON_PUBLIC_EXPORT_CLASSIFICATION_VALUES = [
  'analytics-surface',
  'auth-surface',
  'brand-surface',
  'composition-pattern',
  'content-utility',
  'decorative-effect',
  'docs-only',
  'domain-specific',
  'experiment',
  'governance-contract',
  'headless-contract',
  'platform-surface',
  'registry-artifact',
  'stable-foundation-candidate',
  'style-artifact',
  'supporting-api',
  'token-artifact'
] as const;
const CANON_PUBLIC_EXPORT_REGISTRY_POLICY_VALUES = [
  'candidate-review',
  'classified-out',
  'registry-covered'
] as const;
const CANON_OVERLAY_ARTIFACT_KIND_VALUES = [
  'theme',
  'tokens',
  'templates',
  'copy-rules',
  'surface-policy',
  'registry'
] as const;

export function registerTools(server: McpServer) {
  server.tool(
    'auth_config_validate',
    'Validate a proposed CREATE SOMETHING auth integration without network access or mutation. Never send passwords, tokens, API keys, private keys, or other secrets.',
    {
      environment: z.enum(['development', 'preview', 'production']),
      issuer: z.string().optional(),
      jwksUrl: z.string().optional(),
      audiences: z.array(z.string()).optional(),
      allowSubjects: z.array(z.string()).optional(),
      allowEmails: z.array(z.string()).optional(),
      allowEmailDomains: z.array(z.string()).optional(),
      allowTenants: z.array(z.string()).optional(),
      allowRoles: z.array(z.string()).optional(),
      allowAnyAuthenticated: z.boolean().optional(),
      preview: z.boolean().optional(),
      secret: z.string().optional().describe('Forbidden: present only so accidental secret input is rejected'),
      password: z.string().optional().describe('Forbidden: present only so accidental secret input is rejected'),
      token: z.string().optional().describe('Forbidden: present only so accidental secret input is rejected'),
      apiKey: z.string().optional().describe('Forbidden: present only so accidental secret input is rejected'),
      privateKey: z.string().optional().describe('Forbidden: present only so accidental secret input is rejected')
    },
    async ({ secret, password, token, apiKey, privateKey, ...input }) => ({
      content: [{
        type: 'text' as const,
        text: JSON.stringify(validateAuthIntegration({
          ...input,
          hasSecretMaterial: [secret, password, token, apiKey, privateKey].some((value) => Boolean(value))
        }), null, 2),
        ...USER_VISIBLE
      }]
    })
  );

  // ==========================================================================
  // search — Cross-property full-text search
  // ==========================================================================

  server.tool(
    'search',
    'Search across all CREATE SOMETHING content: papers, Canon design system, patterns, masters, praxis exercises, products, full property markdown documents, and framework definitions. Returns ranked results with matched terms.',
    {
      query: z.string().describe('Search query — can be a concept, term, or phrase'),
      type: z
        .enum([
          'paper',
          'canon',
          'canon-registry',
          'pattern',
          'master',
          'praxis',
          'product',
          'framework',
          'playbook',
          'document'
        ])
        .optional()
        .describe('Filter results to a specific content type'),
      property: z
        .enum(['io', 'ltd', 'space', 'agency', 'framework'])
        .optional()
        .describe('Filter results to a specific property'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results (default: 10)')
    },
    async ({ query, type, property, limit }) => {
      const results = search(query, { type, property, limit: limit || 10 });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No results found for "${query}". Try broader terms or different filters.`,
              ...USER_VISIBLE
            }
          ]
        };
      }

      const PROPERTY_LABELS: Record<string, string> = {
        io: '.io',
        ltd: '.ltd',
        space: '.space',
        agency: '.agency',
        framework: 'Framework'
      };
      const TYPE_ICONS: Record<string, string> = {
        paper: 'Paper',
        canon: 'Canon',
        'canon-registry': 'Canon Registry',
        pattern: 'Pattern',
        master: 'Master',
        praxis: 'Praxis',
        product: 'Product',
        framework: 'Framework',
        playbook: 'Playbook',
        document: 'Document'
      };

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
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
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
          content: [
            {
              type: 'text' as const,
              text: `No graph connections found for "${concept}". Try a broader term or check \`graph://nodes\` for available concepts.`,
              ...USER_VISIBLE
            }
          ]
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
        const shown = result.edges.filter((e) => e.reason).slice(0, 20);
        for (const e of shown) {
          const from = e.source.split('/').pop() || e.source;
          const to = e.target.split('/').pop() || e.target;
          lines.push(`- **${from}** → **${to}** — ${e.reason}`);
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
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
        `${result.rationale}\n`
      ];

      if (result.tiers.length > 0) {
        lines.push('### Tier Scores\n');
        for (const t of result.tiers) {
          const bar =
            '█'.repeat(Math.round(t.confidence * 20)) +
            '░'.repeat(20 - Math.round(t.confidence * 20));
          lines.push(
            `- **${TIERS[t.tier as keyof typeof TIERS]?.name || t.tier}** ${bar} ${Math.round(t.confidence * 100)}%`
          );
          if (t.signals.length > 0) lines.push(`  Signals: ${t.signals.join(', ')}`);
        }
      }

      if (result.spansTiers && result.boundaryNote) {
        lines.push('', `### Boundary Analysis\n`, result.boundaryNote);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
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
      artifact: z
        .string()
        .describe('Description of the artifact to analyze (code, design, system, process, etc.)'),
      context: z
        .string()
        .optional()
        .describe("Additional context about the artifact's purpose and environment")
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
            master: MASTERS.find((m) => m.slug === 'dieter-rams')?.name || 'Dieter Rams',
            analysis: analyzeRams(artifact, context)
          },
          {
            level: 'System',
            discipline: 'Heidegger (Hermeneutic circle)',
            question: 'Does this serve the whole?',
            action: 'Reconnect',
            master: MASTERS.find((m) => m.slug === 'martin-heidegger')?.name || 'Martin Heidegger',
            analysis: analyzeHeidegger(artifact, context)
          }
        ],
        synthesis: `Apply subtractive revelation at all three scales: eliminate duplication (DRY), eliminate excess (Rams), eliminate disconnection (Heidegger). Truth emerges through disciplined removal.`
      };

      const lines = [`## Subtractive Triad Analysis\n`, `**Artifact:** ${artifact}\n`];

      for (const level of analysis.triad) {
        lines.push(
          `### Level ${level.level === 'Implementation' ? '1' : level.level === 'Artifact' ? '2' : '3'}: ${level.level} — ${level.discipline}`
        );
        lines.push(`> *"${level.question}"* → **${level.action}**\n`);
        lines.push(`${level.analysis}\n`);
      }

      lines.push(`### Synthesis\n`, analysis.synthesis);

      return {
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
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
      design: z
        .string()
        .describe(
          'Description of the design to audit — include colors, typography, layout, and interaction details'
        ),
      section: z
        .enum(['colors', 'typography', 'spacing', 'motion', 'layout', 'all'])
        .optional()
        .describe('Focus the audit on a specific Canon section (default: all)')
    },
    async ({ design, section }) => {
      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonDesignAudit({ design, section: section || 'all' }),
            ...USER_VISIBLE
          }
        ]
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
      query: z
        .string()
        .optional()
        .describe(
          'Optional search query such as "decision evidence", "glasses routing", or "tokens"'
        ),
      kind: z.enum(CANON_REGISTRY_KIND_VALUES).optional().describe('Filter by Canon artifact kind'),
      modality: z
        .enum(CANON_REGISTRY_MODALITY_VALUES)
        .optional()
        .describe('Filter by target surface: web, chat, app, voice, or glasses'),
      maturity: z
        .enum(CANON_REGISTRY_MATURITY_VALUES)
        .optional()
        .describe('Filter by maturity stage'),
      limit: z
        .number()
        .min(1)
        .max(25)
        .optional()
        .describe('Maximum number of results (default: 10)')
    },
    async ({ query, kind, modality, maturity, limit }) => {
      const results = searchCanonRegistry(query ?? '', { kind, modality, maturity, limit });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No Canon registry items matched. Try a broader query or remove filters.',
              ...USER_VISIBLE
            }
          ]
        };
      }

      const lines = [
        '## Canon Registry Search',
        '',
        `Results: ${results.length}`,
        '',
        '| ID | Kind | Maturity | Modalities | Description |',
        '|----|------|----------|------------|-------------|'
      ];

      for (const item of results) {
        lines.push(
          `| \`${item.id}\` | ${item.kind} | ${item.maturity} | ${item.modalities.join(', ')} | ${item.description.replace(/\|/g, '\\|')} |`
        );
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_registry_get',
    'Get one Canon registry item by id, including source path, import path, docs path, modalities, dependencies, and contract notes.',
    {
      id: z
        .string()
        .describe(
          'Canon registry item id, for example component.clear-decision-panel or template.glasses-routing-hud'
        )
    },
    async ({ id }) => {
      const item = getCanonRegistryItem(id);

      if (!item) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Canon registry item not found: ${id}`,
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonRegistryItem(item),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_template_get',
    'Get a Canon template by id or by modality. Use this to start web/chat/app/voice/glasses surfaces from Canon instead of ad hoc UI.',
    {
      id: z.string().optional().describe('Template id, for example template.web-governed-workflow'),
      modality: z
        .enum(CANON_REGISTRY_MODALITY_VALUES)
        .optional()
        .describe('Find the strongest template for a target modality'),
      query: z.string().optional().describe('Optional template search query')
    },
    async ({ id, modality, query }) => {
      const item = id
        ? getCanonRegistryItem(id)
        : searchCanonRegistry(query ?? '', { modality, kind: 'template', limit: 1 })[0];

      if (!item || item.kind !== 'template') {
        return {
          content: [
            {
              type: 'text' as const,
              text: id
                ? `Canon template not found: ${id}`
                : 'No Canon template matched the requested modality/query.',
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonRegistryItem(item),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_template_file_get',
    'Get the rendered read-only Canon project overlay template file pack, or one file by relativePath. Use this before local instantiation to review Canon-owned theme, token, template, copy, surface-policy, registry, and manifest starter files; it does not write files or mutate overlays.',
    {
      relativePath: z
        .string()
        .optional()
        .describe(
          'Optional template file path such as surface-policy.md or templates/surface-brief.md. Omit to render the full file pack.'
        )
    },
    async ({ relativePath }) => {
      if (relativePath) {
        const file = getCanonOverlayTemplateFile(relativePath);

        if (!file) {
          return {
            content: [
              {
                type: 'text' as const,
                text: [
                  `Canon overlay template file not found: ${relativePath}`,
                  '',
                  `Available file paths: ${listCanonOverlayTemplateFilePaths().join(', ')}`
                ].join('\n'),
                ...USER_VISIBLE
              }
            ],
            isError: true
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: renderCanonOverlayTemplateFile(file),
              ...USER_VISIBLE
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayTemplateFilePack(),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_public_export_policy_search',
    'Search Canon public export registry-policy classifications. Use this when a public Canon export is not in the registry and you need to know whether it is candidate-review, classified-out, or already registry-covered by another item.',
    {
      query: z
        .string()
        .optional()
        .describe('Optional search query such as "layout", "docs-only", or "candidate"'),
      classification: z
        .enum(CANON_PUBLIC_EXPORT_CLASSIFICATION_VALUES)
        .optional()
        .describe(
          'Filter by export classification, such as stable-foundation-candidate or domain-specific'
        ),
      registryPolicy: z
        .enum(CANON_PUBLIC_EXPORT_REGISTRY_POLICY_VALUES)
        .optional()
        .describe(
          'Filter by registry policy: candidate-review, classified-out, or registry-covered'
        ),
      exportPath: z
        .string()
        .optional()
        .describe('Optional package export path, for example ./components or ./motion'),
      limit: z
        .number()
        .min(1)
        .max(25)
        .optional()
        .describe('Maximum number of results (default: 10)')
    },
    async ({ query, classification, registryPolicy, exportPath, limit }) => {
      const results = searchCanonPublicExportClassifications({
        query,
        classification,
        registryPolicy,
        exportPath,
        limit
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No Canon public export policy rules matched. Try a broader query or remove filters.',
              ...USER_VISIBLE
            }
          ]
        };
      }

      const lines = [
        '## Canon Public Export Policy Search',
        '',
        `Results: ${results.length}`,
        '',
        '| Export | Classification | Registry Policy | Rationale |',
        '|--------|----------------|-----------------|-----------|'
      ];

      for (const rule of results) {
        const exportLabel = rule.exportName
          ? `${rule.exportPath}#${rule.exportName}`
          : `${rule.exportPath}#*`;
        lines.push(
          `| \`${exportLabel}\` | ${rule.classification} | ${rule.registryPolicy} | ${rule.rationale.replace(/\|/g, '\\|')} |`
        );
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: lines.join('\n'),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_public_export_policy_get',
    'Get Canon public export registry-policy classification by package export path and optional export name.',
    {
      exportPath: z
        .string()
        .describe('Package export path, for example ./components, ./motion, or ./domains/agency'),
      exportName: z
        .string()
        .optional()
        .describe('Optional exported component name, for example Footer or ScrollReveal')
    },
    async ({ exportPath, exportName }) => {
      const rule = getCanonPublicExportClassification(exportPath, exportName);

      if (!rule) {
        return {
          content: [
            {
              type: 'text' as const,
              text: exportName
                ? `Canon public export policy not found: ${exportPath}#${exportName}`
                : `Canon public export policy not found: ${exportPath}`,
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonPublicExportClassification(rule),
            ...USER_VISIBLE
          }
        ]
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
      requestedModalities: z
        .array(z.enum(CANON_REGISTRY_MODALITY_VALUES))
        .min(1)
        .describe('Target modalities such as web, chat, app, voice, or glasses'),
      owner: z.string().describe('Owner responsible for the overlay evidence'),
      sourcePackage: z.string().describe('Source package or project proposing the extension'),
      sourcePath: z
        .string()
        .optional()
        .describe('Optional source path for the overlay implementation'),
      tags: z.array(z.string()).optional().describe('Optional tags that describe the proposal'),
      surfaces: z
        .array(
          z.object({
            surfaceId: z.string().describe('Distinct surface or client id'),
            name: z.string().describe('Human-readable surface name'),
            modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).describe('Surface modality'),
            sourcePath: z
              .string()
              .optional()
              .describe('Optional source path for this surface evidence'),
            proof: z
              .string()
              .optional()
              .describe('Optional receipt, launch evidence, or review proof')
          })
        )
        .optional()
        .describe(
          'Surface evidence. Two distinct surface ids route the proposal to candidate promotion.'
        ),
      dependencies: z
        .array(z.string())
        .optional()
        .describe('Optional Canon registry dependency ids'),
      matchesRegistryItemId: z
        .string()
        .optional()
        .describe('Existing Canon registry item this proposal may duplicate'),
      deprecatesRegistryItemId: z
        .string()
        .optional()
        .describe('Existing Canon registry item this proposal would replace')
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
        content: [
          {
            type: 'text' as const,
            text: renderCanonExtensionRoutingDecision(packet, decision),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_handoff_get',
    'Get a rendered read-only Canon overlay candidate review handoff by intake id. Use this after reading canon://overlays/candidates/list when a maintainer needs the approval boundary, source URIs, evidence, surfaces, and promotion checklist before opening implementation work.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, packet id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const packet = getCanonOverlayCandidateReviewPacket(intakeId);

      if (!packet) {
        const ids = listCanonOverlayCandidateReviewPacketIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate review packet not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidateReviewHandoff(packet),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_plan_get',
    'Get a rendered read-only Canon overlay candidate promotion plan by intake id. Use this only after explicit human approval of the candidate handoff, when a maintainer needs implementation scope, required changes, validation, documentation, compatibility, and stop conditions.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, plan id, packet id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const plan = getCanonOverlayCandidatePromotionPlan(intakeId);

      if (!plan) {
        const ids = listCanonOverlayCandidatePromotionPlanIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion plan not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionPlan(plan),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_readiness_get',
    'Get a rendered read-only Canon overlay candidate promotion readiness report by intake id. Use this after a promotion plan exists to check human approval, registry target, export target, docs target, validation, and compatibility readiness before implementation starts.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, readiness report id, plan id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const report = getCanonOverlayCandidatePromotionReadinessReport(intakeId);

      if (!report) {
        const ids = listCanonOverlayCandidatePromotionReadinessReportIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion readiness report not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionReadinessReport(report),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_approval_record_get',
    'Get a rendered read-only Canon overlay candidate promotion approval record by intake id. Use this after readiness to record maintainer approval, target selection, docs path, maturity target, and implementation owner before implementation starts; it does not approve, fill fields, create Linear work, or mutate Canon.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, approval record id, readiness report id, plan id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const record = getCanonOverlayCandidatePromotionApprovalRecord(intakeId);

      if (!record) {
        const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion approval record not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionApprovalRecord(record),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_approval_target_template_get',
    'Get a rendered fillable Canon overlay candidate promotion approval target template by intake id. Use this to copy and fill target JSON before validation; it does not fill fields, persist approval, create Linear work, or mutate Canon.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, approval record id, readiness report id, plan id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const template = getCanonOverlayCandidatePromotionApprovalTargetTemplate(intakeId);

      if (!template) {
        const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion approval target template not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionApprovalTargetTemplate(template),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_approval_validation_report_get',
    'Get the current rendered read-only Canon overlay candidate promotion approval validation report by intake id. Use this to inspect generated validation status before maintainer-supplied target validation; it does not fill fields, persist approval, create Linear work, or mutate Canon.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, approval record id, readiness report id, plan id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        )
    },
    async ({ intakeId }) => {
      const report = getCanonOverlayCandidatePromotionApprovalValidationReport(intakeId);

      if (!report) {
        const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion approval validation report not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionApprovalValidationReport(report),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_candidate_promotion_approval_record_validate',
    'Validate a Canon overlay candidate promotion approval record by intake id, optionally with maintainer-supplied target fields. Use this before opening implementation work; it reports missing fields and invalid target values but does not persist approval, create Linear work, or mutate Canon.',
    {
      intakeId: z
        .string()
        .describe(
          'Candidate intake id, approval record id, readiness report id, plan id, or candidate id, for example overlay.agency-atlas-public.workflow-proof-surface'
        ),
      target: CANON_APPROVAL_TARGET_SCHEMA.optional().describe(
        'Optional maintainer-supplied approval target fields to validate without persisting them'
      )
    },
    async ({ intakeId, target }) => {
      const record = getCanonOverlayCandidatePromotionApprovalRecord(intakeId);

      if (!record) {
        const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Canon overlay candidate promotion approval record not found: ${intakeId}`,
                '',
                'Available intake ids:',
                ...ids.map((id) => `- \`${id}\``)
              ].join('\n'),
              ...USER_VISIBLE
            }
          ],
          isError: true
        };
      }

      const recordToValidate = target
        ? applyCanonOverlayCandidatePromotionApprovalTarget(record, target)
        : record;
      const validation = validateCanonOverlayCandidatePromotionApprovalRecord(recordToValidate);

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayCandidatePromotionApprovalValidationReport(validation),
            ...USER_VISIBLE
          }
        ]
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
      sourcePath: z
        .string()
        .optional()
        .describe('Optional path to the overlay manifest or package root'),
      targetModalities: z
        .array(z.enum(CANON_REGISTRY_MODALITY_VALUES))
        .min(1)
        .describe('Modalities this overlay targets, such as web, chat, app, voice, or glasses'),
      tags: z.array(z.string()).optional().describe('Optional overlay tags'),
      artifacts: z
        .array(
          z.object({
            kind: z.enum(CANON_OVERLAY_ARTIFACT_KIND_VALUES).describe('Overlay artifact kind'),
            path: z
              .string()
              .describe('Path to the overlay artifact, such as theme.css or registry.json'),
            description: z.string().optional().describe('Short artifact purpose'),
            registryItemIds: z
              .array(z.string())
              .optional()
              .describe('Canon registry items this artifact configures or depends on')
          })
        )
        .optional()
        .describe(
          'Declared overlay artifacts. Complete overlays include theme, tokens, templates, copy-rules, surface-policy, and registry.'
        ),
      extensionIntakes: z
        .array(
          z.object({
            id: z.string().describe('Stable intake id, for example overlay.client-proof-panel'),
            title: z.string().describe('Human-readable extension proposal title'),
            summary: z.string().describe('What the overlay proposes and why it exists'),
            requestedKind: z
              .enum(CANON_REGISTRY_KIND_VALUES)
              .describe('Requested Canon artifact kind'),
            requestedModalities: z
              .array(z.enum(CANON_REGISTRY_MODALITY_VALUES))
              .min(1)
              .describe('Target modalities such as web, chat, app, voice, or glasses'),
            owner: z.string().describe('Owner responsible for the overlay evidence'),
            sourcePackage: z.string().describe('Source package or project proposing the extension'),
            sourcePath: z
              .string()
              .optional()
              .describe('Optional source path for the overlay implementation'),
            tags: z
              .array(z.string())
              .optional()
              .describe('Optional tags that describe the proposal'),
            surfaces: z
              .array(
                z.object({
                  surfaceId: z.string().describe('Distinct surface or client id'),
                  name: z.string().describe('Human-readable surface name'),
                  modality: z.enum(CANON_REGISTRY_MODALITY_VALUES).describe('Surface modality'),
                  sourcePath: z
                    .string()
                    .optional()
                    .describe('Optional source path for this surface evidence'),
                  proof: z
                    .string()
                    .optional()
                    .describe('Optional receipt, launch evidence, or review proof')
                })
              )
              .optional()
              .describe(
                'Surface evidence. Two distinct surface ids route the proposal to candidate promotion.'
              ),
            dependencies: z
              .array(z.string())
              .optional()
              .describe('Optional Canon registry dependency ids'),
            matchesRegistryItemId: z
              .string()
              .optional()
              .describe('Existing Canon registry item this proposal may duplicate'),
            deprecatesRegistryItemId: z
              .string()
              .optional()
              .describe('Existing Canon registry item this proposal would replace')
          })
        )
        .optional()
        .describe('Optional Canon extension intake packets attached to this overlay')
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
        content: [
          {
            type: 'text' as const,
            text: renderCanonProjectOverlayReview(manifest, review),
            ...USER_VISIBLE
          }
        ]
      };
    }
  );

  server.tool(
    'canon_overlay_instantiate_preview',
    'Preview Canon project/client overlay instantiation without writing files. Use this to inspect the generated manifest, review status, and eight-file overlay plan before running the local Canon CLI.',
    {
      id: z.string().describe('Stable overlay id, for example overlay.client-workflow-system'),
      name: z.string().describe('Human-readable overlay name'),
      owner: z.string().describe('Owner responsible for overlay evidence and local policy'),
      sourcePackage: z.string().describe('Source package or project that owns this overlay'),
      outputRoot: z
        .string()
        .describe(
          'Target overlay output root for the planned files, for example packages/client/src/canon/overlay'
        ),
      targetModalities: z
        .array(z.enum(CANON_REGISTRY_MODALITY_VALUES))
        .min(1)
        .optional()
        .describe(
          'Modalities this overlay targets. Defaults to web, chat, app, voice, and glasses.'
        ),
      tags: z.array(z.string()).optional().describe('Optional overlay tags'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Include generated file contents in the preview response')
    },
    async ({
      id,
      name,
      owner,
      sourcePackage,
      outputRoot,
      targetModalities,
      tags,
      includeContent
    }) => {
      const preview = createCanonOverlayInstantiatePreview({
        id,
        name,
        owner,
        sourcePackage,
        outputRoot,
        targetModalities,
        tags,
        includeContent: includeContent ?? false
      });
      const review = reviewCanonProjectOverlay(preview.manifest);

      return {
        content: [
          {
            type: 'text' as const,
            text: renderCanonOverlayInstantiatePreview(preview, review, includeContent ?? false),
            ...USER_VISIBLE
          }
        ]
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
    signals.push(
      'Configuration proliferation — can these be unified into fewer, more powerful options?'
    );
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
    signals.push(
      'Feature surface detected — apply "less, but better": fewer features, each excellent.'
    );
  }
  if (/complex|complicated|intricate/i.test(lower)) {
    signals.push(
      'Complexity noted — simplicity is not simple. It requires the most effort to achieve.'
    );
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
    signals.push(
      'Tool/interface present — does it achieve Zuhandenheit (receding into use) or does it demand attention?'
    );
  }
  if (/automat|fill|every|all|complete/i.test(lower)) {
    signals.push(
      'Completeness drive detected — beware Gestell (enframing). Not every gap needs filling.'
    );
  }

  return signals.length > 0
    ? `Observations: ${signals.join(' ')}`
    : 'No disconnection signals. Verify: does this artifact participate in the hermeneutic circle? Does understanding it require the whole, and does the whole benefit from its presence?';
}
