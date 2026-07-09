import type { AtlasCanvasNode, AtlasCanvasNodeKind, AtlasSession } from '../types.js';

export type CanvasDetailMode = 'compact' | 'standard' | 'detail';

type ActivitySummary = {
  message: string;
  nodeIds: string[];
};

type TidyUpdate = {
  id: string;
  width: number;
  x: number;
  y: number;
};

type TidyLayoutOptions = {
  viewportWidth?: number;
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
const LARGE_MAP_THRESHOLD = 96;
const LARGE_TOPOLOGY_MINIMAP_LIMIT = 180;
const LARGE_MAP_CARD_WIDTH = 232;
const LARGE_MAP_CARD_HEIGHT = 124;
const LARGE_MAP_CARD_GAP_X = 26;
const LARGE_MAP_CARD_GAP_Y = 24;

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
  rank: number;
  x: number;
  y: number;
};

const BOARD_SECTIONS: Record<TopologyBoardSectionKey, BoardSection> = {
  core: { columns: 3, key: 'core', rank: 0, x: 84, y: 168 },
  runtime: { columns: 5, key: 'runtime', rank: 1, x: 940, y: 168 },
  agent_plane: { columns: 4, key: 'agent_plane', rank: 2, x: 2308, y: 168 },
  judgment: { columns: 4, key: 'judgment', rank: 3, x: 3402, y: 168 }
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

function largeMapNodeUpdates(session: AtlasSession): TidyUpdate[] {
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
    const section = BOARD_SECTIONS[topologyBoardSectionForNode(node)];
    const index = sectionIndexes.get(section.key) ?? 0;
    sectionIndexes.set(section.key, index + 1);

    const column = index % section.columns;
    const row = Math.floor(index / section.columns);
    const next = {
      id: node.id,
      width: LARGE_MAP_CARD_WIDTH,
      x: section.x + column * (LARGE_MAP_CARD_WIDTH + LARGE_MAP_CARD_GAP_X),
      y: section.y + row * (LARGE_MAP_CARD_HEIGHT + LARGE_MAP_CARD_GAP_Y)
    };

    const hasChanged =
      Math.abs(node.x - next.x) > 1 ||
      Math.abs(node.y - next.y) > 1 ||
      Math.abs((node.width || 0) - next.width) > 1;

    return hasChanged ? [next] : [];
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
