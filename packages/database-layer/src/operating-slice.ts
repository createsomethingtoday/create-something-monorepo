import type {
  DatabaseLayerSystemContextLens,
  DatabaseLayerSystemContextNode,
  DatabaseLayerSystemContextProjection,
  DatabaseLayerSystemContextProjectionOptions,
  DatabaseLayerSystemContextRelationship,
  DatabaseLayerSystemContextSource,
  DatabaseLayerTopologyFreshnessState
} from './types.js';

const LENSES: DatabaseLayerSystemContextLens[] = [
  'dependencies',
  'authority',
  'change',
  'proof'
];

function boundedMaxNodes(value: number | undefined): number {
  if (!Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(12, Math.round(value as number)));
}

function parsedTime(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sourceFreshness(
  source: DatabaseLayerSystemContextSource,
  now: string | undefined
): DatabaseLayerTopologyFreshnessState {
  const reviewBy = parsedTime(source.source.reviewBy);
  const current = parsedTime(now ?? source.source.checkedAt);
  if (reviewBy === undefined || current === undefined) return 'unknown';
  return current > reviewBy ? 'stale' : 'current';
}

function visibleForAudience(
  visibility: 'public' | 'client' | 'internal' | undefined,
  audience: DatabaseLayerSystemContextProjectionOptions['audience']
): boolean {
  if (audience === 'internal') return true;
  if (audience === 'client') return visibility !== 'internal';
  return visibility === undefined || visibility === 'public';
}

function publicNode(
  node: DatabaseLayerSystemContextNode,
  freshness: DatabaseLayerTopologyFreshnessState
): Omit<DatabaseLayerSystemContextNode, 'internal'> {
  const { internal: _internal, ...safe } = node;
  return {
    ...safe,
    evidence: [...safe.evidence],
    provenance: { ...safe.provenance },
    semantics: {
      ...safe.semantics,
      freshness: freshness === 'current' ? safe.semantics.freshness : freshness
    }
  };
}

function publicRelationship(
  relationship: DatabaseLayerSystemContextRelationship
): Omit<DatabaseLayerSystemContextRelationship, 'internal'> {
  const { internal: _internal, ...safe } = relationship;
  return safe;
}

function validateSource(source: DatabaseLayerSystemContextSource): void {
  if (source.version !== 'system-context.operating-slice.v1') {
    throw new Error(`Unsupported operating slice version: ${String(source.version)}`);
  }
  const ids = new Set<string>();
  for (const node of source.nodes) {
    if (!node.id || ids.has(node.id)) throw new Error(`Invalid or duplicate operating slice node: ${node.id}`);
    ids.add(node.id);
  }
  for (const relationship of source.relationships) {
    if (!ids.has(relationship.source) || !ids.has(relationship.target)) {
      throw new Error(`Operating slice relationship references an unknown record: ${relationship.id}`);
    }
  }
}

export function projectOperatingSlice(
  source: DatabaseLayerSystemContextSource,
  options: DatabaseLayerSystemContextProjectionOptions
): DatabaseLayerSystemContextProjection {
  validateSource(source);
  const selectedLens = options.lens ?? 'dependencies';
  if (!LENSES.includes(selectedLens)) throw new Error(`Unknown operating slice lens: ${selectedLens}`);

  const maxNodes = boundedMaxNodes(options.maxNodes);
  const freshness = sourceFreshness(source, options.now);
  const redactions = source.nodes
    .filter((node) => !visibleForAudience(node.visibility, options.audience))
    .map((node) => node.id);
  const allowedNodes = source.nodes.filter((node) => visibleForAudience(node.visibility, options.audience));
  const allowedById = new Map(allowedNodes.map((node) => [node.id, node]));
  const prioritizedIds = [
    ...source.lenses[selectedLens],
    ...source.nodes.map((node) => node.id)
  ];
  const selectedIds: string[] = [];
  for (const id of prioritizedIds) {
    if (!allowedById.has(id) || selectedIds.includes(id)) continue;
    selectedIds.push(id);
    if (selectedIds.length === maxNodes) break;
  }
  const selectedIdSet = new Set(selectedIds);
  const nodes = selectedIds.map((id) => publicNode(allowedById.get(id) as DatabaseLayerSystemContextNode, freshness));
  const relationships = source.relationships
    .filter(
      (relationship) =>
        visibleForAudience(relationship.visibility, options.audience) &&
        selectedIdSet.has(relationship.source) &&
        selectedIdSet.has(relationship.target)
    )
    .map(publicRelationship);
  const lenses = Object.fromEntries(
    LENSES.map((lens) => [
      lens,
      source.lenses[lens].filter((id) => selectedIdSet.has(id))
    ])
  ) as Record<DatabaseLayerSystemContextLens, string[]>;
  const visibleNodeIds = [...lenses[selectedLens]];
  const visibleNodeIdSet = new Set(visibleNodeIds);
  const visibleRelationshipIds = relationships
    .filter(
      (relationship) =>
        visibleNodeIdSet.has(relationship.source) && visibleNodeIdSet.has(relationship.target)
    )
    .map((relationship) => relationship.id);

  return {
    ...source,
    audience: options.audience,
    source: { ...source.source, freshness },
    comparison: source.comparison ? { ...source.comparison } : undefined,
    workflow: { ...source.workflow },
    receipt: { ...source.receipt },
    selectedLens,
    nodes,
    relationships,
    lenses,
    visibleNodeIds,
    visibleRelationshipIds,
    redactions
  };
}
