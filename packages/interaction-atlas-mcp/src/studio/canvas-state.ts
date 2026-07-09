import {
  CANVAS_KERNEL_RENDERER,
  SHARED_CANVAS_STATE_VERSION,
  type SharedCanvasEdge,
  type SharedCanvasLevelOfDetail,
  type SharedCanvasNode,
  type SharedCanvasState,
  type SharedCanvasViewport
} from '@create-something/canvas-kernel/shared-canvas-state';

import { topologyBoardSectionForNode, type TopologyBoardSectionKey } from './client/layout.js';
import { readSession, writeSession } from './store.js';
import type { AtlasSession } from './types.js';

const KNOWN_LENSES = new Set<string>(['all', 'core', 'runtime', 'agent_plane', 'judgment']);

export type AtlasCanvasStatePatch = {
  focusedNodeIds?: string[];
  lens?: string;
  query?: string;
  selectedNodeId?: string | null;
  storyStepId?: string | null;
  viewport?: Partial<SharedCanvasViewport>;
};

function now(): string {
  return new Date().toISOString();
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lodForZoom(zoom: number): SharedCanvasLevelOfDetail {
  if (zoom < 0.18) return 'skeleton';
  if (zoom < 0.58) return 'compact';
  return 'detail';
}

function normalizeViewport(input?: Partial<SharedCanvasViewport>): SharedCanvasViewport {
  const zoom = clamp(finiteNumber(input?.zoom, 1), 0.05, 2);
  return {
    x: finiteNumber(input?.x, 0),
    y: finiteNumber(input?.y, 0),
    width: Math.max(0, finiteNumber(input?.width, 0)),
    height: Math.max(0, finiteNumber(input?.height, 0)),
    zoom,
    limit: Math.max(1, Math.min(2000, Math.floor(finiteNumber(input?.limit, 250)))),
    lod: input?.lod ?? lodForZoom(zoom)
  };
}

function normalizeQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 240) : '';
}

function normalizeLens(value: unknown): string {
  const lens = typeof value === 'string' && value.trim() ? value.trim() : 'all';
  return KNOWN_LENSES.has(lens) ? lens : 'all';
}

function normalizeNodeId(
  value: unknown,
  nodeIds: Set<string>,
  fallback: string | null = null
): string | null {
  if (value === null) return null;
  return typeof value === 'string' && nodeIds.has(value) ? value : fallback;
}

function normalizeNodeIds(values: unknown, nodeIds: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))].filter(
    (value) => nodeIds.has(value)
  );
}

function storyFocusNodeIds(session: AtlasSession, storyStepId: string | null): string[] {
  const story = session.story;
  if (!story?.active) return [];
  const step = storyStepId ? story.steps.find((item) => item.id === storyStepId) : undefined;
  const focus = step?.focusNodeIds?.length ? step.focusNodeIds : story.focusNodeIds;
  const nodeIds = new Set(session.canvas.nodes.map((node) => node.id));
  return [...new Set(focus ?? [])].filter((nodeId) => nodeIds.has(nodeId));
}

function nodeMatchesQuery(node: AtlasSession['canvas']['nodes'][number], query: string): boolean {
  if (!query) return true;
  const haystack = [
    node.id,
    node.atlasId,
    node.kind,
    node.label,
    node.owner,
    node.status,
    node.notes,
    node.evidence
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function lensMatchesNode(node: AtlasSession['canvas']['nodes'][number], lens: string): boolean {
  if (lens === 'all') return true;
  return topologyBoardSectionForNode(node) === (lens as TopologyBoardSectionKey);
}

function sharedNode(node: AtlasSession['canvas']['nodes'][number]): SharedCanvasNode {
  return {
    id: node.id,
    atlasId: node.atlasId,
    sourceRecordId: node.atlasId ?? node.id,
    label: node.label,
    kind: node.kind,
    status: node.status,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    owner: node.owner,
    tier: node.kind,
    surface: node.notes?.split('|').map((part) => part.trim()).find(Boolean),
    path: node.bindings?.find((binding) => binding.kind === 'repo_path')?.source
  };
}

function sharedEdge(edge: AtlasSession['canvas']['edges'][number]): SharedCanvasEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    evidence: edge.evidence ?? edge.label ?? edge.id
  };
}

function baseCanvasState(session: AtlasSession): AtlasCanvasStatePatch {
  const persisted = session.canvasState;
  return {
    focusedNodeIds:
      persisted?.focusedNodeIds ??
      storyFocusNodeIds(session, persisted?.storyStepId ?? session.story?.activeStepId ?? null),
    lens: persisted?.lens ?? 'all',
    query: persisted?.query ?? '',
    selectedNodeId: persisted?.selectedNodeId ?? null,
    storyStepId: persisted?.storyStepId ?? session.story?.activeStepId ?? null,
    viewport: persisted?.viewport
  };
}

export function buildSharedCanvasState(
  session: AtlasSession,
  patch: AtlasCanvasStatePatch = {}
): SharedCanvasState {
  const nodeIds = new Set(session.canvas.nodes.map((node) => node.id));
  const base = baseCanvasState(session);
  const lens = normalizeLens(patch.lens ?? base.lens);
  const query = normalizeQuery(patch.query ?? base.query);
  const storyStepId = normalizeNodeId(patch.storyStepId ?? base.storyStepId, new Set(session.story?.steps.map((step) => step.id) ?? []));
  const fallbackFocus = storyFocusNodeIds(session, storyStepId);
  const focusedNodeIds = normalizeNodeIds(
    patch.focusedNodeIds ?? base.focusedNodeIds ?? fallbackFocus,
    nodeIds
  );
  const selectedNodeId = normalizeNodeId(patch.selectedNodeId ?? base.selectedNodeId, nodeIds);
  const viewport = normalizeViewport({ ...base.viewport, ...patch.viewport });
  const visibleNodeIds = session.canvas.nodes
    .filter((node) => lensMatchesNode(node, lens))
    .filter((node) => nodeMatchesQuery(node, query))
    .filter((node) => !focusedNodeIds.length || focusedNodeIds.includes(node.id))
    .map((node) => node.id);
  const visibleNodeIdSet = new Set(visibleNodeIds);
  const visibleEdges = session.canvas.edges.filter(
    (edge) => visibleNodeIdSet.has(edge.source) && visibleNodeIdSet.has(edge.target)
  );

  return {
    version: SHARED_CANVAS_STATE_VERSION,
    id: `${session.id}:canvas-state`,
    topologyId: session.id,
    atlasCanvasId: `atlas-session:${session.id}`,
    sessionId: session.id,
    renderer: CANVAS_KERNEL_RENDERER,
    source: 'atlas-session',
    generatedAt: now(),
    lens,
    query,
    storyStepId,
    selectedNodeId,
    focusedNodeIds,
    viewport,
    counts: {
      totalNodes: session.canvas.nodes.length,
      totalEdges: session.canvas.edges.length,
      candidateNodes: session.canvas.nodes.filter((node) => lensMatchesNode(node, lens)).length,
      visibleNodes: visibleNodeIds.length,
      visibleEdges: visibleEdges.length,
      omittedNodes: Math.max(0, session.canvas.nodes.length - visibleNodeIds.length),
      omittedEdges: Math.max(0, session.canvas.edges.length - visibleEdges.length)
    },
    visibleNodeIds,
    visibleEdgeIds: visibleEdges.map((edge) => edge.id),
    nodes: session.canvas.nodes.filter((node) => visibleNodeIdSet.has(node.id)).map(sharedNode),
    edges: visibleEdges.map(sharedEdge),
    joins: session.canvas.nodes.map((node) => ({
      substrateRecordId: node.atlasId ?? node.id,
      topologyNodeId: node.id,
      atlasCanvasId: `atlas-session:${session.id}`,
      atlasNodeId: node.id
    })),
    endpoints: {
      canvasState: `/api/sessions/${encodeURIComponent(session.id)}/canvas-state`,
      atlasSession: `/api/sessions/${encodeURIComponent(session.id)}`,
      atlasViewport: `/sessions/${encodeURIComponent(session.id)}`,
      topology: `/api/sessions/${encodeURIComponent(session.id)}`,
      records: `/api/sessions/${encodeURIComponent(session.id)}/database-health`
    }
  };
}

export async function readSharedCanvasState(
  sessionId: string,
  cwd = process.cwd()
): Promise<SharedCanvasState> {
  return buildSharedCanvasState(await readSession(sessionId, cwd));
}

export async function updateSharedCanvasState(
  sessionId: string,
  patch: AtlasCanvasStatePatch,
  cwd = process.cwd()
): Promise<SharedCanvasState> {
  const session = await readSession(sessionId, cwd);
  const next = buildSharedCanvasState(session, patch);
  session.canvasState = next;
  await writeSession(session, cwd);
  return next;
}
