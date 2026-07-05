/**
 * Resources — Database tier (application-controlled).
 * Browsable content across all CREATE SOMETHING properties.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PAPERS } from './content/generated/papers.js';
import { CANON_PAGES } from './content/generated/canon.js';
import { CANON_REGISTRY_MANIFEST } from './content/generated/canon-registry.js';
import {
  CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES
} from './content/generated/canon-public-export-classification.js';
import { CANON_OVERLAY_CATALOG } from './content/generated/canon-overlay-catalog.js';
import { CANON_OVERLAY_INTAKE_INVENTORY } from './content/generated/canon-overlay-intake-inventory.js';
import { CANON_OVERLAY_CANDIDATE_QUEUE } from './content/generated/canon-overlay-candidate-queue.js';
import {
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS
} from './content/generated/canon-overlay-candidate-review-packets.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS
} from './content/generated/canon-overlay-candidate-promotion-plans.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS
} from './content/generated/canon-overlay-candidate-promotion-readiness-reports.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS
} from './content/generated/canon-overlay-candidate-promotion-approval-records.js';
import { PATTERNS } from './content/generated/patterns.js';
import { GRAPH_NODES } from './content/generated/graph.js';
import { PROPERTY_DOCUMENTS } from './content/generated/property-docs.js';
// GRAPH_EDGES (800 KB) lazy-loaded only when graph://edges is requested
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

  server.resource(
    'canon-registry',
    'canon://registry',
    { description: `Canon registry: ${CANON_REGISTRY_MANIFEST.items.length} machine-readable components, tokens, templates, adapters, and policies`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_REGISTRY_MANIFEST, null, 2)
      }]
    })
  );

  server.resource(
    'canon-registry-list',
    'canon://registry/list',
    { description: 'Index of Canon registry items for agent and template discovery', mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_REGISTRY_MANIFEST.items.map(item => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          maturity: item.maturity,
          modalities: item.modalities,
          uri: `canon://registry/${item.id}`
        })), null, 2)
      }]
    })
  );

  for (const item of CANON_REGISTRY_MANIFEST.items) {
    server.resource(
      `canon-registry-${item.id.replace(/[^a-z0-9-]/gi, '-')}`,
      `canon://registry/${item.id}`,
      { description: `Canon registry ${item.kind}: ${item.name}`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(item, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-public-export-policy',
    'canon://public-export-policy',
    {
      description: `Canon public export policy: ${CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.length} registry classification rules`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES, null, 2)
      }]
    })
  );

  server.resource(
    'canon-public-export-policy-list',
    'canon://public-export-policy/list',
    {
      description: 'Index of Canon public exports that are classified for registry promotion policy',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.map(rule => ({
          exportPath: rule.exportPath,
          exportName: rule.exportName,
          classification: rule.classification,
          registryPolicy: rule.registryPolicy,
          uri: rule.exportName
            ? `canon://public-export-policy/${encodeURIComponent(rule.exportPath)}/${rule.exportName}`
            : `canon://public-export-policy/${encodeURIComponent(rule.exportPath)}`
        })), null, 2)
      }]
    })
  );

  for (const rule of CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES) {
    const exportLabel = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : `${rule.exportPath}#*`;
    const resourceName = `canon-public-export-policy-${exportLabel.replace(/[^a-z0-9-]/gi, '-')}`;
    const resourceUri = rule.exportName
      ? `canon://public-export-policy/${encodeURIComponent(rule.exportPath)}/${rule.exportName}`
      : `canon://public-export-policy/${encodeURIComponent(rule.exportPath)}`;

    server.resource(
      resourceName,
      resourceUri,
      {
        description: `Canon public export policy: ${exportLabel}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(rule, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays',
    'canon://overlays',
    {
      description: `Canon overlay catalog: ${CANON_OVERLAY_CATALOG.templates.length} templates for extending Canon across web, chat, app, voice, and glasses`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CATALOG, null, 2)
      }]
    })
  );

  server.resource(
    'canon-overlays-list',
    'canon://overlays/list',
    {
      description: 'Index of Canon overlay templates and required artifact contracts',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CATALOG.templates.map(template => ({
          id: template.id,
          name: template.name,
          summary: template.summary,
          docsPath: template.docsPath,
          targetModalities: template.manifest.targetModalities,
          status: template.review.status,
          uri: `canon://overlays/${template.id}`
        })), null, 2)
      }]
    })
  );

  for (const template of CANON_OVERLAY_CATALOG.templates) {
    server.resource(
      `canon-overlays-${template.id.replace(/[^a-z0-9-]/gi, '-')}`,
      `canon://overlays/${template.id}`,
      {
        description: `Canon overlay template: ${template.name}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(template, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-intake',
    'canon://overlays/intake',
    {
      description: `Canon overlay intake inventory: ${CANON_OVERLAY_INTAKE_INVENTORY.entries.length} project overlay manifests discovered for review`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_INTAKE_INVENTORY, null, 2)
      }]
    })
  );

  server.resource(
    'canon-overlays-intake-list',
    'canon://overlays/intake/list',
    {
      description: 'Index of discovered Canon project overlay manifests and review statuses',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_INTAKE_INVENTORY.entries.map(entry => ({
          id: entry.manifest.id,
          name: entry.manifest.name,
          manifestPath: entry.manifestPath,
          status: entry.review.status,
          candidateIntakes: entry.review.extensionDecisions.filter(decision => decision.decision.stage === 'candidate').length,
          uri: `canon://overlays/intake/${entry.manifest.id}`
        })), null, 2)
      }]
    })
  );

  for (const entry of CANON_OVERLAY_INTAKE_INVENTORY.entries) {
    server.resource(
      `canon-overlays-intake-${entry.manifest.id.replace(/[^a-z0-9-]/gi, '-')}`,
      `canon://overlays/intake/${entry.manifest.id}`,
      {
        description: `Canon overlay intake review: ${entry.manifest.name}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(entry, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-candidates',
    'canon://overlays/candidates',
    {
      description: `Canon overlay candidate queue: ${CANON_OVERLAY_CANDIDATE_QUEUE.entries.length} candidate intakes ready for Canon review`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_QUEUE, null, 2)
      }]
    })
  );

  server.resource(
    'canon-overlays-candidates-list',
    'canon://overlays/candidates/list',
    {
      description: 'Index of Canon overlay candidate intakes ready for review',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_QUEUE.entries.map(entry => ({
          id: entry.intakeId,
          title: entry.title,
          overlayId: entry.overlayId,
          requestedKind: entry.requestedKind,
          requestedModalities: entry.requestedModalities,
          sourcePackage: entry.sourcePackage,
          reviewUri: entry.reviewUri,
          handoffUri: entry.handoffUri,
          promotionPlanUri: `canon://overlays/candidates/${entry.intakeId}/promotion-plan`,
          readinessUri: `canon://overlays/candidates/${entry.intakeId}/readiness`,
          approvalRecordUri: `canon://overlays/candidates/${entry.intakeId}/approval-record`,
          uri: entry.candidateUri
        })), null, 2)
      }]
    })
  );

  for (const entry of CANON_OVERLAY_CANDIDATE_QUEUE.entries) {
    server.resource(
      `canon-overlays-candidate-${entry.intakeId.replace(/[^a-z0-9-]/gi, '-')}`,
      entry.candidateUri,
      {
        description: `Canon overlay candidate intake: ${entry.title}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(entry, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-candidate-review-packets',
    'canon://overlays/candidates/handoffs',
    {
      description: `Canon overlay candidate review packets: ${CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries.length} handoffs ready for maintainer approval review`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS, null, 2)
      }]
    })
  );

  for (const packet of CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries) {
    server.resource(
      `canon-overlays-candidate-review-${packet.intakeId.replace(/[^a-z0-9-]/gi, '-')}`,
      packet.handoffUri,
      {
        description: `Canon overlay candidate review packet: ${packet.title}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(packet, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-candidate-promotion-plans',
    'canon://overlays/candidates/promotion-plans',
    {
      description: `Canon overlay candidate promotion plans: ${CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries.length} approval-gated implementation plans for approved handoffs`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS, null, 2)
      }]
    })
  );

  for (const plan of CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries) {
    server.resource(
      `canon-overlays-candidate-promotion-plan-${plan.intakeId.replace(/[^a-z0-9-]/gi, '-')}`,
      plan.planUri,
      {
        description: `Canon overlay candidate promotion plan: ${plan.title}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(plan, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-candidate-promotion-readiness-reports',
    'canon://overlays/candidates/readiness-reports',
    {
      description: `Canon overlay candidate promotion readiness reports: ${CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries.length} read-only readiness checks before implementation starts`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS, null, 2)
      }]
    })
  );

  for (const report of CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries) {
    server.resource(
      `canon-overlays-candidate-promotion-readiness-${report.intakeId.replace(/[^a-z0-9-]/gi, '-')}`,
      report.readinessUri,
      {
        description: `Canon overlay candidate promotion readiness report: ${report.title}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(report, null, 2)
        }]
      })
    );
  }

  server.resource(
    'canon-overlays-candidate-promotion-approval-records',
    'canon://overlays/candidates/approval-records',
    {
      description: `Canon overlay candidate promotion approval records: ${CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries.length} read-only templates for maintainer approval and target selection before implementation starts`,
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS, null, 2)
      }]
    })
  );

  for (const record of CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS.entries) {
    server.resource(
      `canon-overlays-candidate-promotion-approval-record-${record.intakeId.replace(/[^a-z0-9-]/gi, '-')}`,
      record.approvalUri,
      {
        description: `Canon overlay candidate promotion approval record: ${record.title}`,
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(record, null, 2)
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
    { description: 'Knowledge graph: relationships between concepts (lazy-loaded on request)', mimeType: 'application/json' },
    async (uri) => {
      // Lazy-load: 800 KB of edges only loaded when explicitly requested
      const { GRAPH_EDGES } = await import('./content/generated/graph.js');
      return {
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
      };
    }
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
  // Property Documents (all markdown content across .io/.ltd/.space/.agency)
  // ==========================================================================

  server.resource(
    'docs-list',
    'docs://list',
    { description: `All ingested property documents (${PROPERTY_DOCUMENTS.length} markdown files)`, mimeType: 'application/json' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(PROPERTY_DOCUMENTS.map(doc => ({
          id: doc.id,
          property: doc.property,
          title: doc.title,
          section: doc.section,
          path: doc.path,
          uri: doc.uri,
        })), null, 2)
      }]
    })
  );

  const propertyDocumentBuckets = {
    io: PROPERTY_DOCUMENTS.filter(doc => doc.property === 'io'),
    ltd: PROPERTY_DOCUMENTS.filter(doc => doc.property === 'ltd'),
    space: PROPERTY_DOCUMENTS.filter(doc => doc.property === 'space'),
    agency: PROPERTY_DOCUMENTS.filter(doc => doc.property === 'agency'),
  } as const;

  for (const [property, docs] of Object.entries(propertyDocumentBuckets)) {
    server.resource(
      `docs-list-${property}`,
      `docs://list/${property}`,
      { description: `All ${property.toUpperCase()} documents (${docs.length})`, mimeType: 'application/json' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(docs.map(doc => ({
            id: doc.id,
            title: doc.title,
            section: doc.section,
            path: doc.path,
            uri: doc.uri,
          })), null, 2)
        }]
      })
    );
  }

  for (const doc of PROPERTY_DOCUMENTS) {
    server.resource(
      `doc-${sanitizeResourceId(doc.id)}`,
      doc.uri,
      { description: `${doc.property.toUpperCase()} document: ${doc.title}`, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: formatPropertyDocumentMarkdown(doc),
        }]
      })
    );
  }

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
      ...pattern.steps.map((s, i) => `${i + 1}. ${s.notes || s.customLabel || s.referenceId}`),
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

function sanitizeResourceId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function formatPropertyDocumentMarkdown(doc: typeof PROPERTY_DOCUMENTS[number]): string {
  return [
    `# ${doc.title}`,
    '',
    `**Property:** .${doc.property} | **Section:** ${doc.section} | **Path:** \`${doc.path}\``,
    '',
    doc.content
  ].join('\n');
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
