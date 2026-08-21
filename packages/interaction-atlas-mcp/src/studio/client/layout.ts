import type { AtlasCanvasNode, AtlasCanvasNodeKind, AtlasSession } from '../types.js';
import { compileTranscriptTimeline, type CutOperation, type TranscriptEditorProject } from '@create-something/atlas-composition';

export type CanvasDetailMode = 'compact' | 'standard' | 'detail';

type ActivitySummary = {
  message: string;
  nodeIds: string[];
};

type TidyUpdate = {
  height?: number;
  id: string;
  width: number;
  x: number;
  y: number;
};

type TidyLayoutOptions = {
  viewportWidth?: number;
};

export type LargeTopologyLayoutNode = TidyUpdate & {
  section: TopologyBoardSectionKey;
};

export type LargeTopologySectionSummary = {
  count: number;
  height: number;
  key: TopologyBoardSectionKey;
  label: string;
  width: number;
  x: number;
  y: number;
};

export type StoryFocusedNodeSummary = {
  id: string;
  label: string;
  kind: AtlasCanvasNodeKind;
  owner: string;
  status: AtlasCanvasNode['status'];
  notes?: string;
  evidence?: string;
  callouts: Array<{ severity: 'decision' | 'info' | 'risk'; text: string }>;
  questions: Array<{ owner?: string; question: string; status: 'answered' | 'open' }>;
};

export type TranscriptEditorSnapshot = {
  source: {
    durationUs: number;
    hasAudio: boolean;
    height: number;
    id: string;
    width: number;
  };
  revision: {
    createdAt: string;
    id: string;
    parentRevisionId: string | null;
  };
  timeline: {
    clips: Array<{
      endUs: number;
      id: string;
      operationId: string;
      startUs: number;
      text: string;
    }>;
    durationUs: number;
  };
  graph: {
    clipNodes: Array<{ id: string; operationId: string | null }>;
    edges: number;
    nodes: number;
  };
  overlays: Array<{ id: string; kind: string; text?: string; startUs: number; endUs: number }>;
  diffs: Array<{
    at: string;
    event: 'applied' | 'approved' | 'created' | 'proposed' | 'rejected' | 'rendered' | 'restored';
    nodeId: string;
    summary: string;
  }>;
  exports: Array<{
    cacheHit: boolean;
    captionSha256: string;
    completedAt: string;
    durationUs: number;
    id: string;
    outputSha256: string;
  }>;
};

export type MediaClipNodePresentation = {
  diffCount: number;
  id: string;
  operation: {
    endUs: number;
    id: string;
    reason: string;
    startUs: number;
  } | null;
  revisionId: string;
  source: {
    hasAudio: boolean;
    height: number;
    id: string;
    width: number;
  } | null;
  transcript: string;
};

export type SrtTranscriptCue = {
  endUs: number;
  startUs: number;
  text: string;
};

function parseSrtTimestamp(value: string): number | null {
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value.trim());
  if (!match) return null;
  const [, hours, minutes, seconds, milliseconds] = match;
  if (Number(minutes) > 59 || Number(seconds) > 59) return null;
  return (
    (Number(hours) * 3_600_000 + Number(minutes) * 60_000 + Number(seconds) * 1_000 + Number(milliseconds)) *
    1_000
  );
}

/** Parses pasted SRT into plain local transcript cues before project creation. */
export function parseSrtTranscriptCues(value: string): SrtTranscriptCue[] {
  const blocks = value
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);
  if (!blocks.length) throw new Error('Paste at least one SRT cue before importing.');
  const cues = blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const rangeIndex = lines.findIndex((line) => line.includes('-->'));
    const range = lines[rangeIndex] ?? '';
    const match = /^(.+?)\s+-->\s+(.+?)(?:\s+.*)?$/.exec(range);
    const startUs = match ? parseSrtTimestamp(match[1]) : null;
    const endUs = match ? parseSrtTimestamp(match[2]) : null;
    if (startUs === null || endUs === null || endUs <= startUs) {
      throw new Error('Each SRT cue needs a valid timestamp range.');
    }
    const text = lines.slice(rangeIndex + 1).join(' ').trim();
    if (!text) throw new Error('Each SRT cue needs transcript text.');
    return { startUs, endUs, text };
  });
  return cues;
}

/** Converts only whole, explicitly selected filler clips into a reviewable removal diff. */
export function cleanupRemovalOperations(
  project: TranscriptEditorProject,
  candidates: Array<{ kind: string; startUs: number; endUs: number; transcriptSegmentIds: string[] }>
): CutOperation[] {
  const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
  if (!revision) throw new Error(`Transcript project is missing current revision ${project.currentRevisionId}.`);
  const removalCandidates =
    candidates
      .filter((candidate) => candidate.kind === 'filler')
      .filter((candidate) => candidate.transcriptSegmentIds.length === 1);
  return revision.cutList.map((operation) => {
    const isWholeClip = operation.kind === 'keep' && operation.transcriptSegmentIds.length === 1 && removalCandidates.some(
      (candidate) => candidate.transcriptSegmentIds[0] === operation.transcriptSegmentIds[0] && candidate.startUs === operation.startUs && candidate.endUs === operation.endUs
    );
    return isWholeClip
      ? { ...operation, kind: 'remove' as const, reason: 'Configured cleanup candidate selected for operator review.' }
      : operation;
  });
}

/**
 * Converts a durable transcript project into the small, read-only editor view.
 * The helper only reads the accepted revision and its graph; proposed work is
 * deliberately left for the later approval surface.
 */
export function buildTranscriptEditorSnapshot(
  project: TranscriptEditorProject
): TranscriptEditorSnapshot {
  const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
  if (!revision) throw new Error(`Transcript project is missing current revision ${project.currentRevisionId}.`);
  const source = project.sourceAssets[0];
  if (!source) throw new Error('Transcript project is missing a source asset.');

  const textBySegmentId = new Map(
    project.transcriptSegments.map((segment) => [segment.id, segment.text])
  );
  const timeline = compileTranscriptTimeline(project, revision.id);
  const clips = timeline.clips
    .filter((clip) => clip.kind === 'video')
    .map((clip) => ({
      endUs: clip.endUs,
      id: clip.id,
      operationId: clip.id.replace(/^video:/, ''),
      startUs: clip.startUs,
      text: (clip.transcriptSegmentIds ?? [])
        .map((segmentId) => textBySegmentId.get(segmentId) ?? segmentId)
        .join(' ')
    }));
  const diffs = revision.graph.nodes
    .flatMap((node) =>
      (node.diffs ?? []).map((diff) => ({
        at: diff.at,
        event: diff.event,
        nodeId: node.id.replace(/^clip:keep:/, 'clip:'),
        summary:
          diff.event === 'created' && diff.summary === 'Clip node created from the timestamped source transcript.'
            ? 'Created from the local transcript source.'
            : diff.summary
      }))
    )
    .sort((left, right) => left.at.localeCompare(right.at) || left.nodeId.localeCompare(right.nodeId));
  const exports = project.receipts
    .filter(
      (receipt) =>
        receipt.status === 'completed' &&
        receipt.request.revisionId === revision.id &&
        Boolean(receipt.outputSha256 && receipt.inspection)
    )
    .map((receipt) => ({
      cacheHit: receipt.cacheHit,
      captionSha256: receipt.request.captionSha256,
      completedAt: receipt.completedAt,
      durationUs: receipt.inspection?.durationUs ?? 0,
      id: receipt.id,
      outputSha256: receipt.outputSha256 ?? ''
    }))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt) || left.id.localeCompare(right.id));

  return {
    source: {
      durationUs: source.media.durationUs,
      hasAudio: source.media.hasAudio,
      height: source.media.height,
      id: source.id,
      width: source.media.width
    },
    revision: {
      createdAt: revision.createdAt,
      id: revision.id,
      parentRevisionId: revision.parentRevisionId
    },
    timeline: { clips, durationUs: timeline.durationUs },
    graph: {
      clipNodes: revision.graph.nodes
        .filter((node) => node.kind === 'clip')
        .map((node) => ({ id: node.id, operationId: node.cutOperationId ?? null })),
      edges: revision.graph.edges.length,
      nodes: revision.graph.nodes.length
    },
    overlays: revision.overlays.map((overlay) => ({ ...overlay })),
    diffs,
    exports
  };
}

/**
 * Projects durable clip nodes into the small, editorial card model used by the
 * local transcript drawer. This remains read-only: source state, accepted
 * revision, and approval state still belong to the persisted project.
 */
export function buildMediaClipNodePresentations(
  project: TranscriptEditorProject
): MediaClipNodePresentation[] {
  const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
  if (!revision) throw new Error(`Transcript project is missing current revision ${project.currentRevisionId}.`);

  const operationById = new Map(revision.cutList.map((operation) => [operation.id, operation]));
  const segmentById = new Map(project.transcriptSegments.map((segment) => [segment.id, segment]));

  return revision.graph.nodes
    .filter((node) => node.kind === 'clip')
    .map((node) => {
      const cutOperation = node.cutOperationId ? operationById.get(node.cutOperationId) : undefined;
      const segments = (cutOperation?.transcriptSegmentIds ?? [])
        .map((segmentId) => segmentById.get(segmentId))
        .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment));
      const sourceAssetId = segments[0]?.assetId;
      const source = sourceAssetId ? project.sourceAssets.find((asset) => asset.id === sourceAssetId) : undefined;

      return {
        diffCount: node.diffs?.length ?? 0,
        id: node.id,
        operation: cutOperation
          ? {
              endUs: cutOperation.endUs,
              id: cutOperation.id,
              reason: cutOperation.reason,
              startUs: cutOperation.startUs
            }
          : null,
        revisionId: revision.id,
        source: source
          ? {
              hasAudio: source.media.hasAudio,
              height: source.media.height,
              id: source.id,
              width: source.media.width
            }
          : null,
        transcript: segments.map((segment) => segment.text).join(' ').trim() || 'No timestamped transcript is available for this clip.'
      };
    });
}

function displayOwner(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const record = value as { name?: unknown; label?: unknown; title?: unknown };
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
    if (typeof record.title === 'string' && record.title.trim()) return record.title.trim();
  }
  return 'Unassigned';
}

const LANE_ORDER: AtlasCanvasNodeKind[] = [
  'actor',
  'data',
  'system',
  'ai',
  'human',
  'constraint',
  'touchpoint'
];

const VISUAL_COLUMNS: Array<{ kinds: AtlasCanvasNodeKind[]; x: number; y: number }> = [
  { kinds: ['actor'], x: 84, y: 198 },
  { kinds: ['data', 'touchpoint'], x: 456, y: 136 },
  { kinds: ['system', 'ai'], x: 828, y: 112 },
  { kinds: ['human', 'constraint'], x: 1200, y: 136 }
];

const COLUMN_GAP = 64;
export const LARGE_MAP_THRESHOLD = 96;
const LARGE_TOPOLOGY_MINIMAP_LIMIT = 180;
const LARGE_MAP_CARD_WIDTH = 176;
const LARGE_MAP_CARD_HEIGHT = 64;
const LARGE_MAP_CARD_GAP_X = 14;
const LARGE_MAP_CARD_GAP_Y = 14;
const LARGE_MAP_SECTION_GAP_X = 132;
const LARGE_MAP_SECTION_GAP_Y = 156;

type TopologySurface =
  | 'repo'
  | 'package'
  | 'app'
  | 'worker'
  | 'client'
  | 'mcp'
  | 'agent'
  | 'policy'
  | 'guide'
  | 'doc'
  | 'config'
  | 'unknown';

export type TopologyBoardSectionKey = 'core' | 'runtime' | 'agent_plane' | 'judgment';

type BoardSection = {
  columns: number;
  key: TopologyBoardSectionKey;
  label: string;
  rank: number;
};

const BOARD_SECTIONS: Record<TopologyBoardSectionKey, BoardSection> = {
  core: { columns: 5, key: 'core', label: 'Core records', rank: 0 },
  runtime: { columns: 7, key: 'runtime', label: 'Runtime workers', rank: 1 },
  agent_plane: { columns: 6, key: 'agent_plane', label: 'MCP / Agents', rank: 2 },
  judgment: { columns: 6, key: 'judgment', label: 'Policy / Canon', rank: 3 }
};

const SURFACE_RANK: Record<TopologySurface, number> = {
  repo: 0,
  client: 1,
  app: 2,
  package: 3,
  worker: 4,
  mcp: 5,
  agent: 6,
  config: 7,
  policy: 8,
  guide: 9,
  doc: 10,
  unknown: 11
};

const KIND_RANK = new Map(LANE_ORDER.map((kind, index) => [kind, index]));
const KIND_COLUMN = new Map<AtlasCanvasNodeKind, { index: number; x: number; y: number }>(
  VISUAL_COLUMNS.flatMap((column, index) =>
    column.kinds.map((kind) => [kind, { index, x: column.x, y: column.y }])
  )
);

function boundedViewportWidth(width?: number): number | undefined {
  if (!Number.isFinite(width) || !width) return undefined;
  return Math.max(360, Math.min(1680, width));
}

function kindColumnForViewport(
  viewportWidth?: number
): Map<AtlasCanvasNodeKind, { index: number; x: number; y: number }> {
  const width = boundedViewportWidth(viewportWidth);
  if (!width || width >= 1360) return KIND_COLUMN;

  if (width < 760) {
    return new Map(
      LANE_ORDER.map((kind) => {
        const column = KIND_COLUMN.get(kind) ?? { index: 0 };
        return [kind, { index: column.index, x: 48, y: 112 }];
      })
    );
  }

  if (width < 1120) {
    const rightX = Math.min(396, Math.max(328, width - 420));
    const columns = [
      { index: 0, kinds: ['actor', 'data', 'touchpoint'] as AtlasCanvasNodeKind[], x: 48, y: 124 },
      {
        index: 1,
        kinds: ['system', 'ai', 'human', 'constraint'] as AtlasCanvasNodeKind[],
        x: rightX,
        y: 124
      }
    ];
    return new Map(columns.flatMap((column) => column.kinds.map((kind) => [kind, column])));
  }

  const left = 64;
  const step = Math.max(300, Math.min(372, (width - left - 340) / 3));
  const columns = VISUAL_COLUMNS.map((column, index) => ({
    ...column,
    x: Math.round(left + step * index)
  }));

  return new Map(
    columns.flatMap((column, index) =>
      column.kinds.map((kind) => [kind, { index, x: column.x, y: column.y }])
    )
  );
}

export function detailModeForZoom(zoom: number): CanvasDetailMode {
  if (zoom < 0.58) return 'compact';
  if (zoom > 1.08) return 'detail';
  return 'standard';
}

export function shouldRenderInteractiveMiniMap(nodeCount: number): boolean {
  return nodeCount <= LARGE_TOPOLOGY_MINIMAP_LIMIT;
}

export function nodeWidthForMode(node: AtlasCanvasNode, mode: CanvasDetailMode): number {
  if (mode === 'compact') {
    return Math.max(208, Math.min(252, node.width || 224));
  }

  const labelLength = node.label.length;
  const noteLength = (node.notes ?? node.evidence ?? '').length;
  const base =
    labelLength > 42 || noteLength > 150 ? 332 : labelLength > 28 || noteLength > 92 ? 302 : 280;

  if (mode === 'detail') {
    return Math.max(316, Math.min(364, Math.max(node.width || 0, base + 24)));
  }

  return Math.max(264, Math.min(332, Math.max(node.width || 0, base)));
}

function topologySurfaceForNode(node: AtlasCanvasNode): TopologySurface {
  const surface = node.notes
    ?.split('|')
    .map((part) => part.trim())
    .find((part) => part in SURFACE_RANK);
  return (surface as TopologySurface | undefined) ?? 'unknown';
}

export function topologyBoardSectionForNode(node: AtlasCanvasNode): TopologyBoardSectionKey {
  const surface = topologySurfaceForNode(node);
  if (surface === 'worker') return 'runtime';
  if (surface === 'mcp' || surface === 'agent' || surface === 'config') return 'agent_plane';
  if (surface === 'policy' || surface === 'guide' || surface === 'doc') return 'judgment';
  return 'core';
}

export function largeTopologyLayoutNodes(session: AtlasSession): LargeTopologyLayoutNode[] {
  const sectionCounts = new Map<TopologyBoardSectionKey, number>();
  for (const node of session.canvas.nodes) {
    const section = topologyBoardSectionForNode(node);
    sectionCounts.set(section, (sectionCounts.get(section) ?? 0) + 1);
  }

  const sectionMetrics = new Map<
    TopologyBoardSectionKey,
    { columns: number; height: number; rows: number; width: number; x: number; y: number }
  >();
  const orderedSections = (Object.values(BOARD_SECTIONS) as BoardSection[]).sort(
    (a, b) => a.rank - b.rank
  );
  const sectionWidth = (columns: number) =>
    columns * LARGE_MAP_CARD_WIDTH + Math.max(0, columns - 1) * LARGE_MAP_CARD_GAP_X;
  const sectionHeight = (rows: number) =>
    rows * LARGE_MAP_CARD_HEIGHT + Math.max(0, rows - 1) * LARGE_MAP_CARD_GAP_Y;

  for (const section of orderedSections) {
    const count = sectionCounts.get(section.key) ?? 0;
    const baselineColumns = section.columns;
    const columns = Math.max(
      baselineColumns,
      Math.min(12, Math.ceil(Math.sqrt(Math.max(1, count) * 1.8)))
    );
    const rows = Math.max(1, Math.ceil(Math.max(1, count) / columns));
    sectionMetrics.set(section.key, {
      columns,
      height: sectionHeight(rows),
      rows,
      width: sectionWidth(columns),
      x: 0,
      y: 0
    });
  }

  const topY = 176;
  const leftX = 96;
  const core = sectionMetrics.get('core');
  const runtime = sectionMetrics.get('runtime');
  const agent = sectionMetrics.get('agent_plane');
  const judgment = sectionMetrics.get('judgment');
  if (core) {
    core.x = leftX;
    core.y = topY;
  }
  if (runtime) {
    runtime.x = leftX + (core?.width ?? 0) + LARGE_MAP_SECTION_GAP_X;
    runtime.y = topY;
  }
  const secondRowY =
    topY + Math.max(core?.height ?? 0, runtime?.height ?? 0) + LARGE_MAP_SECTION_GAP_Y;
  if (agent) {
    agent.x = leftX;
    agent.y = secondRowY;
  }
  if (judgment) {
    judgment.x = leftX + (agent?.width ?? 0) + LARGE_MAP_SECTION_GAP_X;
    judgment.y = secondRowY;
  }

  const sectionIndexes = new Map<TopologyBoardSectionKey, number>();
  const ordered = [...session.canvas.nodes].sort((a, b) => {
    const aSection = BOARD_SECTIONS[topologyBoardSectionForNode(a)];
    const bSection = BOARD_SECTIONS[topologyBoardSectionForNode(b)];
    const sectionDelta = aSection.rank - bSection.rank;
    if (sectionDelta !== 0) return sectionDelta;

    const surfaceDelta =
      SURFACE_RANK[topologySurfaceForNode(a)] - SURFACE_RANK[topologySurfaceForNode(b)];
    if (surfaceDelta !== 0) return surfaceDelta;

    const kindDelta = (KIND_RANK.get(a.kind) ?? 0) - (KIND_RANK.get(b.kind) ?? 0);
    if (kindDelta !== 0) return kindDelta;
    return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
  });

  return ordered.flatMap((node) => {
    const sectionKey = topologyBoardSectionForNode(node);
    const section = sectionMetrics.get(sectionKey);
    if (!section) return [];

    const index = sectionIndexes.get(sectionKey) ?? 0;
    sectionIndexes.set(sectionKey, index + 1);

    const column = index % section.columns;
    const row = Math.floor(index / section.columns);
    const next = {
      height: LARGE_MAP_CARD_HEIGHT,
      id: node.id,
      section: sectionKey,
      width: LARGE_MAP_CARD_WIDTH,
      x: section.x + column * (LARGE_MAP_CARD_WIDTH + LARGE_MAP_CARD_GAP_X),
      y: section.y + row * (LARGE_MAP_CARD_HEIGHT + LARGE_MAP_CARD_GAP_Y)
    };

    return [next];
  });
}

function largeMapNodeUpdates(session: AtlasSession): TidyUpdate[] {
  const nodesById = new Map(session.canvas.nodes.map((node) => [node.id, node]));
  return largeTopologyLayoutNodes(session).flatMap((next) => {
    const node = nodesById.get(next.id);
    if (!node) return [];
    const hasChanged =
      Math.abs(node.x - next.x) > 1 ||
      Math.abs(node.y - next.y) > 1 ||
      Math.abs((node.height || 0) - (next.height ?? 0)) > 1 ||
      Math.abs((node.width || 0) - next.width) > 1;

    if (!hasChanged) return [];
    const { section: _section, ...update } = next;
    return [update];
  });
}

export function largeTopologySectionSummaries(
  session: AtlasSession
): LargeTopologySectionSummary[] {
  const nodes = largeTopologyLayoutNodes(session);
  const summaries = new Map<TopologyBoardSectionKey, LargeTopologySectionSummary>();
  for (const node of nodes) {
    const section = BOARD_SECTIONS[node.section];
    const current = summaries.get(node.section);
    const right = node.x + node.width;
    const bottom = node.y + (node.height ?? LARGE_MAP_CARD_HEIGHT);
    if (!current) {
      summaries.set(node.section, {
        count: 1,
        height: node.height ?? LARGE_MAP_CARD_HEIGHT,
        key: node.section,
        label: section.label,
        width: node.width,
        x: node.x,
        y: node.y
      });
      continue;
    }

    const x = Math.min(current.x, node.x);
    const y = Math.min(current.y, node.y);
    summaries.set(node.section, {
      ...current,
      count: current.count + 1,
      height: Math.max(current.y + current.height, bottom) - y,
      width: Math.max(current.x + current.width, right) - x,
      x,
      y
    });
  }

  return (Object.values(BOARD_SECTIONS) as BoardSection[])
    .sort((a, b) => a.rank - b.rank)
    .flatMap((section) => {
      const summary = summaries.get(section.key);
      return summary ? [summary] : [];
    });
}

function estimatedNodeHeight(node: AtlasCanvasNode, width: number): number {
  const contentWidth = Math.max(180, width - 34);
  const titleCharactersPerLine = Math.max(18, Math.floor(contentWidth / 8.5));
  const noteCharactersPerLine = Math.max(24, Math.floor(contentWidth / 7));
  const titleLines = Math.max(1, Math.ceil(node.label.length / titleCharactersPerLine));
  const note = node.notes ?? node.evidence ?? '';
  const noteLines = note ? Math.min(4, Math.ceil(note.length / noteCharactersPerLine)) : 2;
  const syncAllowance = node.sync ? 10 : 0;
  const estimated = 96 + titleLines * 18 + noteLines * 14 + syncAllowance;
  return Math.max(node.height || 0, estimated, 122);
}

export function agentActivityFromSessionChange(
  previous: AtlasSession | null,
  next: AtlasSession
): ActivitySummary | null {
  if (!previous) return null;

  const previousNodes = new Map(previous.canvas.nodes.map((node) => [node.id, node]));
  const changed = next.canvas.nodes.filter((node) => {
    if (node.createdBy === 'operator') return false;
    const prior = previousNodes.get(node.id);
    if (!prior) return true;
    return prior.updatedAt !== node.updatedAt;
  });

  if (!changed.length) return null;

  const nodeIds = changed.map((node) => node.id);
  const first = changed[0];
  const action = previousNodes.has(first.id) ? 'updated' : 'added';
  const message =
    changed.length === 1
      ? `Agent ${action} ${first.label}`
      : `Agent updated ${changed.length} cards`;

  return { message, nodeIds };
}

export function focusedStoryNodeSummaries(session: AtlasSession): StoryFocusedNodeSummary[] {
  const story = session.story;
  if (!story?.active || !story.focusNodeIds.length) return [];

  const nodesById = new Map(session.canvas.nodes.map((node) => [node.id, node]));
  const calloutsByNode = new Map<string, StoryFocusedNodeSummary['callouts']>();
  for (const callout of story.callouts) {
    if (!callout.nodeId) continue;
    const current = calloutsByNode.get(callout.nodeId) ?? [];
    current.push({ severity: callout.severity, text: callout.text });
    calloutsByNode.set(callout.nodeId, current);
  }

  const questionsByNode = new Map<string, StoryFocusedNodeSummary['questions']>();
  for (const question of story.questions) {
    if (!question.nodeId) continue;
    const current = questionsByNode.get(question.nodeId) ?? [];
    current.push({
      owner: question.owner,
      question: question.question,
      status: question.status
    });
    questionsByNode.set(question.nodeId, current);
  }

  return story.focusNodeIds.flatMap((id) => {
    const node = nodesById.get(id);
    if (!node) return [];
    return [
      {
        id: node.id,
        label: node.label,
        kind: node.kind,
        owner: displayOwner(node.owner),
        status: node.status,
        notes: node.notes,
        evidence: node.evidence,
        callouts: calloutsByNode.get(node.id) ?? [],
        questions: questionsByNode.get(node.id) ?? []
      }
    ];
  });
}

export function storyPresenterNodeIds(session: AtlasSession): Set<string> | null {
  const story = session.story;
  if (!story?.active) return null;

  const ids = new Set(story.focusNodeIds.filter(Boolean));
  const focusEdgeIds = new Set(story.focusEdgeIds);
  for (const edge of session.canvas.edges) {
    if (focusEdgeIds.has(edge.id) || (ids.has(edge.source) && ids.has(edge.target))) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }

  return ids.size ? ids : null;
}

export function intersectNodeIdSets(
  first: Set<string> | null,
  second: Set<string> | null
): Set<string> | null {
  if (!first) return second;
  if (!second) return first;
  const [smaller, larger] = first.size <= second.size ? [first, second] : [second, first];
  const result = new Set<string>();
  for (const id of smaller) {
    if (larger.has(id)) result.add(id);
  }
  return result;
}

export function tidyNodeUpdates(
  session: AtlasSession,
  options: TidyLayoutOptions = {}
): TidyUpdate[] {
  if (session.canvas.nodes.length >= LARGE_MAP_THRESHOLD) {
    return largeMapNodeUpdates(session);
  }

  const cursors = new Map<number, number>();
  const singleColumn = (boundedViewportWidth(options.viewportWidth) ?? Infinity) < 760;
  const kindColumn = kindColumnForViewport(options.viewportWidth);
  const ordered = [...session.canvas.nodes].sort((a, b) => {
    const columnDelta = (kindColumn.get(a.kind)?.index ?? 0) - (kindColumn.get(b.kind)?.index ?? 0);
    if (columnDelta !== 0) return columnDelta;
    if (a.y !== b.y) return a.y - b.y;
    const kindDelta = (KIND_RANK.get(a.kind) ?? 0) - (KIND_RANK.get(b.kind) ?? 0);
    if (kindDelta !== 0) return kindDelta;
    return a.x - b.x;
  });

  return ordered.flatMap((node) => {
    const column = kindColumn.get(node.kind) ?? { index: 0, x: 84, y: 198 };
    const width = nodeWidthForMode(node, 'standard');
    const cursorIndex = singleColumn ? 0 : column.index;
    const y = cursors.get(cursorIndex) ?? column.y;
    cursors.set(cursorIndex, y + estimatedNodeHeight(node, width) + COLUMN_GAP);

    const next = {
      id: node.id,
      width,
      x: column.x,
      y
    };

    const hasChanged =
      Math.abs(node.x - next.x) > 1 ||
      Math.abs(node.y - next.y) > 1 ||
      Math.abs((node.width || 0) - next.width) > 1;

    return hasChanged ? [next] : [];
  });
}
