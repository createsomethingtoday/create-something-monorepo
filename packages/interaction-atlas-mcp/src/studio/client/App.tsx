import '@xyflow/react/dist/style.css';
import './styles.css';

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport
} from '@xyflow/react';
import {
  Blocks,
  Bot,
  Braces,
  Check,
  Clipboard,
  Database,
  FileText,
  LockKeyhole,
  Map,
  MessagesSquare,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Radio,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Terminal,
  UserRound,
  Waypoints,
  Workflow,
  X,
  type LucideIcon
} from 'lucide-react';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { createRoot } from 'react-dom/client';

import type {
  AtlasCanvasNode,
  AtlasCanvasNodeKind,
  AtlasCanvasNodeStatus,
  AtlasPaletteItem,
  AtlasSession
} from '../types.js';

type AtlasNodeData = {
  node: AtlasCanvasNode;
};

type FlowNode = Node<AtlasNodeData, 'atlas'>;

type Palette = Record<AtlasCanvasNodeKind, AtlasPaletteItem[]>;

type NodeDraft = {
  label: string;
  owner: string;
  status: AtlasCanvasNodeStatus;
  notes: string;
  evidence: string;
};

const KIND_ICONS: Record<AtlasCanvasNodeKind, LucideIcon> = {
  actor: UserRound,
  human: ShieldAlert,
  ai: Bot,
  system: Workflow,
  data: Database,
  constraint: LockKeyhole,
  touchpoint: Waypoints
};

const KIND_ORDER: AtlasCanvasNodeKind[] = [
  'actor',
  'human',
  'ai',
  'system',
  'data',
  'constraint',
  'touchpoint'
];

const STATUS_OPTIONS: AtlasCanvasNodeStatus[] = ['unknown', 'run', 'wait', 'stop'];

const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#a7a7a0',
    width: 13,
    height: 13
  },
  interactionWidth: 18,
  style: {
    stroke: '#a7a7a0',
    strokeWidth: 1.05
  }
};

const FIT_VIEW_OPTIONS = {
  duration: 260,
  maxZoom: 1.08,
  padding: 0.24
};

function formatKind(kind: AtlasCanvasNodeKind): string {
  return kind === 'ai' ? 'AI' : kind;
}

function formatClient(client: string): string {
  const label = client.replace(/^CREATE SOMETHING\s*/i, '').trim();
  return label || client;
}

function nodeWidth(node: AtlasCanvasNode): number {
  const labelLength = node.label.length;
  const noteLength = (node.notes ?? node.evidence ?? '').length;
  if (labelLength > 42 || noteLength > 150) return 332;
  if (labelLength > 28 || noteLength > 92) return 302;
  return Math.max(264, Math.min(310, node.width || 280));
}

function toFlowNodes(session: AtlasSession, selectedNodeId: string | null): FlowNode[] {
  return session.canvas.nodes.map((node) => ({
    id: node.id,
    type: 'atlas',
    position: { x: node.x, y: node.y },
    data: { node },
    selected: node.id === selectedNodeId,
    style: { width: nodeWidth(node) }
  }));
}

function toFlowEdges(session: AtlasSession): Edge[] {
  return session.canvas.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    labelBgPadding: [7, 4],
    labelBgBorderRadius: 5,
    labelBgStyle: { fill: '#f9f9f9', fillOpacity: 0.92 },
    labelStyle: {
      fill: '#787878',
      fontSize: 11,
      fontWeight: 400
    },
    ...DEFAULT_EDGE_OPTIONS
  }));
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function getSessionId(): string {
  return location.pathname.match(/\/sessions\/([^/]+)/)?.[1] ?? '';
}

function readStoredViewport(sessionId: string): Viewport | undefined {
  try {
    const raw = localStorage.getItem(`atlas-studio:${sessionId}:viewport`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Viewport;
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function CubeMark({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 32 32" focusable="false" aria-hidden="true">
      <path d="M16 4 26.39 10 16 16 5.61 10Z" fill="currentColor" />
      <path d="M5.61 10 16 16 16 28 5.61 22Z" fill="currentColor" fillOpacity="0.6" />
      <path d="M16 16 26.39 10 26.39 22 16 28Z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function IconButton({
  active = false,
  children,
  icon: Icon,
  onClick,
  title
}: {
  active?: boolean;
  children: React.ReactNode;
  icon: LucideIcon;
  onClick: () => void;
  title?: string;
}): React.ReactElement {
  return (
    <button
      aria-pressed={active}
      className="toolbar-button"
      onClick={onClick}
      title={title}
      type="button"
    >
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

const AtlasFlowNode = memo(function AtlasFlowNode({
  data,
  selected
}: NodeProps<FlowNode>): React.ReactElement {
  const node = data.node;
  const Icon = KIND_ICONS[node.kind];
  const note = node.notes || node.evidence || 'Boundary and evidence can be added here.';
  const owner = node.owner || node.createdBy || 'agent';

  return (
    <article className={`atlas-node kind-${node.kind} ${selected ? 'selected' : ''}`}>
      <Handle className="atlas-handle target" position={Position.Left} type="target" />
      <Handle className="atlas-handle source" position={Position.Right} type="source" />
      <div className="node-topline">
        <span className="node-kind">
          <Icon aria-hidden="true" />
          <span>{formatKind(node.kind)}</span>
        </span>
        <span className={`node-status ${node.status}`}>{node.status}</span>
      </div>
      <strong className="node-title">{node.label}</strong>
      <div className="node-meta">
        <span>{owner}</span>
        <p>{note}</p>
      </div>
    </article>
  );
});

const NODE_TYPES = {
  atlas: AtlasFlowNode
};

function Rail({
  onAcceptSuggestion,
  onAddObservation,
  onClose,
  open,
  session
}: {
  onAcceptSuggestion: (suggestionId: string) => void;
  onAddObservation: (text: string) => void;
  onClose: () => void;
  open: boolean;
  session: AtlasSession | null;
}): React.ReactElement {
  const [observation, setObservation] = useState('');
  const queued = useMemo(
    () => session?.suggestions.filter((item) => item.status === 'queued') ?? [],
    [session]
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = observation.trim();
    if (!text) return;
    setObservation('');
    onAddObservation(text);
  };

  return (
    <aside className={`drawer call-rail ${open ? 'open' : ''}`} aria-label="Call rail">
      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <MessagesSquare aria-hidden="true" />
            </span>
            <span>
              <strong>Call Rail</strong>
              <em>Live notes and agent suggestions</em>
            </span>
          </span>
          <button className="icon-only" onClick={onClose} title="Close rail" type="button">
            <X aria-hidden="true" />
          </button>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>
            <span>Observation</span>
            <textarea
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Capture what the client says. Mention approval, data, systems, risk, or touchpoints."
              value={observation}
            />
          </label>
          <button className="primary" type="submit">
            <Plus aria-hidden="true" />
            <span>Add observation</span>
          </button>
        </form>
      </section>

      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <span>
              <strong>Suggestions</strong>
              <em>Review before truth</em>
            </span>
          </span>
          <span className="count-chip">{queued.length}</span>
        </div>
        <div className="rail-list">
          {queued.length ? (
            queued.slice(0, 12).map((suggestion) => {
              const Icon = KIND_ICONS[suggestion.payload.kind];
              return (
                <article className="rail-item" key={suggestion.id}>
                  <div className="rail-item-title">
                    <span>
                      <Icon aria-hidden="true" />
                      <strong>{suggestion.payload.label}</strong>
                    </span>
                    <span className={`status-chip ${suggestion.payload.status}`}>
                      {formatKind(suggestion.payload.kind)}
                    </span>
                  </div>
                  <p>{suggestion.reason}</p>
                  <button
                    className="subtle-button"
                    onClick={() => onAcceptSuggestion(suggestion.id)}
                    type="button"
                  >
                    <Check aria-hidden="true" />
                    <span>Accept</span>
                  </button>
                </article>
              );
            })
          ) : (
            <p className="empty">
              No queued suggestions yet. Add observations from the call or let Codex write to the
              session.
            </p>
          )}
        </div>
      </section>

      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <NotebookTabs aria-hidden="true" />
            </span>
            <span>
              <strong>Recent Notes</strong>
              <em>Shared session memory</em>
            </span>
          </span>
        </div>
        <div className="rail-list">
          {session?.observations.length ? (
            session.observations.slice(0, 10).map((item) => {
              const Icon = item.source === 'agent' ? Bot : UserRound;
              return (
                <article className="rail-item note" key={item.id}>
                  <div className="rail-item-title">
                    <span>
                      <Icon aria-hidden="true" />
                      <strong>{item.source}</strong>
                    </span>
                  </div>
                  <p>{item.text}</p>
                </article>
              );
            })
          ) : (
            <p className="empty">No observations captured yet.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

function Inspector({
  draft,
  onAddNode,
  onChangeDraft,
  onClose,
  onSave,
  open,
  palette,
  selectedNode,
  sessionId
}: {
  draft: NodeDraft | null;
  onAddNode: (kind: AtlasCanvasNodeKind) => void;
  onChangeDraft: (draft: NodeDraft) => void;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
  palette: Palette | null;
  selectedNode: AtlasCanvasNode | null;
  sessionId: string;
}): React.ReactElement {
  const command = `pnpm atlas:studio observe --session ${sessionId} --suggest --text "client says..."`;

  return (
    <aside className={`drawer inspector ${open ? 'open' : ''}`} aria-label="Inspector">
      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <ScanLine aria-hidden="true" />
            </span>
            <span>
              <strong>Inspector</strong>
              <em>{selectedNode?.id ?? 'Select a node'}</em>
            </span>
          </span>
          <button className="icon-only" onClick={onClose} title="Close inspector" type="button">
            <X aria-hidden="true" />
          </button>
        </div>

        {draft && selectedNode ? (
          <div className="field-grid">
            <label>
              <span>Label</span>
              <input
                onChange={(event) => onChangeDraft({ ...draft, label: event.target.value })}
                value={draft.label}
              />
            </label>
            <label>
              <span>Owner</span>
              <input
                onChange={(event) => onChangeDraft({ ...draft, owner: event.target.value })}
                value={draft.owner}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                onChange={(event) =>
                  onChangeDraft({
                    ...draft,
                    status: event.target.value as AtlasCanvasNodeStatus
                  })
                }
                value={draft.status}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea
                onChange={(event) => onChangeDraft({ ...draft, notes: event.target.value })}
                value={draft.notes}
              />
            </label>
            <label>
              <span>Evidence</span>
              <textarea
                onChange={(event) => onChangeDraft({ ...draft, evidence: event.target.value })}
                value={draft.evidence}
              />
            </label>
            <button className="primary" onClick={onSave} type="button">
              <Check aria-hidden="true" />
              <span>Save node</span>
            </button>
          </div>
        ) : (
          <p className="empty">
            Select a canvas node to edit label, owner, status, notes, and evidence.
          </p>
        )}
      </section>

      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <Blocks aria-hidden="true" />
            </span>
            <span>
              <strong>Palette</strong>
              <em>Add Atlas primitives</em>
            </span>
          </span>
        </div>
        <div className="palette">
          {KIND_ORDER.map((kind) => {
            const Icon = KIND_ICONS[kind];
            return (
              <button key={kind} onClick={() => onAddNode(kind)} type="button">
                <Icon aria-hidden="true" />
                <span>{formatKind(kind)}</span>
              </button>
            );
          })}
        </div>
        {palette ? (
          <p className="palette-meta">
            {KIND_ORDER.reduce((count, kind) => count + (palette[kind]?.length ?? 0), 0)} Atlas
            records available.
          </p>
        ) : null}
      </section>

      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <Terminal aria-hidden="true" />
            </span>
            <span>
              <strong>Agent Console</strong>
              <em>Terminal mutation path</em>
            </span>
          </span>
        </div>
        <pre className="terminal">{command}</pre>
      </section>
    </aside>
  );
}

function AtlasStudio(): React.ReactElement {
  const sessionId = useMemo(getSessionId, []);
  const [session, setSession] = useState<AtlasSession | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draft, setDraft] = useState<NodeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flowRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const lastRevision = useRef<string | null>(null);

  const edges = useMemo(() => (session ? toFlowEdges(session) : []), [session]);
  const selectedNode = useMemo(
    () => session?.canvas.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, session]
  );
  const queuedCount = session?.suggestions.filter((item) => item.status === 'queued').length ?? 0;
  const counts = `${session?.canvas.nodes.length ?? 0} nodes / ${session?.canvas.edges.length ?? 0} edges`;
  const sessionTitle = session
    ? `${formatClient(session.client)} / ${session.workflow}`
    : 'Loading session...';

  const loadSession = useCallback(async () => {
    const next = await requestJson<AtlasSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
    setSession((previous) => (previous?.updatedAt === next.updatedAt ? previous : next));
    setError(null);
  }, [sessionId]);

  const patchNode = useCallback(
    async (nodeId: string, payload: Partial<AtlasCanvasNode>) => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/nodes/${encodeURIComponent(nodeId)}`,
        {
          body: JSON.stringify(payload),
          method: 'PATCH'
        }
      );
      setSession(next);
      setError(null);
    },
    [sessionId]
  );

  useEffect(() => {
    void loadSession();
    void requestJson<Palette>('/api/palette').then(setPalette).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [loadSession]);

  useEffect(() => {
    if (!session) return;
    const isNewRevision = lastRevision.current !== session.updatedAt;
    lastRevision.current = session.updatedAt;
    if (isNewRevision) setNodes(toFlowNodes(session, selectedNodeId));
  }, [selectedNodeId, session]);

  useEffect(() => {
    if (!selectedNode) {
      setDraft(null);
      return;
    }
    setDraft({
      evidence: selectedNode.evidence ?? '',
      label: selectedNode.label,
      notes: selectedNode.notes ?? '',
      owner: selectedNode.owner ?? '',
      status: selectedNode.status
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!('EventSource' in window) || !sessionId) {
      const timer = window.setInterval(() => void loadSession(), 1000);
      return () => window.clearInterval(timer);
    }

    const events = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    events.addEventListener('session', (event) => {
      const next = JSON.parse((event as MessageEvent).data) as AtlasSession;
      setSession((previous) => (previous?.updatedAt === next.updatedAt ? previous : next));
    });
    events.addEventListener('error', () => {
      events.close();
      const timer = window.setInterval(() => void loadSession(), 1000);
      window.setTimeout(() => window.clearInterval(timer), 15_000);
    });

    return () => events.close();
  }, [loadSession, sessionId]);

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onNodeClick = useCallback<NodeMouseHandler<FlowNode>>((_, node) => {
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: FlowNode) => {
      const original = session?.canvas.nodes.find((item) => item.id === node.id);
      if (!original) return;
      const x = Math.round(node.position.x);
      const y = Math.round(node.position.y);
      if (x === original.x && y === original.y) return;
      void patchNode(node.id, { x, y });
    },
    [patchNode, session]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/edges`,
        {
          body: JSON.stringify({
            createdBy: 'operator',
            label: 'relates to',
            source: connection.source,
            target: connection.target
          }),
          method: 'POST'
        }
      );
      setSession(next);
    },
    [sessionId]
  );

  const onMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      localStorage.setItem(`atlas-studio:${sessionId}:viewport`, JSON.stringify(viewport));
    },
    [sessionId]
  );

  const addObservation = useCallback(
    async (text: string) => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/observations`,
        {
          body: JSON.stringify({ source: 'agent', suggest: true, text }),
          method: 'POST'
        }
      );
      setSession(next);
      setRailOpen(true);
    },
    [sessionId]
  );

  const acceptSuggestion = useCallback(
    async (suggestionId: string) => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/suggestions/${encodeURIComponent(
          suggestionId
        )}/accept`,
        {
          body: '{}',
          method: 'POST'
        }
      );
      const newest = next.canvas.nodes.at(-1);
      setSelectedNodeId(newest?.id ?? null);
      setSession(next);
      setInspectorOpen(true);
    },
    [sessionId]
  );

  const addNode = useCallback(
    async (kind: AtlasCanvasNodeKind) => {
      const viewport = flowRef.current?.getViewport();
      const center = flowRef.current?.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/nodes`,
        {
          body: JSON.stringify({
            createdBy: 'operator',
            kind,
            x: center ? Math.round(center.x) : undefined,
            y: center ? Math.round(center.y) : undefined
          }),
          method: 'POST'
        }
      );
      void viewport;
      const newest = next.canvas.nodes.at(-1);
      setSelectedNodeId(newest?.id ?? null);
      setSession(next);
      setInspectorOpen(true);
    },
    [sessionId]
  );

  const saveDraft = useCallback(() => {
    if (!selectedNode || !draft) return;
    void patchNode(selectedNode.id, {
      evidence: draft.evidence,
      label: draft.label,
      notes: draft.notes,
      owner: draft.owner,
      status: draft.status
    });
  }, [draft, patchNode, selectedNode]);

  const fitCanvas = useCallback(() => {
    void flowRef.current?.fitView(FIT_VIEW_OPTIONS);
  }, []);

  const copyCommand = useCallback(async () => {
    const command = `pnpm atlas:studio observe --session ${sessionId} --suggest --text "client says..."`;
    await navigator.clipboard?.writeText(command);
  }, [sessionId]);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="brand">
          <span className="brand-mark">
            <CubeMark />
          </span>
          <span className="brand-copy">
            <strong>Atlas Studio</strong>
            <span>{sessionTitle}</span>
          </span>
        </div>
        <div className="session-chips" aria-label="Session state">
          <span className="count-chip">
            <Radio aria-hidden="true" />
            <span>Agent live</span>
          </span>
          <span className="count-chip">{queuedCount} queued</span>
        </div>
        <div className="toolbar">
          <IconButton
            active={railOpen}
            icon={railOpen ? PanelLeftClose : PanelLeftOpen}
            onClick={() => setRailOpen((value) => !value)}
            title="Toggle rail"
          >
            Rail
          </IconButton>
          <IconButton
            active={inspectorOpen}
            icon={inspectorOpen ? PanelRightClose : PanelRightOpen}
            onClick={() => setInspectorOpen((value) => !value)}
            title="Toggle inspector"
          >
            Inspector
          </IconButton>
          <IconButton icon={Map} onClick={fitCanvas} title="Fit map">
            Fit
          </IconButton>
          <IconButton icon={RefreshCw} onClick={() => void loadSession()} title="Refresh session">
            Refresh
          </IconButton>
          <IconButton icon={Clipboard} onClick={() => void copyCommand()} title="Copy command">
            Copy command
          </IconButton>
        </div>
      </header>

      <main className="studio-main">
        <ReactFlowProvider>
          <div className="canvas-stage" aria-label="Atlas workflow canvas">
            <ReactFlow
              attributionPosition="bottom-left"
              colorMode="light"
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              defaultViewport={readStoredViewport(sessionId)}
              deleteKeyCode={null}
              edges={edges}
              elevateEdgesOnSelect={false}
              fitView={!readStoredViewport(sessionId)}
              fitViewOptions={FIT_VIEW_OPTIONS}
              maxZoom={1.8}
              minZoom={0.18}
              nodeClickDistance={6}
              nodeDragThreshold={8}
              nodeTypes={NODE_TYPES}
              nodes={nodes}
              nodesConnectable
              nodesDraggable
              onConnect={onConnect}
              onInit={(instance) => {
                flowRef.current = instance;
              }}
              onMoveEnd={onMoveEnd}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              onNodesChange={onNodesChange}
              onPaneClick={onPaneClick}
              onlyRenderVisibleElements={nodes.length > 80}
              panOnDrag
              panOnScroll
              panOnScrollSpeed={0.65}
              preventScrolling
              proOptions={{ hideAttribution: true }}
              snapGrid={[12, 12]}
              snapToGrid
              zoomOnDoubleClick={false}
              zoomOnPinch
              zoomOnScroll
            >
              <Background
                color="#dcdcd6"
                gap={36}
                lineWidth={0.6}
                variant={BackgroundVariant.Lines}
              />
              <Controls className="flow-controls" showInteractive={false} />
              <MiniMap
                className="flow-minimap"
                maskColor="#f7f7f2cc"
                nodeBorderRadius={8}
                nodeColor={(node) => {
                  const kind = (node as FlowNode).data.node.kind;
                  if (kind === 'human') return '#dfe6ff';
                  if (kind === 'constraint') return '#ffe6ec';
                  if (kind === 'ai') return '#e7f3e9';
                  return '#f4f4ef';
                }}
                pannable
                zoomable
              />
              <Panel className="canvas-kicker" position="top-left">
                <Workflow aria-hidden="true" />
                <strong>Workflow map</strong>
                <span>{counts}</span>
              </Panel>
              <Panel className="canvas-legend" position="top-right">
                <span className="status-chip run">Run</span>
                <span className="status-chip wait">Wait</span>
                <span className="status-chip stop">Stop</span>
              </Panel>
              <Panel className="canvas-mark" position="bottom-right">
                <CubeMark />
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>

        <Rail
          onAcceptSuggestion={acceptSuggestion}
          onAddObservation={addObservation}
          onClose={() => setRailOpen(false)}
          open={railOpen}
          session={session}
        />
        <Inspector
          draft={draft}
          onAddNode={addNode}
          onChangeDraft={setDraft}
          onClose={() => setInspectorOpen(false)}
          onSave={saveDraft}
          open={inspectorOpen}
          palette={palette}
          selectedNode={selectedNode}
          sessionId={sessionId}
        />
      </main>

      <footer className="studio-footer">
        <div className="output-summary">
          <strong>{counts}</strong>
          <span>{session ? `Updated ${new Date(session.updatedAt).toLocaleTimeString()}` : ''}</span>
          {error ? <span className="error">{error}</span> : null}
        </div>
        <div className="toolbar">
          <a className="toolbar-link" href={`/api/sessions/${encodeURIComponent(sessionId)}/export.md`}>
            <FileText aria-hidden="true" />
            <span>Client summary</span>
          </a>
          <a className="toolbar-link" href={`/api/sessions/${encodeURIComponent(sessionId)}`}>
            <Braces aria-hidden="true" />
            <span>JSON</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Atlas Studio root was not found');

createRoot(root).render(<AtlasStudio />);
