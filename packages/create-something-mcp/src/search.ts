/**
 * Search — Simple full-text search across all content domains.
 * Builds an inverted index at module load time for fast lookups.
 */

import type { ContentItem } from './content/types.js';
import { PAPERS } from './content/generated/papers.js';
import { CANON_PAGES } from './content/generated/canon.js';
import { CANON_REGISTRY_MANIFEST } from './content/generated/canon-registry.js';
import { CANON_OVERLAY_CATALOG } from './content/generated/canon-overlay-catalog.js';
import { CANON_OVERLAY_INTAKE_INVENTORY } from './content/generated/canon-overlay-intake-inventory.js';
import { CANON_OVERLAY_CANDIDATE_QUEUE } from './content/generated/canon-overlay-candidate-queue.js';
import {
  CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS
} from './content/generated/canon-overlay-candidate-review-packets.js';
import {
  CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS
} from './content/generated/canon-overlay-candidate-promotion-plans.js';
import { PATTERNS } from './content/generated/patterns.js';
import { GRAPH_NODES } from './content/generated/graph.js';
import { PROPERTY_DOCUMENTS } from './content/generated/property-docs.js';
// GRAPH_EDGES (800 KB) lazy-loaded only when findRelated() is called
import { MASTERS } from './content/masters.js';
import { PRAXIS_EXERCISES } from './content/praxis.js';
import { PRODUCTS } from './content/products.js';
import { HOST_PLAYBOOKS } from './content/playbooks.js';
import {
  TIERS,
  CROSS_CUTTING_CONCERNS,
  MCP_MAPPINGS,
  AUTOMOTIVE_MAPPINGS,
  SAMPLING_EXPLANATION,
  POLICY_AS_ARTIFACT
} from './content/framework.js';

// ============================================================================
// Build content index
// ============================================================================

function buildContentIndex(): ContentItem[] {
  const items: ContentItem[] = [];

  // Papers
  for (const p of PAPERS) {
    items.push({
      id: `paper:${p.slug}`,
      type: 'paper',
      title: p.title,
      description: p.description || p.subtitle || '',
      content: p.content,
      property: 'io',
      uri: `papers://${p.slug}`
    });
  }

  // Canon
  for (const c of CANON_PAGES) {
    items.push({
      id: `canon:${c.slug}`,
      type: 'canon',
      title: c.title,
      description: c.description,
      content: c.content,
      property: 'ltd',
      uri: `canon://${c.slug}`
    });
  }

  for (const item of CANON_REGISTRY_MANIFEST.items) {
    items.push({
      id: `canon-registry:${item.id}`,
      type: 'canon-registry',
      title: item.name,
      description: item.description,
      content: [
        item.kind,
        item.maturity,
        item.sourcePath,
        item.importPath ?? '',
        item.docsPath ?? '',
        item.tags.join(' '),
        item.modalities.join(' '),
        item.dependencies?.join(' ') ?? '',
        item.contract.accessibility ?? '',
        item.contract.evidence ?? '',
        item.contract.motion ?? '',
        item.contract.extension ?? ''
      ].join('\n'),
      property: 'ltd',
      uri: `canon://registry/${item.id}`
    });
  }

  for (const template of CANON_OVERLAY_CATALOG.templates) {
    items.push({
      id: `canon-overlay:${template.id}`,
      type: 'canon-registry',
      title: template.name,
      description: template.summary,
      content: [
        CANON_OVERLAY_CATALOG.description,
        template.manifest.targetModalities.join(' '),
        template.outputFiles.join(' '),
        template.registryItemIds.join(' '),
        template.review.status,
        template.review.summary,
        CANON_OVERLAY_CATALOG.overlayRules.join('\n'),
        CANON_OVERLAY_CATALOG.agentContract.useFor.join('\n'),
        CANON_OVERLAY_CATALOG.agentContract.stopBefore.join('\n')
      ].join('\n'),
      property: 'ltd',
      uri: `canon://overlays/${template.id}`
    });
  }

  items.push({
    id: 'canon-overlay-intake:inventory',
    type: 'canon-registry',
    title: 'Canon Overlay Intake Inventory',
    description: CANON_OVERLAY_INTAKE_INVENTORY.description,
    content: [
      CANON_OVERLAY_INTAKE_INVENTORY.summary.total.toString(),
      CANON_OVERLAY_INTAKE_INVENTORY.summary.ready.toString(),
      CANON_OVERLAY_INTAKE_INVENTORY.summary.needsArtifacts.toString(),
      CANON_OVERLAY_INTAKE_INVENTORY.summary.needsEvidence.toString(),
      CANON_OVERLAY_INTAKE_INVENTORY.summary.candidateIntakes.toString(),
      CANON_OVERLAY_INTAKE_INVENTORY.agentContract.useFor.join('\n'),
      CANON_OVERLAY_INTAKE_INVENTORY.agentContract.stopBefore.join('\n')
    ].join('\n'),
    property: 'ltd',
    uri: 'canon://overlays/intake'
  });

  for (const entry of CANON_OVERLAY_INTAKE_INVENTORY.entries) {
    items.push({
      id: `canon-overlay-intake:${entry.manifest.id}`,
      type: 'canon-registry',
      title: entry.manifest.name,
      description: entry.review.summary,
      content: [
        entry.manifestPath,
        entry.manifest.owner,
        entry.manifest.sourcePackage,
        entry.manifest.targetModalities.join(' '),
        entry.review.status,
        entry.review.missingArtifacts.join(' '),
        entry.review.integrityIssues.map(issue => `${issue.kind} ${issue.context} ${issue.path ?? ''} ${issue.registryItemId ?? ''} ${issue.message}`).join('\n'),
        entry.review.stopConditions.join('\n'),
        entry.review.extensionDecisions.map(decision => `${decision.packet.id} ${decision.decision.stage} ${decision.decision.action}`).join('\n')
      ].join('\n'),
      property: 'ltd',
      uri: `canon://overlays/intake/${entry.manifest.id}`
    });
  }

  items.push({
    id: 'canon-overlay-candidate:queue',
    type: 'canon-registry',
    title: 'Canon Overlay Candidate Queue',
    description: CANON_OVERLAY_CANDIDATE_QUEUE.description,
    content: [
      CANON_OVERLAY_CANDIDATE_QUEUE.summary.total.toString(),
      CANON_OVERLAY_CANDIDATE_QUEUE.summary.overlays.toString(),
      CANON_OVERLAY_CANDIDATE_QUEUE.summary.byRequestedKind.map(item => `${item.kind} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_QUEUE.summary.byModality.map(item => `${item.modality} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_QUEUE.agentContract.useFor.join('\n'),
      CANON_OVERLAY_CANDIDATE_QUEUE.agentContract.stopBefore.join('\n')
    ].join('\n'),
    property: 'ltd',
    uri: 'canon://overlays/candidates'
  });

  for (const entry of CANON_OVERLAY_CANDIDATE_QUEUE.entries) {
    items.push({
      id: `canon-overlay-candidate:${entry.intakeId}`,
      type: 'canon-registry',
      title: entry.title,
      description: entry.summary,
      content: [
        entry.overlayId,
        entry.overlayName,
        entry.manifestPath,
        entry.owner,
        entry.sourcePackage,
        entry.sourcePath ?? '',
        entry.requestedKind,
        entry.requestedModalities.join(' '),
        entry.tags.join(' '),
        entry.dependencies.join(' '),
        entry.surfaces.map(surface => `${surface.surfaceId} ${surface.name} ${surface.modality} ${surface.sourcePath ?? ''} ${surface.proof ?? ''}`).join('\n'),
        entry.requiredEvidence.join('\n'),
        entry.stopBeforeStable.join('\n'),
        entry.rationale,
        entry.reviewUri,
        entry.handoffUri
      ].join('\n'),
      property: 'ltd',
      uri: entry.candidateUri
    });
  }

  items.push({
    id: 'canon-overlay-candidate-review:packets',
    type: 'canon-registry',
    title: 'Canon Overlay Candidate Review Packets',
    description: CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.description,
    content: [
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.summary.total.toString(),
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.summary.overlays.toString(),
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.summary.byRequestedKind.map(item => `${item.kind} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.summary.byModality.map(item => `${item.modality} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.agentContract.useFor.join('\n'),
      CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.agentContract.stopBefore.join('\n')
    ].join('\n'),
    property: 'ltd',
    uri: 'canon://overlays/candidates/handoffs'
  });

  for (const packet of CANON_OVERLAY_CANDIDATE_REVIEW_PACKETS.entries) {
    items.push({
      id: `canon-overlay-candidate-review:${packet.intakeId}`,
      type: 'canon-registry',
      title: packet.title,
      description: packet.summary,
      content: [
        packet.candidateId,
        packet.overlayId,
        packet.overlayName,
        packet.manifestPath,
        packet.owner,
        packet.sourcePackage,
        packet.sourcePath ?? '',
        packet.requestedKind,
        packet.requestedModalities.join(' '),
        packet.tags.join(' '),
        packet.dependencies.join(' '),
        packet.surfaces.map(surface => `${surface.surfaceId} ${surface.name} ${surface.modality} ${surface.sourcePath ?? ''} ${surface.proof ?? ''}`).join('\n'),
        packet.requiredEvidence.join('\n'),
        packet.stopBeforeStable.join('\n'),
        packet.promotionChecklist.join('\n'),
        packet.approvalBoundary.join('\n'),
        packet.agentContract.useFor.join('\n'),
        packet.agentContract.stopBefore.join('\n'),
        packet.rationale,
        packet.reviewUri,
        packet.candidateUri,
        packet.handoffUri
      ].join('\n'),
      property: 'ltd',
      uri: packet.handoffUri
    });
  }

  items.push({
    id: 'canon-overlay-candidate-promotion-plan:collection',
    type: 'canon-registry',
    title: 'Canon Overlay Candidate Promotion Plans',
    description: CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.description,
    content: [
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.summary.total.toString(),
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.summary.overlays.toString(),
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.summary.byRequestedKind.map(item => `${item.kind} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.summary.byModality.map(item => `${item.modality} ${item.count}`).join('\n'),
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.agentContract.useFor.join('\n'),
      CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.agentContract.stopBefore.join('\n')
    ].join('\n'),
    property: 'ltd',
    uri: 'canon://overlays/candidates/promotion-plans'
  });

  for (const plan of CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries) {
    items.push({
      id: `canon-overlay-candidate-promotion-plan:${plan.intakeId}`,
      type: 'canon-registry',
      title: plan.title,
      description: plan.summary,
      content: [
        plan.packetId,
        plan.candidateId,
        plan.overlayId,
        plan.overlayName,
        plan.manifestPath,
        plan.owner,
        plan.sourcePackage,
        plan.sourcePath ?? '',
        plan.requestedKind,
        plan.requestedModalities.join(' '),
        plan.preconditions.join('\n'),
        plan.implementationScope.join('\n'),
        plan.requiredChanges.join('\n'),
        plan.validationPlan.join('\n'),
        plan.documentationPlan.join('\n'),
        plan.compatibilityPlan.join('\n'),
        plan.stopConditions.join('\n'),
        plan.approvalBoundary.join('\n'),
        plan.agentContract.useFor.join('\n'),
        plan.agentContract.stopBefore.join('\n'),
        plan.planUri,
        plan.handoffUri,
        plan.candidateUri,
        plan.reviewUri
      ].join('\n'),
      property: 'ltd',
      uri: plan.planUri
    });
  }

  // Patterns
  for (const p of PATTERNS) {
    items.push({
      id: `pattern:${p.slug}`,
      type: 'pattern',
      title: p.title,
      description: p.subtitle || '',
      content: p.content,
      property: 'ltd',
      uri: `patterns://${p.slug}`
    });
  }

  // Masters
  for (const m of MASTERS) {
    items.push({
      id: `master:${m.slug}`,
      type: 'master',
      title: m.name,
      description: m.philosophy,
      content: `${m.philosophy}\n\nPrinciples:\n${m.principles.join('\n')}\n\nInfluence on CREATE SOMETHING:\n${m.influence}`,
      property: 'ltd',
      uri: `masters://${m.slug}`
    });
  }

  // Praxis
  for (const e of PRAXIS_EXERCISES) {
    items.push({
      id: `praxis:${e.id}`,
      type: 'praxis',
      title: e.title,
      description: e.context.situation,
      content: `${e.context.situation}\n${e.context.task}\n${e.pattern}\n${e.whyItMatters}`,
      property: 'space',
      uri: `praxis://exercises`
    });
  }

  // Products
  for (const p of PRODUCTS) {
    items.push({
      id: `product:${p.id}`,
      type: 'product',
      title: p.title,
      description: p.description,
      content: p.description,
      property: 'agency',
      uri: `products://list`
    });
  }

  // Property Documents
  for (const doc of PROPERTY_DOCUMENTS) {
    items.push({
      id: `document:${doc.id}`,
      type: 'document',
      title: doc.title,
      description: doc.description,
      content: doc.content,
      property: doc.property,
      uri: doc.uri
    });
  }

  // Host Playbooks
  for (const p of HOST_PLAYBOOKS) {
    items.push({
      id: `playbook:${p.slug}`,
      type: 'playbook',
      title: `${p.name} Host Playbook`,
      description: p.description,
      content: `${p.mentalModel}\n\nStrengths: ${p.strengths.join(', ')}\nBest for: ${p.bestFor.join(', ')}\nAnti-patterns: ${p.antiPatterns.join(', ')}\nWorkflow patterns: ${p.workflowPatterns.map(wp => wp.name).join(', ')}`,
      property: 'space',
      uri: `playbooks://hosts/${p.slug}`
    });
  }

  // Framework
  for (const [key, tier] of Object.entries(TIERS)) {
    items.push({
      id: `framework:tier:${key}`,
      type: 'framework',
      title: `${tier.name} Tier`,
      description: tier.definition,
      content: `${tier.description}\nExamples: ${tier.examples.join(', ')}\nFailure mode: ${tier.failureMode}`,
      property: 'framework',
      uri: `framework://definitions/${key}`
    });
  }

  return items;
}

// ============================================================================
// Search index
// ============================================================================

let _contentIndex: ContentItem[] | null = null;
let _invertedIndex: Map<string, Set<number>> | null = null;

function getContentIndex(): ContentItem[] {
  if (!_contentIndex) {
    _contentIndex = buildContentIndex();
  }
  return _contentIndex;
}

function getInvertedIndex(): Map<string, Set<number>> {
  if (!_invertedIndex) {
    _invertedIndex = new Map();
    const index = getContentIndex();
    for (let i = 0; i < index.length; i++) {
      const item = index[i];
      const text = `${item.title} ${item.description} ${item.content}`.toLowerCase();
      const tokens = text.split(/\W+/).filter(t => t.length > 2);
      for (const token of tokens) {
        if (!_invertedIndex.has(token)) {
          _invertedIndex.set(token, new Set());
        }
        _invertedIndex.get(token)!.add(i);
      }
    }
  }
  return _invertedIndex;
}

// ============================================================================
// Search function
// ============================================================================

export interface SearchResult {
  item: ContentItem;
  score: number;
  matches: string[];
}

export function search(
  query: string,
  options?: {
    type?: string;
    property?: string;
    limit?: number;
  }
): SearchResult[] {
  const index = getContentIndex();
  const invertedIndex = getInvertedIndex();
  const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

  if (queryTokens.length === 0) return [];

  // Score each item based on term frequency
  const scores = new Map<number, { score: number; matches: string[] }>();

  for (const token of queryTokens) {
    const matchingItems = invertedIndex.get(token);
    if (!matchingItems) continue;

    for (const idx of matchingItems) {
      const current = scores.get(idx) || { score: 0, matches: [] };
      current.score += 1;
      if (!current.matches.includes(token)) current.matches.push(token);
      scores.set(idx, current);
    }
  }

  // Boost exact phrase matches in title
  const queryLower = query.toLowerCase();
  for (const [idx, data] of scores) {
    const item = index[idx];
    if (item.title.toLowerCase().includes(queryLower)) {
      data.score += 10;
    }
    if (item.description.toLowerCase().includes(queryLower)) {
      data.score += 5;
    }
  }

  // Build results with filters
  let results: SearchResult[] = [];
  for (const [idx, data] of scores) {
    const item = index[idx];

    // Apply filters
    if (options?.type && item.type !== options.type) continue;
    if (options?.property && item.property !== options.property) continue;

    results.push({ item, score: data.score, matches: data.matches });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  const limit = options?.limit || 10;
  return results.slice(0, limit);
}

// ============================================================================
// Graph traversal
// ============================================================================

// Cache for lazy-loaded edges
let _graphEdges: typeof GRAPH_NODES extends Array<infer _> ? any[] : never;

async function getGraphEdges() {
  if (!_graphEdges) {
    const mod = await import('./content/generated/graph.js');
    _graphEdges = mod.GRAPH_EDGES;
  }
  return _graphEdges;
}

export async function findRelated(concept: string, depth = 1): Promise<{
  nodes: { id: string; title: string; type: string; concepts: string[] }[];
  edges: { source: string; target: string; type: string; reason?: string }[];
}> {
  const conceptLower = concept.toLowerCase();

  // Find nodes that match the concept
  const matchingNodes = GRAPH_NODES.filter(n =>
    n.id.toLowerCase().includes(conceptLower) ||
    n.title.toLowerCase().includes(conceptLower) ||
    n.concepts.some(c => c.toLowerCase().includes(conceptLower))
  );

  if (matchingNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Lazy-load edges only when graph traversal is needed
  const GRAPH_EDGES = await getGraphEdges();

  const nodeIds = new Set(matchingNodes.map(n => n.id));
  const resultEdges: typeof GRAPH_EDGES = [];

  // BFS for connected nodes up to depth
  for (let d = 0; d < depth; d++) {
    const currentIds = new Set(nodeIds);
    for (const edge of GRAPH_EDGES) {
      if (currentIds.has(edge.source) && !nodeIds.has(edge.target)) {
        nodeIds.add(edge.target);
        resultEdges.push(edge);
      }
      if (currentIds.has(edge.target) && !nodeIds.has(edge.source)) {
        nodeIds.add(edge.source);
        resultEdges.push(edge);
      }
    }
  }

  // Also include edges between already-found nodes
  for (const edge of GRAPH_EDGES) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      if (!resultEdges.includes(edge)) {
        resultEdges.push(edge);
      }
    }
  }

  const resultNodes = GRAPH_NODES
    .filter(n => nodeIds.has(n.id))
    .map(n => ({ id: n.id, title: n.title, type: n.type, concepts: n.concepts }));

  return {
    nodes: resultNodes.slice(0, 50),
    edges: resultEdges.slice(0, 100)
  };
}
