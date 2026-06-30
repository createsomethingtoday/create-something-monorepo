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
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Database,
  FileText,
  LockKeyhole,
  Map as MapIcon,
  MessagesSquare,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Presentation,
  RefreshCw,
  Rows3,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
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
  type FormEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { createRoot } from 'react-dom/client';

import type {
  AtlasCanvasEdge,
  AtlasCanvasNode,
  AtlasCanvasNodeKind,
  AtlasCanvasNodeStatus,
  AtlasGovernanceRecordProductId,
  AtlasPaletteItem,
  AtlasSession,
  AtlasStoryStep,
  AtlasWritebackActionStatus,
  AtlasWritebackProposal
} from '../types.js';
import {
  detailModeForZoom,
  focusedStoryNodeSummaries,
  nodeWidthForMode,
  type CanvasDetailMode
} from './layout.js';

type AtlasNodeData = {
  detailMode: CanvasDetailMode;
  isAgentActive: boolean;
  isStoryDimmed: boolean;
  isStoryFocused: boolean;
  storyCalloutSeverity?: 'decision' | 'info' | 'risk';
  storyStepIndex?: number;
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

type StoryPanelOffset = {
  x: number;
  y: number;
};

function formatKind(kind: AtlasCanvasNodeKind): string {
  return kind === 'ai' ? 'AI' : kind;
}

function formatProductId(productId: string): string {
  return productId[0].toUpperCase() + productId.slice(1);
}

function governanceRecordCounts(
  node: AtlasCanvasNode
): Array<{ productId: AtlasGovernanceRecordProductId; count: number }> {
  const counts = new Map<AtlasGovernanceRecordProductId, number>();
  for (const record of node.governanceRecords ?? []) {
    counts.set(record.productId, (counts.get(record.productId) ?? 0) + 1);
  }
  return (['signal', 'decision', 'proof'] as AtlasGovernanceRecordProductId[])
    .map((productId) => ({ productId, count: counts.get(productId) ?? 0 }))
    .filter((item) => item.count > 0);
}

function formatClient(client: string): string {
  const label = client.replace(/^CREATE SOMETHING\s*/i, '').trim();
  return label || client;
}

function nodeActivitySignature(node: AtlasCanvasNode): string {
  return [
    node.updatedAt,
    node.kind,
    node.label,
    node.owner ?? '',
    node.status,
    node.notes ?? '',
    node.evidence ?? '',
    JSON.stringify(node.products ?? []),
    JSON.stringify(node.governanceRecords ?? []),
    node.sync?.checkedAt ?? '',
    node.sync?.status ?? '',
    node.sync?.summary ?? ''
  ].join('|');
}

function flowNodeSignature(node: FlowNode): string {
  return [
    node.id,
    node.selected ? 'selected' : 'idle',
    node.position.x,
    node.position.y,
    node.style?.width ?? '',
    node.data.detailMode,
    node.data.isAgentActive ? 'active' : 'quiet',
    node.data.isStoryFocused ? 'story-focus' : 'story-idle',
    node.data.isStoryDimmed ? 'story-dim' : 'story-visible',
    node.data.storyCalloutSeverity ?? '',
    node.data.storyStepIndex ?? '',
    nodeActivitySignature(node.data.node)
  ].join('|');
}

function edgeSignature(edge: Edge): string {
  return [
    edge.id,
    edge.source,
    edge.target,
    edge.label ?? '',
    edge.type ?? '',
    JSON.stringify(edge.style ?? {})
  ].join('|');
}

function toFlowNodes(
  session: AtlasSession,
  selectedNodeId: string | null,
  activeNodeIds: Set<string>,
  detailMode: CanvasDetailMode,
  storyEnabled: boolean
): FlowNode[] {
  const story = storyEnabled && session.story?.active ? session.story : undefined;
  const focusNodeIds = new Set(story?.focusNodeIds ?? []);
  const activeStepIndex = story?.steps?.findIndex((step) => step.id === story.activeStepId) ?? -1;
  const storyStepIndex = activeStepIndex >= 0 ? activeStepIndex + 1 : undefined;
  const calloutByNode = new Map(
    (story?.callouts ?? [])
      .filter((callout) => callout.nodeId)
      .map((callout) => [callout.nodeId as string, callout.severity])
  );
  return session.canvas.nodes.map((node) => ({
    id: node.id,
    type: 'atlas',
    position: { x: node.x, y: node.y },
    data: {
      detailMode,
      isAgentActive: activeNodeIds.has(node.id),
      isStoryDimmed: Boolean(
        story?.dimUnfocused && focusNodeIds.size && !focusNodeIds.has(node.id)
      ),
      isStoryFocused: focusNodeIds.has(node.id),
      node,
      storyCalloutSeverity: calloutByNode.get(node.id),
      storyStepIndex: focusNodeIds.has(node.id) ? storyStepIndex : undefined
    },
    selected: node.id === selectedNodeId,
    style: { width: nodeWidthForMode(node, detailMode) }
  }));
}

function toFlowEdge(
  edge: AtlasSession['canvas']['edges'][number],
  session: AtlasSession,
  storyEnabled: boolean
): Edge {
  const story = storyEnabled && session.story?.active ? session.story : undefined;
  const focusEdgeIds = new Set(story?.focusEdgeIds ?? []);
  const focusNodeIds = new Set(story?.focusNodeIds ?? []);
  const explicitlyFocused = focusEdgeIds.has(edge.id);
  const connectedFocus =
    focusNodeIds.size > 0 && focusNodeIds.has(edge.source) && focusNodeIds.has(edge.target);
  const isFocused = explicitlyFocused || connectedFocus;
  const isDimmed = Boolean(
    story?.dimUnfocused && (focusNodeIds.size || focusEdgeIds.size) && !isFocused
  );
  const style = isFocused
    ? { stroke: '#0048ff', strokeWidth: 2.25 }
    : isDimmed
      ? { stroke: '#d6d6cf', strokeOpacity: 0.26, strokeWidth: 0.9 }
      : DEFAULT_EDGE_OPTIONS.style;
  return {
    className: `${isFocused ? 'story-edge-focused' : ''} ${isDimmed ? 'story-edge-dimmed' : ''}`,
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
    ...DEFAULT_EDGE_OPTIONS,
    style
  };
}

function toStableFlowEdges(
  session: AtlasSession,
  cache: Map<string, { edge: Edge; signature: string }>,
  previousList: { edges: Edge[]; signature: string } | null,
  storyEnabled: boolean
): { edges: Edge[]; signature: string } {
  const liveIds = new Set(session.canvas.edges.map((edge) => edge.id));
  for (const id of cache.keys()) {
    if (!liveIds.has(id)) cache.delete(id);
  }

  const nextEdges = session.canvas.edges.map((edge) => {
    const next = toFlowEdge(edge, session, storyEnabled);
    const signature = edgeSignature(next);
    const cached = cache.get(edge.id);
    if (cached?.signature === signature) return cached.edge;
    cache.set(edge.id, { edge: next, signature });
    return next;
  });
  const signature = nextEdges
    .map((edge) => cache.get(edge.id)?.signature ?? edgeSignature(edge))
    .join('\n');

  if (previousList?.signature === signature) return previousList;
  return { edges: nextEdges, signature };
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

function readStoredStoryPanelOffset(sessionId: string): StoryPanelOffset {
  try {
    const raw = localStorage.getItem(`atlas-studio:${sessionId}:story-panel-offset`);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as StoryPanelOffset;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
  } catch {
    return { x: 0, y: 0 };
  }
  return { x: 0, y: 0 };
}

function writeStoredStoryPanelOffset(sessionId: string, offset: StoryPanelOffset): void {
  localStorage.setItem(`atlas-studio:${sessionId}:story-panel-offset`, JSON.stringify(offset));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea'
  );
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
  ariaLabel,
  children,
  icon: Icon,
  onClick,
  title
}: {
  active?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
  icon: LucideIcon;
  onClick: () => void;
  title?: string;
}): React.ReactElement {
  return (
    <button
      aria-label={ariaLabel ?? title ?? (typeof children === 'string' ? children : undefined)}
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

type OperatorStateTone = 'ready' | 'review' | 'blocked';

type OperatorStateSummary = {
  handoff: string;
  proof: string;
  review: string;
  state: string;
  tone: OperatorStateTone;
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function summarizeOperatorState(session: AtlasSession | null): OperatorStateSummary {
  if (!session) {
    return {
      handoff: 'Handoff loading',
      proof: 'Proof loading',
      review: 'Review loading',
      state: 'Loading',
      tone: 'review'
    };
  }

  const nodes = session.canvas.nodes;
  const latestProposal = session.proposals?.[0];
  const queuedSuggestions = session.suggestions.filter((item) => item.status === 'queued').length;
  const openQuestions =
    session.story?.questions.filter((question) => question.status === 'open').length ?? 0;
  const stoppedNodes = nodes.filter((node) => node.status === 'stop').length;
  const waitingNodes = nodes.filter((node) => node.status === 'wait').length;
  const syncIssues = nodes.filter((node) =>
    node.sync ? ['missing', 'partial', 'unbound', 'unknown'].includes(node.sync.status) : false
  ).length;
  const proofCount = nodes.filter(
    (node) => node.evidence?.trim() || node.bindings?.length || node.sync?.bindingCount
  ).length;
  const proposedActions =
    latestProposal?.actions.filter((action) => action.status === 'proposed').length ?? 0;
  const approvalActions =
    latestProposal?.actions.filter(
      (action) => action.status === 'proposed' && action.risk === 'approval'
    ).length ?? 0;
  const approvedActions = latestProposal?.summary.approved ?? 0;

  const reviewCount = approvalActions + queuedSuggestions + openQuestions;
  const tone: OperatorStateTone = stoppedNodes
    ? 'blocked'
    : reviewCount || syncIssues
      ? 'review'
      : 'ready';
  const state = stoppedNodes
    ? `${pluralize(stoppedNodes, 'blocked node')}`
    : reviewCount
      ? `${pluralize(reviewCount, 'review item')}`
      : syncIssues
        ? `${pluralize(syncIssues, 'proof gap')}`
        : 'Ready to brief';

  return {
    handoff: latestProposal
      ? `${pluralize(approvedActions, 'approved action')} / ${pluralize(proposedActions, 'open action')}`
      : 'No handoff plan yet',
    proof: syncIssues
      ? `${pluralize(syncIssues, 'binding gap')}`
      : `${pluralize(proofCount, 'proof point')}`,
    review: reviewCount
      ? `${pluralize(approvalActions, 'approval')} / ${pluralize(queuedSuggestions, 'suggestion')} / ${pluralize(openQuestions, 'question')}`
      : waitingNodes
        ? `${pluralize(waitingNodes, 'waiting node')}`
        : 'No open review',
    state,
    tone
  };
}

const AtlasFlowNode = memo(function AtlasFlowNode({
  data,
  selected
}: NodeProps<FlowNode>): React.ReactElement {
  const node = data.node;
  const Icon = KIND_ICONS[node.kind];
  const note = node.notes || node.evidence || 'Boundary and evidence can be added here.';
  const owner = node.owner || node.createdBy || 'agent';
  const sync = node.sync;
  const products = node.products ?? [];
  const recordCounts = governanceRecordCounts(node);

  return (
    <article
      className={`atlas-node kind-${node.kind} detail-${data.detailMode} ${
        data.isAgentActive ? 'agent-active' : ''
      } ${data.isStoryFocused ? 'story-focused' : ''} ${
        data.isStoryDimmed ? 'story-dimmed' : ''
      } ${data.storyCalloutSeverity ? `story-callout-${data.storyCalloutSeverity}` : ''} ${
        selected ? 'selected' : ''
      }`}
    >
      <Handle className="atlas-handle target" position={Position.Left} type="target" />
      <Handle className="atlas-handle source" position={Position.Right} type="source" />
      {data.storyStepIndex ? <span className="story-step-badge">{data.storyStepIndex}</span> : null}
      <div className="node-topline">
        <span className="node-kind">
          <Icon aria-hidden="true" />
          <span>{formatKind(node.kind)}</span>
        </span>
        <span className="node-badges">
          {sync ? (
            <span className={`node-sync ${sync.status}`} title={sync.summary}>
              {sync.status}
            </span>
          ) : null}
          {products.map((product) => (
            <span
              className={`node-product product-${product.productId}`}
              key={`${node.id}-${product.productId}-${product.surface}`}
              title={`${formatProductId(product.productId)} · ${product.surface}`}
            >
              {formatProductId(product.productId)}
            </span>
          ))}
          {recordCounts.map((record) => (
            <span
              className={`node-record product-${record.productId}`}
              key={`${node.id}-record-${record.productId}`}
              title={`${record.count} attached ${formatProductId(record.productId)} record${record.count === 1 ? '' : 's'}`}
            >
              {formatProductId(record.productId)} {record.count}
            </span>
          ))}
          <span className={`node-status ${node.status}`}>{node.status}</span>
        </span>
      </div>
      <strong className="node-title">{node.label}</strong>
      {data.detailMode === 'compact' ? null : (
        <div className="node-meta">
          <span>{owner}</span>
          <p>{note}</p>
        </div>
      )}
    </article>
  );
});

const NODE_TYPES = {
  atlas: AtlasFlowNode
};

function StoryPanel({
  onClear,
  onDragStart,
  onNextStep,
  onPreviousStep,
  onResetPosition,
  onSelectStep,
  session
}: {
  onClear: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onResetPosition: () => void;
  onSelectStep: (step: AtlasStoryStep) => void;
  session: AtlasSession | null;
}): React.ReactElement | null {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const story = session?.story;
  if (!story?.active && !story?.questions.length) return null;

  const openQuestions = story.questions.filter((question) => question.status === 'open');
  const steps = story.steps ?? [];
  const activeStepIndex = steps.findIndex((step) => step.id === story.activeStepId);
  const activeStep = steps[activeStepIndex] ?? steps.find((step) => step.status === 'current');
  const focusedNodes = session ? focusedStoryNodeSummaries(session) : [];
  const canGoPrevious = activeStepIndex > 0;
  const canGoNext = activeStepIndex >= 0 && activeStepIndex < steps.length - 1;
  const detailCount =
    focusedNodes.length + story.callouts.length + openQuestions.length + (story.nextAction ? 1 : 0);
  return (
    <aside className={`story-panel ${story.active ? 'active' : 'quiet'}`}>
      <div
        className="story-panel-header"
        onPointerDown={onDragStart}
        title="Drag to move story panel"
      >
        <span className="title-lockup">
          <span className="title-icon">
            <Sparkles aria-hidden="true" />
          </span>
          <span>
            <strong>{story.title ?? 'Agent walkthrough'}</strong>
            <em>
              {steps.length && activeStepIndex >= 0
                ? `Step ${activeStepIndex + 1} of ${steps.length}`
                : story.active
                  ? 'Live canvas focus'
                  : 'Questions preserved'}
            </em>
          </span>
        </span>
        <span className="story-panel-actions">
          <button
            className="icon-only"
            onClick={onResetPosition}
            onPointerDown={(event) => event.stopPropagation()}
            title="Reset story panel position"
            type="button"
          >
            <MapIcon aria-hidden="true" />
          </button>
          {story.active ? (
            <button
              className="icon-only"
              onClick={onClear}
              onPointerDown={(event) => event.stopPropagation()}
              title="Clear story focus"
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
      {activeStep ? (
        <div className="story-current-step">
          <span>{activeStep.owner ?? 'Agent'}</span>
          <strong>{activeStep.title}</strong>
          <p>{activeStep.summary}</p>
        </div>
      ) : null}
      {steps.length ? (
        <div className="story-nav" aria-label="Presenter controls">
          <button disabled={!canGoPrevious} onClick={onPreviousStep} type="button">
            <ChevronLeft aria-hidden="true" />
            <span>Back</span>
          </button>
          <button disabled={!canGoNext} onClick={onNextStep} type="button">
            <span>Next</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {story.narration ? <p className="story-narration">{story.narration}</p> : null}
      {steps.length ? (
        <div className="story-steps" aria-label="Walkthrough steps">
          {steps.map((step, index) => {
            const isActive =
              step.id === story.activeStepId || (!story.activeStepId && step.status === 'current');
            return (
              <button
                className={isActive ? 'active' : ''}
                key={step.id}
                onClick={() => onSelectStep(step)}
                type="button"
              >
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
              </button>
            );
          })}
        </div>
      ) : null}
      {detailCount ? (
        <button
          aria-expanded={detailsOpen}
          className="story-details-toggle"
          onClick={() => setDetailsOpen((value) => !value)}
          type="button"
        >
          <span>{detailsOpen ? 'Hide details' : `Details · ${detailCount}`}</span>
        </button>
      ) : null}
      {detailsOpen ? (
        <div className="story-details">
          {activeStep?.proof ? (
            <p className="story-proof">
              <span>Proof</span>
              {activeStep.proof}
            </p>
          ) : null}
          {focusedNodes.length ? (
            <div className="story-node-review">
              <strong>Node review · {focusedNodes.length}</strong>
              {focusedNodes.map((node) => (
                <article className="story-node-card" key={node.id}>
                  <div className="story-node-card-title">
                    <span className={`status-chip ${node.status}`}>{node.status}</span>
                    <span>{formatKind(node.kind)}</span>
                  </div>
                  <strong>{node.label}</strong>
                  <em>{node.owner}</em>
                  {node.notes ? <p>{node.notes}</p> : null}
                  {node.evidence ? <p className="story-node-evidence">{node.evidence}</p> : null}
                  {node.callouts.length ? (
                    <div className="story-node-signals">
                      {node.callouts.map((callout, index) => (
                        <span
                          className={`story-signal ${callout.severity}`}
                          key={`${node.id}-callout-${index}`}
                        >
                          {callout.severity}: {callout.text}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {node.questions.length ? (
                    <div className="story-node-questions">
                      {node.questions.map((question, index) => (
                        <p key={`${node.id}-question-${index}`}>
                          {question.owner ? <span>{question.owner}: </span> : null}
                          {question.question}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="story-review-actions" aria-label={`Review ${node.label}`}>
                    <span>Confirmed</span>
                    <span>Clarify</span>
                    <span>Revise</span>
                    <span>Defer</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {story.callouts.length ? (
            <div className="story-callouts">
              {story.callouts.map((callout) => (
                <p className={`story-callout ${callout.severity}`} key={callout.id}>
                  {callout.text}
                </p>
              ))}
            </div>
          ) : null}
          {story.nextAction ? (
            <p className="story-next-action">
              <span>Next move</span>
              {story.nextAction}
            </p>
          ) : null}
          {openQuestions.length ? (
            <div className="story-questions">
              <strong>Validation questions · {openQuestions.length}</strong>
              {openQuestions.slice(0, 3).map((question) => (
                <p key={question.id}>
                  {question.owner ? <span>{question.owner}: </span> : null}
                  {question.question}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function Rail({
  onAcceptSuggestion,
  onAddObservation,
  onCreateProposal,
  onReviewProposalAction,
  onClose,
  open,
  session
}: {
  onAcceptSuggestion: (suggestionId: string) => void;
  onAddObservation: (text: string) => void;
  onCreateProposal: () => void;
  onReviewProposalAction: (
    proposalId: string,
    actionId: string,
    status: Exclude<AtlasWritebackActionStatus, 'applied'>
  ) => void;
  onClose: () => void;
  open: boolean;
  session: AtlasSession | null;
}): React.ReactElement {
  const [observation, setObservation] = useState('');
  const queued = useMemo(
    () => session?.suggestions.filter((item) => item.status === 'queued') ?? [],
    [session]
  );
  const latestProposal: AtlasWritebackProposal | undefined = session?.proposals?.[0];

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
          <button
            aria-label="Close rail"
            className="icon-only"
            onClick={onClose}
            title="Close rail"
            type="button"
          >
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
              <FileText aria-hidden="true" />
            </span>
            <span>
              <strong>Review Plan</strong>
              <em>Review before any production edit</em>
            </span>
          </span>
          {latestProposal ? (
            <span className="count-chip">{latestProposal.summary.total}</span>
          ) : null}
        </div>
        <div className="rail-list">
          {latestProposal ? (
            <>
              <article className="rail-item proposal-summary">
                <div className="proposal-counts">
                  <span className="risk-chip safe">{latestProposal.summary.safe} safe</span>
                  <span className="risk-chip review">{latestProposal.summary.review} review</span>
                  <span className="risk-chip approval">
                    {latestProposal.summary.approval} approval
                  </span>
                  <span className="review-chip approved">
                    {latestProposal.summary.approved ?? 0} approved
                  </span>
                  <span className="review-chip rejected">
                    {latestProposal.summary.rejected ?? 0} rejected
                  </span>
                </div>
                <p>
                  {latestProposal.summary.drift} mapped node
                  {latestProposal.summary.drift === 1 ? '' : 's'} need sync attention before any
                  production change is prepared.
                </p>
              </article>
              {latestProposal.actions.slice(0, 8).map((action) => (
                <article className="rail-item" key={action.id}>
                  <div className="rail-item-title">
                    <span>
                      <FileText aria-hidden="true" />
                      <strong>{action.title}</strong>
                    </span>
                    <span className="proposal-badges">
                      <span className={`risk-chip ${action.risk}`}>{action.risk}</span>
                      <span className={`review-chip ${action.status}`}>{action.status}</span>
                    </span>
                  </div>
                  <p>{action.summary}</p>
                  {action.reviewNote ? <p className="review-note">{action.reviewNote}</p> : null}
                  {action.status === 'proposed' ? (
                    <div className="proposal-actions">
                      <button
                        className="subtle-button"
                        onClick={() =>
                          onReviewProposalAction(latestProposal.id, action.id, 'approved')
                        }
                        type="button"
                      >
                        <Check aria-hidden="true" />
                        <span>Approve</span>
                      </button>
                      <button
                        className="subtle-button danger"
                        onClick={() =>
                          onReviewProposalAction(latestProposal.id, action.id, 'rejected')
                        }
                        type="button"
                      >
                        <X aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </>
          ) : (
            <article className="rail-item proposal-summary">
              <p>Check production bindings, then create a review plan before anything changes.</p>
              <button className="subtle-button" onClick={onCreateProposal} type="button">
                <FileText aria-hidden="true" />
                <span>Create review plan</span>
              </button>
            </article>
          )}
        </div>
      </section>

      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <span>
              <strong>Suggestions</strong>
              <em>Operator approves changes</em>
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
  onRemoveNode,
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
  onRemoveNode: (nodeId: string) => void;
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
          <button
            aria-label="Close inspector"
            className="icon-only"
            onClick={onClose}
            title="Close inspector"
            type="button"
          >
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
            <button
              className="subtle-button danger"
              onClick={() => onRemoveNode(selectedNode.id)}
              type="button"
            >
              <Trash2 aria-hidden="true" />
              <span>Remove node</span>
            </button>
            <div className="sync-panel">
              <div className="section-title compact">
                <span className="title-lockup">
                  <span className="title-icon">
                    <ScanLine aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Production bindings</strong>
                    <em>{selectedNode.sync?.summary ?? 'Check bindings to connect this node.'}</em>
                  </span>
                </span>
                {selectedNode.sync ? (
                  <span className={`status-chip sync-${selectedNode.sync.status}`}>
                    {selectedNode.sync.status}
                  </span>
                ) : null}
              </div>
              {selectedNode.bindings?.length ? (
                <div className="binding-list">
                  {selectedNode.bindings.map((binding) => {
                    const check = selectedNode.sync?.checks.find((item) => item.id === binding.id);
                    return (
                      <div className="binding-row" key={binding.id}>
                        <span className={`binding-dot ${check?.status ?? 'unknown'}`} />
                        <span>
                          <strong>{binding.label}</strong>
                          <em>{binding.source}</em>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty">No production binding has been attached to this node yet.</p>
              )}
            </div>
            <div className="governance-panel">
              <div className="section-title compact">
                <span className="title-lockup">
                  <span className="title-icon">
                    <FileText aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Governance records</strong>
                    <em>
                      {selectedNode.governanceRecords?.length
                        ? `${selectedNode.governanceRecords.length} attached record${
                            selectedNode.governanceRecords.length === 1 ? '' : 's'
                          }`
                        : 'Attach Signal, Decision, or Proof refs from the ledger.'}
                    </em>
                  </span>
                </span>
              </div>
              {selectedNode.governanceRecords?.length ? (
                <div className="governance-record-list">
                  {selectedNode.governanceRecords.map((record) => (
                    <div className="governance-record-row" key={`${record.productId}-${record.id}`}>
                      <span className={`node-record product-${record.productId}`}>
                        {formatProductId(record.productId)}
                      </span>
                      <span>
                        <strong>{record.title}</strong>
                        <em>
                          {record.id}
                          {record.status ? ` · ${record.status}` : ''}
                          {record.source ? ` · ${record.source}` : ''}
                        </em>
                        {record.summary ? <p>{record.summary}</p> : null}
                        {record.href ? (
                          <a href={record.href} rel="noreferrer" target="_blank">
                            Open record
                          </a>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">
                  Use the Atlas Studio record command to connect this node to runtime evidence.
                </p>
              )}
            </div>
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
              <em>Agent-side note capture</em>
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
  const initialViewport = useMemo(() => readStoredViewport(sessionId), [sessionId]);
  const initialStoryPanelOffset = useMemo(() => readStoredStoryPanelOffset(sessionId), [sessionId]);
  const [session, setSession] = useState<AtlasSession | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeNodeIds, setActiveNodeIds] = useState<Set<string>>(() => new Set());
  const [detailMode, setDetailMode] = useState<CanvasDetailMode>(() =>
    detailModeForZoom(initialViewport?.zoom ?? 1)
  );
  const [railOpen, setRailOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [storyPanelOffset, setStoryPanelOffset] =
    useState<StoryPanelOffset>(initialStoryPanelOffset);
  const [draft, setDraft] = useState<NodeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healSummary, setHealSummary] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const edgeCache = useRef<Map<string, { edge: Edge; signature: string }>>(new Map());
  const edgeListCache = useRef<{ edges: Edge[]; signature: string } | null>(null);
  const sessionRef = useRef<AtlasSession | null>(null);
  const nodeSignatures = useRef<Map<string, string>>(new Map());
  const activityTimer = useRef<number | null>(null);
  const storyFrameKey = useRef<string | null>(null);
  const storySelectionKey = useRef<string | null>(null);
  const storyPanelDrag = useRef<{
    originX: number;
    originY: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const presenterModeInitialized = useRef(false);

  const edges = useMemo(() => {
    if (!session) return [];
    edgeListCache.current = toStableFlowEdges(
      session,
      edgeCache.current,
      edgeListCache.current,
      presenterMode
    );
    return edgeListCache.current.edges;
  }, [presenterMode, session]);
  const selectedNode = useMemo(
    () => session?.canvas.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, session]
  );
  const counts = `${session?.canvas.nodes.length ?? 0} nodes / ${session?.canvas.edges.length ?? 0} edges`;
  const sessionTitle = session
    ? `${formatClient(session.client)} / ${session.workflow}`
    : 'Loading session...';
  const operatorSummary = useMemo(() => summarizeOperatorState(session), [session]);

  const applySession = useCallback((next: AtlasSession, source: 'local' | 'remote') => {
    const previous = sessionRef.current;
    if (previous?.updatedAt === next.updatedAt) return;

    const previousNodeSignatures = nodeSignatures.current;
    const now = Date.now();
    const changedNodeIds =
      source === 'remote'
        ? next.canvas.nodes
            .filter((node) => {
              if (node.createdBy === 'operator') return false;
              const wasSeen = previousNodeSignatures.has(node.id);
              const changed = previousNodeSignatures.get(node.id) !== nodeActivitySignature(node);
              const isRecent = now - Date.parse(node.updatedAt) < 6_000;
              return wasSeen ? changed : isRecent;
            })
            .map((node) => node.id)
        : [];

    nodeSignatures.current = new Map(
      next.canvas.nodes.map((node) => [node.id, nodeActivitySignature(node)])
    );
    sessionRef.current = next;
    if (changedNodeIds.length) {
      setActiveNodeIds(new Set(changedNodeIds));
      if (activityTimer.current) window.clearTimeout(activityTimer.current);
      activityTimer.current = window.setTimeout(() => {
        setActiveNodeIds(new Set());
        activityTimer.current = null;
      }, 3600);
    }
    setSession(next);
  }, []);

  const loadSession = useCallback(async () => {
    const next = await requestJson<AtlasSession>(`/api/sessions/${encodeURIComponent(sessionId)}`);
    applySession(next, 'remote');
    setError(null);
  }, [applySession, sessionId]);

  const patchNode = useCallback(
    async (nodeId: string, payload: Partial<AtlasCanvasNode>) => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/nodes/${encodeURIComponent(nodeId)}`,
        {
          body: JSON.stringify(payload),
          method: 'PATCH'
        }
      );
      applySession(next, 'local');
      setError(null);
    },
    [applySession, sessionId]
  );

  const resetStoryPanelPosition = useCallback(() => {
    const next = { x: 0, y: 0 };
    storyPanelDrag.current = null;
    setStoryPanelOffset(next);
    writeStoredStoryPanelOffset(sessionId, next);
  }, [sessionId]);

  const startStoryPanelDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('button, a, input, textarea, select'))
        return;

      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const start = {
        originX: storyPanelOffset.x,
        originY: storyPanelOffset.y,
        pointerX: event.clientX,
        pointerY: event.clientY
      };
      storyPanelDrag.current = start;
      let latest = storyPanelOffset;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const drag = storyPanelDrag.current;
        if (!drag) return;
        latest = {
          x: drag.originX + moveEvent.clientX - drag.pointerX,
          y: drag.originY + moveEvent.clientY - drag.pointerY
        };
        setStoryPanelOffset(latest);
      };

      const onPointerUp = () => {
        storyPanelDrag.current = null;
        writeStoredStoryPanelOffset(sessionId, latest);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [sessionId, storyPanelOffset]
  );

  useEffect(() => {
    void loadSession();
    void requestJson<Palette>('/api/palette')
      .then(setPalette)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [loadSession]);

  useEffect(() => {
    if (!session) return;
    if (!presenterModeInitialized.current && session.story?.active && session.story.steps.length) {
      presenterModeInitialized.current = true;
      setPresenterMode(true);
    }
    const nextNodes = toFlowNodes(
      session,
      selectedNodeId,
      activeNodeIds,
      detailMode,
      presenterMode
    );

    setNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      let changed = current.length !== nextNodes.length;
      const merged = nextNodes.map((node, index) => {
        if (current[index]?.id !== node.id) changed = true;
        const existing = currentById.get(node.id);
        if (!existing) {
          changed = true;
          return node;
        }

        const canonicalPositionChanged =
          existing.data.node.x !== node.data.node.x || existing.data.node.y !== node.data.node.y;
        const nextNode = canonicalPositionChanged ? node : { ...node, position: existing.position };

        if (flowNodeSignature(existing) === flowNodeSignature(nextNode)) return existing;
        changed = true;
        return nextNode;
      });
      return changed ? merged : current;
    });
  }, [activeNodeIds, detailMode, presenterMode, selectedNodeId, session]);

  useEffect(() => {
    return () => {
      if (activityTimer.current) window.clearTimeout(activityTimer.current);
    };
  }, []);

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
      applySession(next, 'remote');
    });
    events.addEventListener('error', () => {
      events.close();
      const timer = window.setInterval(() => void loadSession(), 1000);
      window.setTimeout(() => window.clearInterval(timer), 15_000);
    });

    return () => events.close();
  }, [applySession, loadSession, sessionId]);

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
      if (!connection.source || !connection.target || connection.source === connection.target)
        return;
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
      applySession(next, 'local');
    },
    [applySession, sessionId]
  );

  const updateDetailModeForViewport = useCallback((viewport: Viewport) => {
    const next = detailModeForZoom(viewport.zoom);
    setDetailMode((current) => (current === next ? current : next));
  }, []);

  const onMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      updateDetailModeForViewport(viewport);
      localStorage.setItem(`atlas-studio:${sessionId}:viewport`, JSON.stringify(viewport));
    },
    [sessionId, updateDetailModeForViewport]
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
      applySession(next, 'local');
      setRailOpen(true);
    },
    [applySession, sessionId]
  );

  const clearStoryFocus = useCallback(async () => {
    const next = await requestJson<AtlasSession>(
      `/api/sessions/${encodeURIComponent(sessionId)}/story`,
      {
        method: 'DELETE'
      }
    );
    applySession(next, 'local');
    setError(null);
  }, [applySession, sessionId]);

  const selectStoryStep = useCallback(
    async (step: AtlasStoryStep) => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/story/steps/${encodeURIComponent(
          step.id
        )}/activate`,
        {
          method: 'POST'
        }
      );
      applySession(next, 'local');
      setError(null);
    },
    [applySession, sessionId]
  );

  const advancePresenterStep = useCallback(
    async (direction: 'next' | 'previous') => {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/story/${direction}`,
        {
          method: 'POST'
        }
      );
      applySession(next, 'local');
      setError(null);
    },
    [applySession, sessionId]
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
      applySession(next, 'local');
      setInspectorOpen(true);
    },
    [applySession, sessionId]
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
      applySession(next, 'local');
      setInspectorOpen(true);
    },
    [applySession, sessionId]
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

  const removeSelectedNode = useCallback(
    async (nodeId: string) => {
      const node = session?.canvas.nodes.find((item) => item.id === nodeId);
      const label = node?.label ?? nodeId;
      if (
        !window.confirm(`Remove "${label}" from this canvas? Connected edges will also be removed.`)
      ) {
        return;
      }

      const result = await requestJson<{
        removedEdges: AtlasCanvasEdge[];
        removedNode: AtlasCanvasNode;
        session: AtlasSession;
      }>(`/api/sessions/${encodeURIComponent(sessionId)}/nodes/${encodeURIComponent(nodeId)}`, {
        method: 'DELETE'
      });
      applySession(result.session, 'local');
      setSelectedNodeId(null);
      setDraft(null);
      setInspectorOpen(false);
      setError(null);
    },
    [applySession, session, sessionId]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedNodeId || isEditableTarget(event.target)) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      event.preventDefault();
      void removeSelectedNode(selectedNodeId);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removeSelectedNode, selectedNodeId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!presenterMode || !session?.story?.active || isEditableTarget(event.target)) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      void advancePresenterStep(event.key === 'ArrowRight' ? 'next' : 'previous');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advancePresenterStep, presenterMode, session?.story?.active]);

  const fitCanvas = useCallback(() => {
    void flowRef.current?.fitView(FIT_VIEW_OPTIONS);
  }, []);

  const fitStoryFocus = useCallback(() => {
    const story = session?.story;
    if (!story?.active || !story.focusNodeIds.length) {
      storyFrameKey.current = null;
      return;
    }
    const key = [story.activeStepId ?? 'story', ...story.focusNodeIds].join('|');
    if (storyFrameKey.current === key) return;
    storyFrameKey.current = key;
    window.setTimeout(() => {
      void flowRef.current?.fitView({
        ...FIT_VIEW_OPTIONS,
        maxZoom: 1.18,
        nodes: story.focusNodeIds.map((id) => ({ id })),
        padding: 0.34
      });
    }, 60);
  }, [session]);

  useEffect(() => {
    fitStoryFocus();
  }, [fitStoryFocus, nodes]);

  useEffect(() => {
    const story = session?.story;
    if (!presenterMode || !story?.active || !story.focusNodeIds.length) {
      storySelectionKey.current = null;
      return;
    }

    const firstFocusedNodeId = story.focusNodeIds[0];
    const key = [story.activeStepId ?? 'story', firstFocusedNodeId].join('|');
    if (storySelectionKey.current === key) return;
    storySelectionKey.current = key;
    setSelectedNodeId(firstFocusedNodeId);
    setInspectorOpen(true);
  }, [presenterMode, session?.story]);

  const tidyCanvas = useCallback(async () => {
    const viewportWidth = canvasStageRef.current?.clientWidth ?? window.innerWidth;
    const result = await requestJson<{
      session: AtlasSession;
      updates: Array<{ id: string; width: number; x: number; y: number }>;
    }>(`/api/sessions/${encodeURIComponent(sessionId)}/tidy`, {
      body: JSON.stringify({ viewportWidth }),
      method: 'POST'
    });

    if (!result.updates.length) {
      fitCanvas();
      return;
    }

    applySession(result.session, 'local');
    setError(null);
    window.setTimeout(() => fitCanvas(), 40);
  }, [applySession, fitCanvas, sessionId]);

  const healCanvas = useCallback(async () => {
    const result = await requestJson<{
      session: AtlasSession;
      summary: {
        bindingsChecked: number;
        missing: number;
        partial: number;
        synced: number;
        unbound: number;
      };
    }>(`/api/sessions/${encodeURIComponent(sessionId)}/heal`, {
      body: JSON.stringify({ profile: 'template-system' }),
      method: 'POST'
    });
    applySession(result.session, 'local');
    setHealSummary(
      `${result.summary.bindingsChecked} bindings checked, ${result.summary.synced} synced, ${result.summary.partial} partial, ${result.summary.missing} missing.`
    );
    setError(null);
  }, [applySession, sessionId]);

  const createProposal = useCallback(async () => {
    const result = await requestJson<{
      proposal: AtlasWritebackProposal;
      session: AtlasSession;
      summary: {
        approval: number;
        approved: number;
        rejected: number;
        review: number;
        safe: number;
        total: number;
      };
    }>(`/api/sessions/${encodeURIComponent(sessionId)}/proposals`, {
      body: JSON.stringify({ profile: 'template-system' }),
      method: 'POST'
    });
    applySession(result.session, 'local');
    setProposalSummary(
      `${result.summary.total} proposed actions: ${result.summary.safe} safe, ${result.summary.review} review, ${result.summary.approval} approval.`
    );
    setRailOpen(true);
    setError(null);
  }, [applySession, sessionId]);

  const reviewProposalAction = useCallback(
    async (
      proposalId: string,
      actionId: string,
      status: Exclude<AtlasWritebackActionStatus, 'applied'>
    ) => {
      const result = await requestJson<{
        proposal: AtlasWritebackProposal;
        session: AtlasSession;
        summary: {
          approved: number;
          rejected: number;
          total: number;
        };
      }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/proposals/${encodeURIComponent(
          proposalId
        )}/actions/${encodeURIComponent(actionId)}`,
        {
          body: JSON.stringify({ operator: true, status }),
          method: 'PATCH'
        }
      );
      applySession(result.session, 'local');
      setProposalSummary(
        `${result.summary.approved} approved, ${result.summary.rejected} rejected across ${result.summary.total} proposed actions.`
      );
      setError(null);
    },
    [applySession, sessionId]
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance<FlowNode, Edge>) => {
      flowRef.current = instance;
      updateDetailModeForViewport(instance.getViewport());
    },
    [updateDetailModeForViewport]
  );

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
        <div className="toolbar">
          <IconButton
            active={railOpen}
            icon={railOpen ? PanelLeftClose : PanelLeftOpen}
            onClick={() => setRailOpen((value) => !value)}
            title={railOpen ? 'Hide review rail' : 'Show review rail'}
          >
            Rail
          </IconButton>
          <IconButton
            active={inspectorOpen}
            icon={inspectorOpen ? PanelRightClose : PanelRightOpen}
            onClick={() => setInspectorOpen((value) => !value)}
            title={inspectorOpen ? 'Hide node details' : 'Show node details'}
          >
            Inspector
          </IconButton>
          <IconButton
            active={presenterMode}
            icon={Presentation}
            onClick={() => setPresenterMode((value) => !value)}
            title={presenterMode ? 'Exit presenter mode' : 'Enter presenter mode'}
          >
            Present
          </IconButton>
          <IconButton icon={MapIcon} onClick={fitCanvas} title="Fit map">
            Fit
          </IconButton>
          <IconButton icon={Rows3} onClick={() => void tidyCanvas()} title="Arrange map">
            Arrange
          </IconButton>
          <IconButton
            icon={ScanLine}
            onClick={() => void healCanvas()}
            title="Check production bindings"
          >
            Check
          </IconButton>
          <IconButton
            icon={FileText}
            onClick={() => void createProposal()}
            title="Create review plan"
          >
            Review plan
          </IconButton>
          <IconButton icon={RefreshCw} onClick={() => void loadSession()} title="Refresh session">
            Refresh
          </IconButton>
          <IconButton icon={Clipboard} onClick={() => void copyCommand()} title="Copy note capture">
            Copy note capture
          </IconButton>
        </div>
      </header>

      <main className="studio-main">
        <ReactFlowProvider>
          <div
            ref={canvasStageRef}
            className={`canvas-stage ${presenterMode ? 'presenter-mode' : ''}`}
            aria-label="Atlas workflow canvas"
          >
            <ReactFlow
              attributionPosition="bottom-left"
              colorMode="light"
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              defaultViewport={initialViewport}
              deleteKeyCode={null}
              edges={edges}
              elevateEdgesOnSelect={false}
              fitView={!initialViewport}
              fitViewOptions={FIT_VIEW_OPTIONS}
              maxZoom={1.8}
              minZoom={0.18}
              nodeClickDistance={6}
              nodeDragThreshold={8}
              nodeTypes={NODE_TYPES}
              nodes={nodes}
              nodesConnectable={!presenterMode}
              nodesDraggable={!presenterMode}
              onConnect={onConnect}
              onInit={onInit}
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
              {presenterMode ? (
                <Panel
                  className="story-panel-wrap"
                  position="bottom-left"
                  style={{
                    transform: `translate(${storyPanelOffset.x}px, ${storyPanelOffset.y}px)`
                  }}
                >
                  <StoryPanel
                    onClear={() => void clearStoryFocus()}
                    onDragStart={startStoryPanelDrag}
                    onNextStep={() => void advancePresenterStep('next')}
                    onPreviousStep={() => void advancePresenterStep('previous')}
                    onResetPosition={resetStoryPanelPosition}
                    onSelectStep={(step) => void selectStoryStep(step)}
                    session={session}
                  />
                </Panel>
              ) : null}
            </ReactFlow>
          </div>
        </ReactFlowProvider>

        <Rail
          onAcceptSuggestion={acceptSuggestion}
          onAddObservation={addObservation}
          onCreateProposal={() => void createProposal()}
          onReviewProposalAction={(proposalId, actionId, status) =>
            void reviewProposalAction(proposalId, actionId, status)
          }
          onClose={() => setRailOpen(false)}
          open={railOpen}
          session={session}
        />
        <Inspector
          draft={draft}
          onAddNode={addNode}
          onChangeDraft={setDraft}
          onClose={() => setInspectorOpen(false)}
          onRemoveNode={(nodeId) => void removeSelectedNode(nodeId)}
          onSave={saveDraft}
          open={inspectorOpen}
          palette={palette}
          selectedNode={selectedNode}
          sessionId={sessionId}
        />
      </main>

      <footer className="studio-footer">
        <div
          className={`operator-summary tone-${operatorSummary.tone}`}
          aria-label="Operator state"
        >
          <span className="operator-state">
            <ShieldAlert aria-hidden="true" />
            <strong>{operatorSummary.state}</strong>
          </span>
          <span>{operatorSummary.review}</span>
          <span>{operatorSummary.proof}</span>
          <span>{operatorSummary.handoff}</span>
        </div>
        <div className="output-summary">
          <strong>{counts}</strong>
          <span>
            {session ? `Updated ${new Date(session.updatedAt).toLocaleTimeString()}` : ''}
          </span>
          {healSummary ? <span>{healSummary}</span> : null}
          {proposalSummary ? <span>{proposalSummary}</span> : null}
          {error ? <span className="error">{error}</span> : null}
        </div>
        <div className="toolbar">
          <a
            aria-label="Open handoff"
            className="toolbar-link"
            href={`/api/sessions/${encodeURIComponent(sessionId)}/proposals/latest/handoff.md`}
            title="Open handoff"
          >
            <NotebookTabs aria-hidden="true" />
            <span>Handoff</span>
          </a>
          <a
            aria-label="Open client summary"
            className="toolbar-link"
            href={`/api/sessions/${encodeURIComponent(sessionId)}/export.md`}
            title="Open client summary"
          >
            <FileText aria-hidden="true" />
            <span>Client summary</span>
          </a>
          <a
            aria-label="Open session JSON"
            className="toolbar-link"
            href={`/api/sessions/${encodeURIComponent(sessionId)}`}
            title="Open session JSON"
          >
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
