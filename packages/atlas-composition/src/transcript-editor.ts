/** Renderer-neutral transcript editing primitives for the local Atlas alpha. */

export const ATLAS_TRANSCRIPT_EDITOR_SCHEMA = 'create-something/atlas-transcript-editor@1' as const;

export type MediaNodeKind =
  | 'source-asset' | 'transcript' | 'cut-list' | 'timeline' | 'clip' | 'caption-track'
  | 'media-overlay' | 'edit-proposal' | 'approval' | 'render-request'
  | 'render-output' | 'inspection-receipt';
export type MediaPort = 'produces' | 'uses' | 'invalidates' | 'requires-approval' | 'renders' | 'inspects';

export type SourceAsset = {
  id: string;
  uri: string;
  sha256: string;
  media: { durationUs: number; width: number; height: number; hasAudio: boolean };
};
export type TranscriptWord = { id: string; startUs: number; endUs: number; text: string };
export type TranscriptSegment = {
  id: string; assetId: string; startUs: number; endUs: number; text: string; words?: TranscriptWord[];
};
export type CutOperation = {
  id: string;
  kind: 'keep' | 'remove' | 'replace-text';
  transcriptSegmentIds: string[];
  startUs: number;
  endUs: number;
  reason: string;
};
export type CaptionTrack = { id: string; segmentIds: string[] };
export type MediaOverlay = {
  id: string;
  kind: 'text' | 'image' | 'video' | 'audio';
  startUs: number;
  endUs: number;
  text?: string;
};
export type OperatorInstructionReference = {
  id: string;
  text: string;
  source: 'operator' | 'agent';
  createdAt: string;
  proposalId?: string;
};
export type ClipDiffState = { cutOperationId?: string; startUs?: number; endUs?: number };
export type ClipDiffEntry = {
  id: string;
  at: string;
  event: 'created' | 'proposed' | 'approved' | 'rejected' | 'applied' | 'rendered';
  actor: 'operator' | 'agent' | 'system';
  proposalId?: string;
  summary: string;
  before?: ClipDiffState;
  after: ClipDiffState;
};
export type MediaDependencyNode = {
  id: string;
  kind: MediaNodeKind;
  cutOperationId?: string;
  diffs?: ClipDiffEntry[];
};
export type MediaDependencyEdge = { id: string; source: string; target: string; port: MediaPort };
export type MediaDependencyGraph = { nodes: MediaDependencyNode[]; edges: MediaDependencyEdge[] };
export type ProjectRevision = {
  id: string;
  parentRevisionId: string | null;
  cutList: CutOperation[];
  captions: CaptionTrack[];
  overlays: MediaOverlay[];
  graph: MediaDependencyGraph;
  createdAt: string;
  createdBy: 'operator' | 'agent' | 'system';
};
export type MediaEditProposal = {
  id: string;
  baseRevisionId: string;
  proposedBy: string;
  rationale: string;
  operations: CutOperation[];
  overlays?: MediaOverlay[];
  instruction?: OperatorInstructionReference;
  agentRun?: {
    provider: 'codex-app-server';
    threadId: string;
    turnId: string;
    startedAt: string;
    completedAt: string;
    inputSha256: string;
    responseSha256: string;
    usage: 'managed-account-unreported';
  };
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  decision?: { decidedAt: string; decidedBy: string; note?: string };
};
export type MediaRenderRequest = {
  id: string;
  projectId: string;
  revisionId: string;
  compositionId: 'AtlasTranscriptTimeline';
  compositionVersion: string;
  rendererVersion: string;
  timelineHash: string;
  captionSha256: string;
  cacheKey: string;
  requestedAt: string;
  output: { path: string; width: number; height: number; fps: number; codec: 'h264' };
};
export type MediaInspectionReceipt = {
  inspectedAt: string;
  tool: 'ffprobe';
  durationUs: number;
  width: number;
  height: number;
  videoCodec: string;
  audioStreams: number;
};
export type MediaRenderReceipt = {
  id: string;
  kind: 'render';
  status: 'completed' | 'failed';
  request: MediaRenderRequest;
  completedAt: string;
  cacheHit: boolean;
  outputSha256?: string;
  inspection?: MediaInspectionReceipt;
  error?: string;
};
export type TranscriptEditorProject = {
  schema: typeof ATLAS_TRANSCRIPT_EDITOR_SCHEMA;
  id: string;
  atlasSessionId: string;
  currentRevisionId: string;
  sourceAssets: SourceAsset[];
  transcriptSegments: TranscriptSegment[];
  revisions: ProjectRevision[];
  proposals: MediaEditProposal[];
  receipts: MediaRenderReceipt[];
};
export type TranscriptEditorValidation = { ok: boolean; issues: string[] };
export type TimelineClip = {
  id: string;
  kind: 'video' | 'caption' | 'overlay';
  startUs: number;
  endUs: number;
  sourceStartUs?: number;
  sourceEndUs?: number;
  sourceAssetId?: string;
  transcriptSegmentIds?: string[];
  overlayId?: string;
  nodeId?: string;
};
export type TimelineProjection = { projectId: string; revisionId: string; durationUs: number; clips: TimelineClip[] };
export type TranscriptCleanupCandidate = {
  id: string;
  kind: 'filler' | 'long-pause';
  startUs: number;
  endUs: number;
  transcriptSegmentIds: string[];
  summary: string;
};
export type FindTranscriptCleanupCandidatesInput = {
  minPauseUs?: number;
  fillerTerms?: string[];
};
export type CompileTranscriptSrtInput = {
  revisionId?: string;
  captionTrackId?: string;
};
export type EditedCaptionCue = { id: string; startUs: number; endUs: number; text: string };
export type TranscriptProposalAudition = {
  proposalId: string;
  baseRevisionId: string;
  durationUs: number;
  sourceRanges: Array<{ operationId: string; startUs: number; endUs: number }>;
};
export type ProposeTranscriptEditInput = {
  id: string; baseRevisionId: string; proposedBy: string; rationale: string; operations: CutOperation[];
  overlays?: MediaOverlay[];
  instruction?: Omit<OperatorInstructionReference, 'proposalId'>;
  agentRun?: MediaEditProposal['agentRun'];
};
export type DecideTranscriptEditInput = {
  decidedAt: string; decidedBy: string; decision: 'approved' | 'rejected'; note?: string;
};
export type ApplyTranscriptEditInput = {
  proposalId: string; revisionId: string; appliedAt: string; appliedBy: 'operator' | 'agent' | 'system';
};
export type InitializeTranscriptEditorProjectInput = {
  id: string;
  atlasSessionId: string;
  createdAt: string;
  sourceAsset: SourceAsset;
  transcriptSegments: Array<
    Omit<TranscriptSegment, 'assetId' | 'id'> & Partial<Pick<TranscriptSegment, 'assetId' | 'id'>>
  >;
  includeTitleOverlay?: boolean;
};

function duplicateIds(items: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) { if (seen.has(item.id)) duplicates.add(item.id); seen.add(item.id); }
  return [...duplicates];
}
function isPositiveRange(startUs: number, endUs: number): boolean {
  return Number.isInteger(startUs) && Number.isInteger(endUs) && startUs >= 0 && endUs > startUs;
}
function rangesOverlap(left: CutOperation, right: CutOperation): boolean {
  return left.startUs < right.endUs && right.startUs < left.endUs;
}
function findRevision(project: TranscriptEditorProject, revisionId: string): ProjectRevision {
  const revision = project.revisions.find((candidate) => candidate.id === revisionId);
  if (!revision) throw new Error(`Unknown project revision: ${revisionId}`);
  return revision;
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function createTranscriptEditorProject(input: InitializeTranscriptEditorProjectInput): TranscriptEditorProject {
  const sourceAsset = clone(input.sourceAsset);
  const transcriptSegments = input.transcriptSegments.map((segment, index) => ({
    ...clone(segment),
    id: segment.id?.trim() || `segment-${index + 1}`,
    assetId: segment.assetId?.trim() || sourceAsset.id
  }));
  const cutList = transcriptSegments.map((segment) => ({
    id: `keep:${segment.id}`,
    kind: 'keep' as const,
    transcriptSegmentIds: [segment.id],
    startUs: segment.startUs,
    endUs: segment.endUs,
    reason: 'Initial transcript interval.'
  }));
  const clips: MediaDependencyNode[] = cutList.map((operation) => ({
    id: `clip:${operation.id}`,
    kind: 'clip',
    cutOperationId: operation.id,
    diffs: [{
      id: `diff:${operation.id}:created`,
      at: input.createdAt,
      event: 'created',
      actor: 'operator',
      summary: 'Clip node created from the timestamped source transcript.',
      after: { cutOperationId: operation.id, startUs: operation.startUs, endUs: operation.endUs }
    }]
  }));
  const overlays: MediaOverlay[] = input.includeTitleOverlay
    ? [{ id: 'overlay:title', kind: 'text', text: 'Atlas transcript edit', startUs: 0, endUs: Math.min(2_000_000, sourceAsset.media.durationUs) }]
    : [];
  const graphNodes: MediaDependencyNode[] = [
    { id: 'source', kind: 'source-asset' },
    { id: 'transcript', kind: 'transcript' },
    { id: 'cut-list', kind: 'cut-list' },
    { id: 'timeline', kind: 'timeline' },
    { id: 'captions:main', kind: 'caption-track' },
    ...overlays.map((overlay) => ({ id: overlay.id, kind: 'media-overlay' as const })),
    ...clips
  ];
  const graphEdges: MediaDependencyEdge[] = [
    { id: 'edge:source:transcript', source: 'source', target: 'transcript', port: 'produces' },
    { id: 'edge:transcript:cut-list', source: 'transcript', target: 'cut-list', port: 'produces' },
    { id: 'edge:transcript:captions', source: 'transcript', target: 'captions:main', port: 'produces' },
    { id: 'edge:captions:timeline', source: 'captions:main', target: 'timeline', port: 'uses' },
    ...overlays.map((overlay) => ({ id: `edge:${overlay.id}:timeline`, source: overlay.id, target: 'timeline', port: 'uses' as const })),
    ...clips.flatMap((clip) => [
      { id: `edge:cut-list:${clip.id}`, source: 'cut-list', target: clip.id, port: 'produces' as const },
      { id: `edge:${clip.id}:timeline`, source: clip.id, target: 'timeline', port: 'produces' as const }
    ])
  ];
  const project: TranscriptEditorProject = {
    schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
    id: input.id.trim(),
    atlasSessionId: input.atlasSessionId.trim(),
    currentRevisionId: 'revision-1',
    sourceAssets: [sourceAsset],
    transcriptSegments,
    revisions: [{
      id: 'revision-1',
      parentRevisionId: null,
      cutList,
      captions: [{ id: 'captions:main', segmentIds: transcriptSegments.map((segment) => segment.id) }],
      overlays,
      graph: { nodes: graphNodes, edges: graphEdges },
      createdAt: input.createdAt,
      createdBy: 'operator'
    }],
    proposals: [],
    receipts: []
  };
  assertValidProject(project);
  return project;
}
function assertValidProject(project: TranscriptEditorProject): void {
  const validation = validateTranscriptEditorProject(project);
  if (!validation.ok) throw new Error(`Invalid transcript editor project: ${validation.issues.join(' ')}`);
}

/** Produces the local-store payload only after the full project contract validates. */
export function serializeTranscriptEditorProject(project: TranscriptEditorProject): string {
  assertValidProject(project);
  return JSON.stringify(project);
}

/** Restores a local-store payload without silently accepting malformed project state. */
export function deserializeTranscriptEditorProject(serialized: string): TranscriptEditorProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Transcript editor project payload must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Transcript editor project payload must be a JSON object.');
  }
  const candidate = parsed as Partial<TranscriptEditorProject>;
  if (
    typeof candidate.schema !== 'string' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.atlasSessionId !== 'string' ||
    typeof candidate.currentRevisionId !== 'string' ||
    !Array.isArray(candidate.sourceAssets) ||
    !Array.isArray(candidate.transcriptSegments) ||
    !Array.isArray(candidate.revisions) ||
    !Array.isArray(candidate.proposals) ||
    !Array.isArray(candidate.receipts)
  ) {
    throw new Error('Transcript editor project payload is missing required fields.');
  }
  const project = candidate as TranscriptEditorProject;
  try {
    assertValidProject(project);
  } catch (error) {
    throw new Error(`Transcript editor project payload is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  return clone(project);
}
function hasDependencyCycle(graph: MediaDependencyGraph): boolean {
  const visited = new Set<string>();
  const active = new Set<string>();
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  const visit = (nodeId: string): boolean => {
    if (active.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId); active.add(nodeId);
    const cycle = (outgoing.get(nodeId) ?? []).some(visit);
    active.delete(nodeId);
    return cycle;
  };
  return graph.nodes.some((node) => visit(node.id));
}

export function validateTranscriptEditorProject(project: TranscriptEditorProject): TranscriptEditorValidation {
  const issues: string[] = [];
  if (project.schema !== ATLAS_TRANSCRIPT_EDITOR_SCHEMA) issues.push(`Unsupported transcript editor schema: ${project.schema}`);
  if (!project.id.trim()) issues.push('Project id is required.');
  if (!project.atlasSessionId.trim()) issues.push('Atlas session id is required.');
  for (const [label, records] of [
    ['source asset', project.sourceAssets], ['transcript segment', project.transcriptSegments],
    ['revision', project.revisions], ['proposal', project.proposals], ['receipt', project.receipts]
  ] as const) {
    const duplicates = duplicateIds(records);
    if (duplicates.length) issues.push(`Duplicate ${label} ids: ${duplicates.join(', ')}.`);
  }
  const assetIds = new Set(project.sourceAssets.map((asset) => asset.id));
  const segmentIds = new Set(project.transcriptSegments.map((segment) => segment.id));
  const revisionIds = new Set(project.revisions.map((revision) => revision.id));
  if (!revisionIds.has(project.currentRevisionId)) issues.push(`Current revision is missing: ${project.currentRevisionId}.`);
  for (const asset of project.sourceAssets) {
    if (!asset.uri.startsWith('file://') && !asset.uri.startsWith('fixture://')) issues.push(`Source asset ${asset.id} must use a local or fixture URI.`);
    if (!asset.sha256.trim()) issues.push(`Source asset ${asset.id} is missing a hash.`);
    if (!isPositiveRange(0, asset.media.durationUs)) issues.push(`Source asset ${asset.id} has invalid duration.`);
  }
  for (const segment of project.transcriptSegments) {
    if (!assetIds.has(segment.assetId)) issues.push(`Transcript segment ${segment.id} has a missing source asset.`);
    if (!isPositiveRange(segment.startUs, segment.endUs)) issues.push(`Transcript segment ${segment.id} has an invalid time range.`);
    if (!segment.text.trim()) issues.push(`Transcript segment ${segment.id} has no text.`);
    const source = project.sourceAssets.find((asset) => asset.id === segment.assetId);
    if (source && segment.endUs > source.media.durationUs) issues.push(`Transcript segment ${segment.id} falls outside source asset ${segment.assetId}.`);
    for (const word of segment.words ?? []) {
      if (!isPositiveRange(word.startUs, word.endUs)) issues.push(`Transcript word ${word.id} has an invalid time range.`);
      if (word.startUs < segment.startUs || word.endUs > segment.endUs) issues.push(`Transcript word ${word.id} falls outside segment ${segment.id}.`);
    }
  }
  for (const revision of project.revisions) {
    if (revision.parentRevisionId && !revisionIds.has(revision.parentRevisionId)) issues.push(`Revision ${revision.id} has a missing parent.`);
    if (revision.parentRevisionId === revision.id) issues.push(`Revision ${revision.id} cannot parent itself.`);
    for (const operation of revision.cutList) {
      if (!operation.transcriptSegmentIds.length) issues.push(`Cut operation ${operation.id} does not reference transcript segments.`);
      for (const segmentId of operation.transcriptSegmentIds) if (!segmentIds.has(segmentId)) issues.push(`Cut operation ${operation.id} references missing transcript segment ${segmentId}.`);
      if (!isPositiveRange(operation.startUs, operation.endUs)) issues.push(`Cut operation ${operation.id} has an invalid time range.`);
    }
    const keeps = revision.cutList.filter((operation) => operation.kind === 'keep');
    for (let index = 0; index < keeps.length; index += 1) for (let other = index + 1; other < keeps.length; other += 1) {
      if (rangesOverlap(keeps[index], keeps[other])) issues.push(`Revision ${revision.id} has overlapping kept intervals.`);
    }
    for (const caption of revision.captions) {
      if (!caption.segmentIds.length) issues.push(`Caption track ${caption.id} has no transcript segments.`);
      for (const segmentId of caption.segmentIds) if (!segmentIds.has(segmentId)) issues.push(`Caption track ${caption.id} references missing segment ${segmentId}.`);
    }
    for (const overlay of revision.overlays) if (!isPositiveRange(overlay.startUs, overlay.endUs)) issues.push(`Media overlay ${overlay.id} has an invalid time range.`);
    const graphNodeIds = new Set(revision.graph.nodes.map((node) => node.id));
    if (duplicateIds(revision.graph.nodes).length) issues.push(`Revision ${revision.id} has duplicate graph node ids.`);
    for (const edge of revision.graph.edges) {
      if (!graphNodeIds.has(edge.source) || !graphNodeIds.has(edge.target)) issues.push(`Dependency edge ${edge.id} has a missing graph endpoint.`);
      if (edge.source === edge.target) issues.push(`Dependency edge ${edge.id} cannot link a node to itself.`);
    }
    for (const keep of keeps) {
      const clipNodes = revision.graph.nodes.filter(
        (node) => node.kind === 'clip' && node.cutOperationId === keep.id
      );
      if (clipNodes.length !== 1) {
        issues.push(`Revision ${revision.id} must have exactly one clip node for kept interval ${keep.id}.`);
        continue;
      }
      const clip = clipNodes[0];
      if (!clip.diffs?.length) issues.push(`Clip node ${clip.id} must retain a diff record.`);
      for (const diff of clip.diffs ?? []) if (!diff.id.trim() || !diff.at.trim() || !diff.summary.trim()) {
        issues.push(`Clip node ${clip.id} has an incomplete diff record.`);
      }
    }
    for (const clip of revision.graph.nodes.filter((node) => node.kind === 'clip')) {
      if (!clip.cutOperationId || !keeps.some((keep) => keep.id === clip.cutOperationId)) {
        issues.push(`Clip node ${clip.id} does not reference a kept interval.`);
      }
    }
    if (hasDependencyCycle(revision.graph)) issues.push(`Revision ${revision.id} has a cyclic dependency graph.`);
  }
  for (const proposal of project.proposals) {
    if (!revisionIds.has(proposal.baseRevisionId)) issues.push(`Proposal ${proposal.id} has a missing base revision.`);
    if (!proposal.proposedBy.trim()) issues.push(`Proposal ${proposal.id} has no proposer.`);
    if (!proposal.operations.length) issues.push(`Proposal ${proposal.id} has no edit operations.`);
    if ((proposal.status === 'approved' || proposal.status === 'rejected' || proposal.status === 'applied') && !proposal.decision) issues.push(`Proposal ${proposal.id} has a decision status without a decision receipt.`);
    if (proposal.agentRun && (
      proposal.agentRun.provider !== 'codex-app-server'
      || !proposal.agentRun.threadId.trim()
      || !proposal.agentRun.turnId.trim()
      || !proposal.agentRun.inputSha256.trim()
      || !proposal.agentRun.responseSha256.trim()
    )) issues.push(`Proposal ${proposal.id} has an incomplete managed Codex receipt.`);
  }
  for (const receipt of project.receipts) {
    if (receipt.kind !== 'render') issues.push(`Unsupported receipt kind: ${receipt.kind}.`);
    if (receipt.request.projectId !== project.id) issues.push(`Render receipt ${receipt.id} belongs to a different project.`);
    if (!revisionIds.has(receipt.request.revisionId)) issues.push(`Render receipt ${receipt.id} has a missing revision.`);
    if (!receipt.request.cacheKey.trim() || !receipt.request.timelineHash.trim()) issues.push(`Render receipt ${receipt.id} is missing cache provenance.`);
    if (receipt.status === 'completed') {
      if (!receipt.outputSha256?.trim() || !receipt.inspection) issues.push(`Completed render receipt ${receipt.id} is missing output proof.`);
      if (receipt.inspection && (receipt.inspection.durationUs <= 0 || receipt.inspection.width <= 0 || receipt.inspection.height <= 0 || !receipt.inspection.videoCodec.trim())) {
        issues.push(`Render receipt ${receipt.id} has invalid FFprobe inspection metadata.`);
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

export function proposeTranscriptEdit(project: TranscriptEditorProject, input: ProposeTranscriptEditInput): TranscriptEditorProject {
  assertValidProject(project);
  findRevision(project, input.baseRevisionId);
  if (project.proposals.some((proposal) => proposal.id === input.id)) throw new Error(`Proposal already exists: ${input.id}`);
  if (!input.proposedBy.trim() || !input.rationale.trim() || !input.operations.length) throw new Error('Transcript edit proposals require an author, rationale, and at least one operation.');
  if (input.instruction && (!input.instruction.id.trim() || !input.instruction.text.trim() || !input.instruction.createdAt.trim())) {
    throw new Error('An operator instruction requires an id, text, and timestamp.');
  }
  return { ...project, proposals: [...project.proposals, { id: input.id, baseRevisionId: input.baseRevisionId, proposedBy: input.proposedBy.trim(), rationale: input.rationale.trim(), operations: clone(input.operations), overlays: input.overlays ? clone(input.overlays) : undefined, instruction: input.instruction ? { ...input.instruction, proposalId: input.id } : undefined, agentRun: input.agentRun ? clone(input.agentRun) : undefined, status: 'proposed' }] };
}

export function decideTranscriptEdit(project: TranscriptEditorProject, proposalId: string, input: DecideTranscriptEditInput): TranscriptEditorProject {
  assertValidProject(project);
  const proposal = project.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error(`Unknown transcript edit proposal: ${proposalId}`);
  if (proposal.status !== 'proposed') throw new Error(`Only proposed edits can be decided; received ${proposal.status}.`);
  if (!input.decidedBy.trim()) throw new Error('An operator identity is required to decide a transcript edit.');
  return { ...project, proposals: project.proposals.map((candidate) => candidate.id === proposalId ? { ...candidate, status: input.decision, decision: { decidedAt: input.decidedAt, decidedBy: input.decidedBy.trim(), note: input.note?.trim() || undefined } } : candidate) };
}

export function applyApprovedTranscriptEdit(project: TranscriptEditorProject, input: ApplyTranscriptEditInput): TranscriptEditorProject {
  assertValidProject(project);
  const proposal = project.proposals.find((candidate) => candidate.id === input.proposalId);
  if (!proposal) throw new Error(`Unknown transcript edit proposal: ${input.proposalId}`);
  if (proposal.status !== 'approved') throw new Error(`Transcript edit ${proposal.id} must be approved before it can be applied.`);
  if (project.currentRevisionId !== proposal.baseRevisionId) throw new Error(`Transcript edit ${proposal.id} is stale for current revision ${project.currentRevisionId}.`);
  if (project.revisions.some((revision) => revision.id === input.revisionId)) throw new Error(`Revision already exists: ${input.revisionId}`);
  const base = findRevision(project, proposal.baseRevisionId);
  const baseClipByOperation = new Map(
    base.graph.nodes
      .filter((node) => node.kind === 'clip' && node.cutOperationId)
      .map((node) => [node.cutOperationId as string, node])
  );
  const nextClipNodes: MediaDependencyNode[] = proposal.operations
    .filter((operation) => operation.kind === 'keep')
    .map((operation) => {
      const prior = baseClipByOperation.get(operation.id);
      return {
        id: prior?.id ?? `clip:${operation.id}`,
        kind: 'clip',
        cutOperationId: operation.id,
        diffs: [
          ...(prior?.diffs ?? [{ id: `diff:${operation.id}:created`, at: input.appliedAt, event: 'created' as const, actor: input.appliedBy, summary: 'Clip node created from the approved source cut.', after: { cutOperationId: operation.id, startUs: operation.startUs, endUs: operation.endUs } }]),
          {
            id: `diff:${operation.id}:${proposal.id}`,
            at: input.appliedAt,
            event: 'applied' as const,
            actor: input.appliedBy,
            proposalId: proposal.id,
            summary: proposal.rationale,
            before: prior ? { cutOperationId: prior.cutOperationId } : undefined,
            after: { cutOperationId: operation.id, startUs: operation.startUs, endUs: operation.endUs }
          }
        ]
      };
    });
  const graphNodes = [...base.graph.nodes.filter((node) => node.kind !== 'clip'), ...nextClipNodes];
  const graphNodeIds = new Set(graphNodes.map((node) => node.id));
  const revision: ProjectRevision = {
    ...clone(base),
    id: input.revisionId,
    parentRevisionId: base.id,
    cutList: clone(proposal.operations),
    overlays: proposal.overlays ? clone(proposal.overlays) : clone(base.overlays),
    graph: {
      nodes: graphNodes,
      edges: clone(base.graph.edges).filter((edge) => graphNodeIds.has(edge.source) && graphNodeIds.has(edge.target))
    },
    createdAt: input.appliedAt,
    createdBy: input.appliedBy
  };
  const next = { ...project, currentRevisionId: revision.id, revisions: [...project.revisions, revision], proposals: project.proposals.map((candidate) => candidate.id === input.proposalId ? { ...candidate, status: 'applied' as const } : candidate) };
  assertValidProject(next);
  return next;
}

/**
 * Creates a source-only playback plan for a proposed edit. It never creates a
 * revision or render: callers use the ordered keep ranges to audition what the
 * accepted timeline would contain after this still-unapplied proposal.
 */
export function compileTranscriptProposalAudition(
  project: TranscriptEditorProject,
  proposalId: string
): TranscriptProposalAudition {
  assertValidProject(project);
  const proposal = project.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error(`Unknown transcript edit proposal: ${proposalId}`);
  if (proposal.status !== 'proposed' && proposal.status !== 'approved') {
    throw new Error(`Only proposed or approved edits can be auditioned; received ${proposal.status}.`);
  }
  if (proposal.baseRevisionId !== project.currentRevisionId) {
    throw new Error(`Transcript edit ${proposal.id} is stale for current revision ${project.currentRevisionId}.`);
  }
  const sourceRanges = proposal.operations
    .filter((operation) => operation.kind === 'keep')
    .sort((left, right) => left.startUs - right.startUs)
    .map((operation) => ({ operationId: operation.id, startUs: operation.startUs, endUs: operation.endUs }));
  if (!sourceRanges.length) throw new Error(`Transcript edit ${proposal.id} has no retained source ranges to audition.`);
  return {
    proposalId: proposal.id,
    baseRevisionId: proposal.baseRevisionId,
    durationUs: sourceRanges.reduce((durationUs, range) => durationUs + range.endUs - range.startUs, 0),
    sourceRanges
  };
}

function normalizedFillerTerm(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[.,!?;:()[\]{}'"“”‘’]/g, '');
}

/** Finds reviewable cleanup candidates without proposing or applying an edit. */
export function findTranscriptCleanupCandidates(
  project: TranscriptEditorProject,
  input: FindTranscriptCleanupCandidatesInput = {}
): TranscriptCleanupCandidate[] {
  assertValidProject(project);
  const minPauseUs = input.minPauseUs ?? 750_000;
  if (!Number.isInteger(minPauseUs) || minPauseUs <= 0) {
    throw new Error('Cleanup discovery requires a positive integer minimum pause duration.');
  }
  const fillerTerms = new Set((input.fillerTerms ?? []).map(normalizedFillerTerm).filter(Boolean));
  const segments = [...project.transcriptSegments].sort(
    (left, right) => left.startUs - right.startUs || left.id.localeCompare(right.id)
  );
  const candidates: TranscriptCleanupCandidate[] = [];
  for (const segment of segments) {
    const tokens = segment.words?.length
      ? segment.words
      : [{ id: segment.id, startUs: segment.startUs, endUs: segment.endUs, text: segment.text }];
    for (const token of tokens) {
      const normalized = normalizedFillerTerm(token.text);
      if (!normalized || !fillerTerms.has(normalized)) continue;
      candidates.push({
        id: `filler:${token.id}`,
        kind: 'filler',
        startUs: token.startUs,
        endUs: token.endUs,
        transcriptSegmentIds: [segment.id],
        summary: `Configured filler token: ${normalized}.`
      });
    }
  }
  for (let index = 1; index < segments.length; index += 1) {
    const prior = segments[index - 1];
    const next = segments[index];
    const pauseUs = next.startUs - prior.endUs;
    if (pauseUs < minPauseUs) continue;
    candidates.push({
      id: `pause:${prior.id}:${next.id}`,
      kind: 'long-pause',
      startUs: prior.endUs,
      endUs: next.startUs,
      transcriptSegmentIds: [prior.id, next.id],
      summary: `Long pause: ${(pauseUs / 1_000_000).toFixed(1)} seconds.`
    });
  }
  return candidates.sort(
    (left, right) => left.startUs - right.startUs || left.endUs - right.endUs || left.id.localeCompare(right.id)
  );
}

export function compileTranscriptTimeline(project: TranscriptEditorProject, revisionId = project.currentRevisionId): TimelineProjection {
  assertValidProject(project);
  const revision = findRevision(project, revisionId);
  const segments = new Map(project.transcriptSegments.map((segment) => [segment.id, segment]));
  const clipNodeByOperation = new Map(
    revision.graph.nodes
      .filter((node) => node.kind === 'clip' && node.cutOperationId)
      .map((node) => [node.cutOperationId as string, node.id])
  );
  let cursorUs = 0;
  const videoClips = revision.cutList.filter((operation) => operation.kind === 'keep').sort((left, right) => left.startUs - right.startUs).map((operation) => {
    const durationUs = operation.endUs - operation.startUs;
    const clip: TimelineClip = { id: `video:${operation.id}`, nodeId: clipNodeByOperation.get(operation.id), kind: 'video', startUs: cursorUs, endUs: cursorUs + durationUs, sourceStartUs: operation.startUs, sourceEndUs: operation.endUs, sourceAssetId: segments.get(operation.transcriptSegmentIds[0])?.assetId, transcriptSegmentIds: operation.transcriptSegmentIds };
    cursorUs = clip.endUs;
    return clip;
  });
  const sourceToTimeline = (sourceUs: number): number | undefined => videoClips.reduce<number | undefined>((matched, clip) => matched ?? (clip.sourceStartUs !== undefined && clip.sourceEndUs !== undefined && sourceUs >= clip.sourceStartUs && sourceUs <= clip.sourceEndUs ? clip.startUs + sourceUs - clip.sourceStartUs : undefined), undefined);
  const captionClips: TimelineClip[] = [];
  for (const track of revision.captions) for (const segmentId of track.segmentIds) {
    const segment = segments.get(segmentId);
    if (!segment) continue;
    const startUs = sourceToTimeline(segment.startUs);
    const endUs = sourceToTimeline(segment.endUs);
    if (startUs !== undefined && endUs !== undefined && endUs > startUs) captionClips.push({ id: `caption:${track.id}:${segment.id}`, kind: 'caption', startUs, endUs, transcriptSegmentIds: [segment.id] });
  }
  const overlayClips = revision.overlays.filter((overlay) => overlay.startUs < cursorUs).map((overlay) => ({ id: `overlay:${overlay.id}`, kind: 'overlay' as const, startUs: overlay.startUs, endUs: Math.min(overlay.endUs, cursorUs), overlayId: overlay.id })).filter((overlay) => overlay.endUs > overlay.startUs);
  return { projectId: project.id, revisionId: revision.id, durationUs: cursorUs, clips: [...videoClips, ...captionClips, ...overlayClips] };
}

function formatSrtTimestamp(microseconds: number): string {
  const totalMilliseconds = Math.floor(microseconds / 1_000);
  const milliseconds = totalMilliseconds % 1_000;
  const totalSeconds = Math.floor(totalMilliseconds / 1_000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
    .concat(',', String(milliseconds).padStart(3, '0'));
}

/**
 * Compiles one accepted caption track to SRT. It intentionally derives timing
 * from the accepted timeline rather than source offsets, so cut material
 * cannot appear in an editorial export.
 */
export function compileTranscriptSrt(
  project: TranscriptEditorProject,
  input: CompileTranscriptSrtInput = {}
): string {
  assertValidProject(project);
  const revisionId = input.revisionId ?? project.currentRevisionId;
  const revision = findRevision(project, revisionId);
  const captionTrack = input.captionTrackId
    ? revision.captions.find((track) => track.id === input.captionTrackId)
    : revision.captions.length === 1
      ? revision.captions[0]
      : undefined;
  if (!captionTrack) {
    throw new Error(
      input.captionTrackId
        ? `Unknown caption track: ${input.captionTrackId}`
        : `A caption track id is required when revision ${revision.id} has ${revision.captions.length} tracks.`
    );
  }
  const trackPrefix = `caption:${captionTrack.id}:`;
  const segmentById = new Map(project.transcriptSegments.map((segment) => [segment.id, segment]));
  const captions = compileTranscriptTimeline(project, revision.id).clips
    .filter((clip) => clip.kind === 'caption' && clip.id.startsWith(trackPrefix))
    .flatMap((clip) => {
      const segment = segmentById.get(clip.transcriptSegmentIds?.[0] ?? '');
      return segment ? [{ clip, text: segment.text.trim().replace(/\r\n?/g, '\n') }] : [];
    })
    .filter((caption) => caption.text.length > 0)
    .sort((left, right) => left.clip.startUs - right.clip.startUs || left.clip.id.localeCompare(right.clip.id));
  return captions
    .map(
      ({ clip, text }, index) =>
        `${index + 1}\n${formatSrtTimestamp(clip.startUs)} --> ${formatSrtTimestamp(clip.endUs)}\n${text}\n`
    )
    .join('\n');
}

/** Produces conservative captions for the accepted revision without inventing cut text. */
export function compileEditedTranscriptCaptions(
  project: TranscriptEditorProject,
  revisionId = project.currentRevisionId
): EditedCaptionCue[] {
  assertValidProject(project);
  const revision = findRevision(project, revisionId);
  const keeps = revision.cutList.filter((operation) => operation.kind === 'keep').sort((left, right) => left.startUs - right.startUs);
  const segments = new Map(project.transcriptSegments.map((segment) => [segment.id, segment]));
  const toTimeline = (sourceUs: number): number | undefined => {
    let cursorUs = 0;
    for (const keep of keeps) {
      if (sourceUs >= keep.startUs && sourceUs <= keep.endUs) return cursorUs + sourceUs - keep.startUs;
      cursorUs += keep.endUs - keep.startUs;
    }
    return undefined;
  };
  const cues: EditedCaptionCue[] = [];
  for (const track of revision.captions) for (const segmentId of track.segmentIds) {
    const segment = segments.get(segmentId);
    if (!segment) continue;
    const completeKeep = keeps.find((keep) => segment.startUs >= keep.startUs && segment.endUs <= keep.endUs);
    if (completeKeep) {
      const startUs = toTimeline(segment.startUs);
      const endUs = toTimeline(segment.endUs);
      if (startUs !== undefined && endUs !== undefined && endUs > startUs) cues.push({ id: `${track.id}:${segment.id}`, startUs, endUs, text: segment.text });
      continue;
    }
    for (const keep of keeps) {
      const words = (segment.words ?? []).filter((word) => word.startUs >= keep.startUs && word.endUs <= keep.endUs);
      const first = words[0];
      const last = words.at(-1);
      if (!first || !last) continue;
      const startUs = toTimeline(first.startUs);
      const endUs = toTimeline(last.endUs);
      if (startUs !== undefined && endUs !== undefined && endUs > startUs) cues.push({ id: `${track.id}:${segment.id}:${keep.id}`, startUs, endUs, text: words.map((word) => word.text).join(' ') });
    }
  }
  return cues.sort((left, right) => left.startUs - right.startUs || left.endUs - right.endUs);
}

export function exportEditedTranscriptSrt(project: TranscriptEditorProject, revisionId = project.currentRevisionId): string {
  const cues = compileEditedTranscriptCaptions(project, revisionId);
  return cues.map((cue, index) => [
    String(index + 1), `${formatSrtTimestamp(cue.startUs)} --> ${formatSrtTimestamp(cue.endUs)}`, cue.text
  ].join('\n')).join('\n\n') + (cues.length ? '\n' : '');
}
