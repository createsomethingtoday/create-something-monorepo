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

const KIND_RANK = new Map(LANE_ORDER.map((kind, index) => [kind, index]));
const KIND_COLUMN = new Map<AtlasCanvasNodeKind, { index: number; x: number; y: number }>(
  VISUAL_COLUMNS.flatMap((column, index) => column.kinds.map((kind) => [kind, { index, x: column.x, y: column.y }]))
);

export function detailModeForZoom(zoom: number): CanvasDetailMode {
  if (zoom < 0.58) return 'compact';
  if (zoom > 1.08) return 'detail';
  return 'standard';
}

export function nodeWidthForMode(node: AtlasCanvasNode, mode: CanvasDetailMode): number {
  if (mode === 'compact') {
    return Math.max(208, Math.min(252, node.width || 224));
  }

  const labelLength = node.label.length;
  const noteLength = (node.notes ?? node.evidence ?? '').length;
  const base = labelLength > 42 || noteLength > 150 ? 332 : labelLength > 28 || noteLength > 92 ? 302 : 280;

  if (mode === 'detail') {
    return Math.max(316, Math.min(364, Math.max(node.width || 0, base + 24)));
  }

  return Math.max(264, Math.min(332, Math.max(node.width || 0, base)));
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
    changed.length === 1 ? `Agent ${action} ${first.label}` : `Agent updated ${changed.length} cards`;

  return { message, nodeIds };
}

export function tidyNodeUpdates(session: AtlasSession): TidyUpdate[] {
  const cursors = new Map<number, number>();
  const ordered = [...session.canvas.nodes].sort((a, b) => {
    const columnDelta = (KIND_COLUMN.get(a.kind)?.index ?? 0) - (KIND_COLUMN.get(b.kind)?.index ?? 0);
    if (columnDelta !== 0) return columnDelta;
    if (a.y !== b.y) return a.y - b.y;
    const kindDelta = (KIND_RANK.get(a.kind) ?? 0) - (KIND_RANK.get(b.kind) ?? 0);
    if (kindDelta !== 0) return kindDelta;
    return a.x - b.x;
  });

  return ordered.flatMap((node) => {
    const column = KIND_COLUMN.get(node.kind) ?? { index: 0, x: 84, y: 198 };
    const width = nodeWidthForMode(node, 'standard');
    const y = cursors.get(column.index) ?? column.y;
    cursors.set(column.index, y + estimatedNodeHeight(node, width) + COLUMN_GAP);

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
