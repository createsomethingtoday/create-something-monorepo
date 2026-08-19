import './styles.css';

import {
  Blocks,
  Bot,
  Braces,
  Check,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Database,
  Film,
  FileText,
  Gauge,
  History,
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
  Search,
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
  AtlasStoryCallout,
  AtlasStoryStep,
  AtlasWritebackActionStatus,
  AtlasWritebackProposal
} from '../types.js';
import type { CutOperation, TranscriptEditorProject } from '@create-something/atlas-composition';
import {
  buildAtlasDatabaseHealth,
  type AtlasDatabaseHealthCard,
  type AtlasDatabaseHealthSummary
} from '../database-health.js';
import {
  focusedStoryNodeSummaries,
  intersectNodeIdSets,
  storyPresenterNodeIds,
  topologyBoardSectionForNode,
  buildTranscriptEditorSnapshot,
  parseSrtTranscriptCues,
  type TopologyBoardSectionKey
} from './layout.js';
import { FastTopologyCanvas } from './FastTopologyCanvas.js';
import type { CanvasKernelViewport } from '@create-something/canvas-kernel';

type Palette = Record<AtlasCanvasNodeKind, AtlasPaletteItem[]>;

type NodeDraft = {
  label: string;
  owner: string;
  status: AtlasCanvasNodeStatus;
  notes: string;
  evidence: string;
};

type DatabasePanelView = 'health' | 'records' | 'run' | 'bindings' | 'governance' | 'activity';
type TopologyLens = 'all' | TopologyBoardSectionKey;

type DatabaseRecordRow = {
  bindings: number;
  governanceRecords: number;
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  owner: string;
  status: AtlasCanvasNodeStatus;
  syncStatus: string;
  updatedAt: string;
};

type LocalTranscriptImportInput = {
  filePath: string;
  transcript: string;
};

type DatabaseBindingRow = {
  id: string;
  kind: string;
  label: string;
  nodeId: string;
  nodeLabel: string;
  source: string;
  status: string;
};

type DatabaseGovernanceRow = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  productId: AtlasGovernanceRecordProductId;
  source: string;
  status: string;
  title: string;
};

type DatabaseActivityRow = {
  id: string;
  kind: string;
  label: string;
  nodeId?: string;
  source: string;
  state: string;
};

type DatabaseRunRow = {
  bindingStatus: string;
  downstream: number;
  executor: string;
  gate: string;
  id: string;
  label: string;
  proofRecords: number;
  status: AtlasCanvasNodeStatus;
  upstream: number;
};

type DatabaseHealthSummary = AtlasDatabaseHealthSummary & {
  organization?: AtlasDatabaseHealthCard;
  performance?: AtlasDatabaseHealthCard;
};

type DatabaseSnapshot = {
  activity: DatabaseActivityRow[];
  bindings: DatabaseBindingRow[];
  governance: DatabaseGovernanceRow[];
  health: DatabaseHealthSummary;
  records: DatabaseRecordRow[];
  run: DatabaseRunRow[];
  summary: Array<{ label: string; value: number }>;
};

type DatabaseLensSummary = {
  active: boolean;
  label: string;
  query: string;
  totalNodes: number;
  visibleNodes: number;
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

const STORY_DETAIL_NODE_PREVIEW_LIMIT = 6;

const TOPOLOGY_LENSES: Array<{ id: TopologyLens; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Core' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'agent_plane', label: 'MCP / Agents' },
  { id: 'judgment', label: 'Policy / Canon' }
];

function topologyLensLabel(lens: TopologyLens): string {
  return TOPOLOGY_LENSES.find((item) => item.id === lens)?.label ?? 'All';
}

function buildPresenterStoryPayload(
  session: AtlasSession,
  visibleNodeIds: Set<string> | null
): {
  activeStepId: string;
  dimUnfocused: boolean;
  focusEdgeIds: string[];
  focusNodeIds: string[];
  narration: string;
  nextAction: string;
  steps: Array<Omit<AtlasStoryStep, 'id'> & { id: string }>;
  title: string;
} | null {
  const sourceNodes = visibleNodeIds
    ? session.canvas.nodes.filter((node) => visibleNodeIds.has(node.id))
    : session.canvas.nodes;
  if (!sourceNodes.length) return null;

  const overviewNodes = sourceNodes.slice(0, 16);
  const steps: Array<Omit<AtlasStoryStep, 'id'> & { id: string }> = [
    {
      focusNodeIds: overviewNodes.map((node) => node.id),
      id: 'canvas-overview',
      owner: 'Atlas Studio',
      proof: `${sourceNodes.length} visible records from ${session.canvas.nodes.length} total nodes.`,
      status: 'current',
      summary: 'Start from the currently visible operating map and the records nearest this view.',
      title: 'Current operating view'
    }
  ];

  for (const lens of TOPOLOGY_LENSES.filter((item) => item.id !== 'all')) {
    const lensNodes = sourceNodes
      .filter((node) => topologyBoardSectionForNode(node) === lens.id)
      .slice(0, 12);
    if (!lensNodes.length) continue;
    steps.push({
      focusNodeIds: lensNodes.map((node) => node.id),
      id: `canvas-${lens.id}`,
      owner: 'Atlas Studio',
      proof: `${lensNodes.length} representative ${lens.label.toLowerCase()} records.`,
      status: 'next',
      summary: `Review the ${lens.label.toLowerCase()} lane as an executable slice of the topology.`,
      title: lens.label
    });
  }

  return {
    activeStepId: steps[0].id,
    dimUnfocused: true,
    focusEdgeIds: [],
    focusNodeIds: steps[0].focusNodeIds ?? [],
    narration: 'Generated from the shared fast canvas so the operator and agents can inspect the same slice.',
    nextAction: 'Use Next to walk the topology lanes or select a node for receipt-level detail.',
    steps,
    title: `${formatClient(session.client)} / ${session.workflow}`
  };
}

function nodeMatchesTopologyQuery(node: AtlasCanvasNode, query: string): boolean {
  if (!query) return true;
  const haystack = [
    node.id,
    node.atlasId,
    node.label,
    displayText(node.owner),
    node.notes,
    node.evidence,
    node.sync?.summary,
    ...(node.bindings ?? []).flatMap((binding) => [
      binding.id,
      binding.kind,
      binding.label,
      binding.source,
      binding.selector
    ]),
    ...(node.governanceRecords ?? []).flatMap((record) => [
      record.id,
      record.productId,
      record.title,
      record.summary,
      record.source,
      record.status
    ])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

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

function displayText(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') {
    const record = value as { name?: unknown; label?: unknown; title?: unknown; url?: unknown };
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
    if (typeof record.title === 'string' && record.title.trim()) return record.title.trim();
    if (typeof record.url === 'string' && record.url.trim()) return record.url.trim();
  }
  return fallback;
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

function formatEditorTimestamp(microseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(microseconds / 1_000_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

function buildDatabaseSnapshot(
  session: AtlasSession | null,
  visibleNodeIds: Set<string> | null = null
): DatabaseSnapshot {
  if (!session) {
    return {
      activity: [],
      bindings: [],
      governance: [],
      health: {
        performance: undefined,
        proof: 'No topology diagnostics loaded',
        signals: [],
        summary: 'Atlas has not loaded an operating topology health pass yet.',
        title: 'Business health'
      },
      records: [],
      run: [],
      summary: [
        { label: 'Nodes', value: 0 },
        { label: 'Edges', value: 0 },
        { label: 'Bindings', value: 0 },
        { label: 'Proof', value: 0 },
        { label: 'Actions', value: 0 },
        { label: 'Notes', value: 0 }
      ]
    };
  }

  const scopedNodes = visibleNodeIds
    ? session.canvas.nodes.filter((node) => visibleNodeIds.has(node.id))
    : session.canvas.nodes;
  const scopedNodeIds = visibleNodeIds ?? new Set(scopedNodes.map((node) => node.id));
  const incomingEdges = new Map<string, number>();
  const outgoingEdges = new Map<string, number>();
  const scopedEdges = session.canvas.edges.filter(
    (edge) => scopedNodeIds.has(edge.source) && scopedNodeIds.has(edge.target)
  );
  for (const edge of scopedEdges) {
    outgoingEdges.set(edge.source, (outgoingEdges.get(edge.source) ?? 0) + 1);
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) ?? 0) + 1);
  }

  const records = scopedNodes.map((node) => ({
    bindings: node.bindings?.length ?? 0,
    governanceRecords: node.governanceRecords?.length ?? 0,
    id: node.id,
    kind: node.kind,
    label: node.label,
    owner: displayText(node.owner, node.createdBy || 'agent'),
    status: node.status,
    syncStatus: node.sync?.status ?? 'unbound',
    updatedAt: node.updatedAt
  }));
  const databaseHealth = buildAtlasDatabaseHealth(session, visibleNodeIds);

  const bindings = scopedNodes.flatMap((node) =>
    (node.bindings ?? []).map((binding) => {
      const check = node.sync?.checks.find((item) => item.id === binding.id);
      return {
        id: binding.id,
        kind: binding.kind,
        label: binding.label,
        nodeId: node.id,
        nodeLabel: node.label,
        source: binding.source,
        status: check?.status ?? node.sync?.status ?? 'unknown'
      };
    })
  );

  const governance = scopedNodes.flatMap((node) =>
    (node.governanceRecords ?? []).map((record) => ({
      id: record.id,
      nodeId: node.id,
      nodeLabel: node.label,
      productId: record.productId,
      source: record.source ?? record.attachedBy,
      status: record.status ?? 'attached',
      title: record.title
    }))
  );

  const proposalActivity =
    session.proposals?.flatMap((proposal) =>
      proposal.actions
        .filter((action) => !visibleNodeIds || !action.nodeId || visibleNodeIds.has(action.nodeId))
        .map((action) => ({
          id: action.id,
          kind: action.risk,
          label: action.title,
          nodeId: action.nodeId,
          source: proposal.profile,
          state: action.status
        }))
    ) ?? [];
  const suggestionActivity = session.suggestions.map((suggestion) => ({
    id: suggestion.id,
    kind: 'suggestion',
    label: suggestion.payload.label,
    source: 'agent',
    state: suggestion.status
  }));
  const observationActivity = session.observations.map((observation) => ({
    id: observation.id,
    kind: 'note',
    label: observation.text,
    source: observation.source,
    state: new Date(observation.createdAt).toLocaleTimeString()
  }));

  const run = scopedNodes.map((node) => {
    const bindingStatus = node.sync?.status ?? (node.bindings?.length ? 'unknown' : 'unbound');
    const proofRecords = node.governanceRecords?.length ?? 0;
    const gate =
      node.status === 'stop'
        ? 'blocked'
        : bindingStatus === 'missing'
          ? 'missing binding'
          : bindingStatus === 'partial'
            ? 'partial binding'
            : proofRecords || node.evidence?.trim()
              ? 'ready'
              : 'needs proof';
    return {
      bindingStatus,
      downstream: outgoingEdges.get(node.id) ?? 0,
      executor: displayText(node.owner, formatKind(node.kind)),
      gate,
      id: node.id,
      label: node.label,
      proofRecords,
      status: node.status,
      upstream: incomingEdges.get(node.id) ?? 0
    };
  });

  return {
    activity: [...proposalActivity, ...suggestionActivity, ...observationActivity],
    bindings,
    governance,
    health: {
      ...databaseHealth.topology,
      organization: databaseHealth.organization ?? undefined,
      performance: databaseHealth.performance ?? undefined
    },
    records,
    run,
    summary: [
      { label: 'Nodes', value: scopedNodes.length },
      { label: 'Edges', value: scopedEdges.length },
      { label: 'Bindings', value: bindings.length },
      { label: 'Proof', value: governance.length },
      { label: 'Actions', value: proposalActivity.length },
      { label: 'Notes', value: session.observations.length }
    ]
  };
}

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
  useEffect(() => {
    setDetailsOpen(false);
  }, [story?.activeStepId]);

  if (!story?.active && !story?.questions.length) return null;

  const openQuestions = story.questions.filter((question) => question.status === 'open');
  const steps = story.steps ?? [];
  const activeStepIndex = steps.findIndex((step) => step.id === story.activeStepId);
  const activeStep = steps[activeStepIndex] ?? steps.find((step) => step.status === 'current');
  const focusedNodes = session ? focusedStoryNodeSummaries(session) : [];
  const focusedNodePreview = focusedNodes.slice(0, STORY_DETAIL_NODE_PREVIEW_LIMIT);
  const hiddenFocusedNodeCount = Math.max(0, focusedNodes.length - focusedNodePreview.length);
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
              {focusedNodePreview.map((node) => (
                <article className="story-node-card" key={node.id}>
                  <div className="story-node-card-title">
                    <span className={`status-chip ${node.status}`}>{node.status}</span>
                    <span>{formatKind(node.kind)}</span>
                  </div>
                  <strong>{node.label}</strong>
                  <em>{displayText(node.owner, 'Unassigned')}</em>
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
              {hiddenFocusedNodeCount ? (
                <p className="story-detail-overflow">
                  Showing {focusedNodePreview.length} of {focusedNodes.length} focused nodes. Use
                  the highlighted canvas nodes for the rest.
                </p>
              ) : null}
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

function DatabaseLayerPanel({
  activeView,
  lens,
  onChangeView,
  onClose,
  onSelectNode,
  session,
  visibleNodeIds
}: {
  activeView: DatabasePanelView;
  lens: DatabaseLensSummary;
  onChangeView: (view: DatabasePanelView) => void;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  session: AtlasSession | null;
  visibleNodeIds: Set<string> | null;
}): React.ReactElement {
  const snapshot = useMemo(() => buildDatabaseSnapshot(session, visibleNodeIds), [session, visibleNodeIds]);
  const views: Array<{ icon: LucideIcon; id: DatabasePanelView; label: string; total: number }> = [
    { icon: Gauge, id: 'health', label: 'Health', total: snapshot.health.signals.length },
    { icon: Rows3, id: 'records', label: 'Records', total: snapshot.records.length },
    { icon: Workflow, id: 'run', label: 'Run', total: snapshot.run.length },
    { icon: Braces, id: 'bindings', label: 'Bindings', total: snapshot.bindings.length },
    { icon: FileText, id: 'governance', label: 'Proof', total: snapshot.governance.length },
    { icon: Terminal, id: 'activity', label: 'Activity', total: snapshot.activity.length }
  ];

  return (
    <aside className="database-panel" aria-label="Database layer">
      <div className="database-panel-header">
        <span className="title-lockup">
          <span className="title-icon">
            <Database aria-hidden="true" />
          </span>
          <span>
            <strong>Database Layer</strong>
            <em>
              {lens.active
                ? `${lens.label}${lens.query ? ` / ${lens.query}` : ''}: ${lens.visibleNodes} records in view / ${lens.totalNodes} total`
                : 'Atlas workflow state, bindings, governance records, and agent activity'}
            </em>
          </span>
        </span>
        <button
          aria-label="Close database layer"
          className="icon-only"
          onClick={onClose}
          title="Close database layer"
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="database-summary" aria-label="Database summary">
        {lens.active ? (
          <span className="database-stat lens-stat">
            <strong>{lens.query || lens.label}</strong>
            <span>Lens</span>
          </span>
        ) : null}
        {snapshot.summary.map((item) => (
          <span className="database-stat" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </span>
        ))}
      </div>
      <div className="database-tabs" aria-label="Database views">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              aria-pressed={activeView === view.id}
              className="database-tab"
              key={view.id}
              onClick={() => onChangeView(view.id)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>{view.label}</span>
              <em>{view.total}</em>
            </button>
          );
        })}
      </div>
      <div className="database-table-wrap">
        {activeView === 'health' ? (
          <div className="database-health" aria-label="Topology diagnostics">
            <div className="database-health-summaries">
              <div className="database-health-summary">
                <span>Diagnostics</span>
                <strong>{snapshot.health.title}</strong>
                <p>{snapshot.health.summary}</p>
                <em>{snapshot.health.proof}</em>
              </div>
              {snapshot.health.performance ? (
                <div className="database-health-summary">
                  <span>Speed</span>
                  <strong>{snapshot.health.performance.title}</strong>
                  <p>{snapshot.health.performance.summary}</p>
                  {snapshot.health.performance.observation ? (
                    <p>{snapshot.health.performance.observation}</p>
                  ) : null}
                  <em>{snapshot.health.performance.proof}</em>
                </div>
              ) : null}
              {snapshot.health.organization ? (
                <div className="database-health-summary">
                  <span>Organization</span>
                  <strong>{snapshot.health.organization.title}</strong>
                  <p>{snapshot.health.organization.summary}</p>
                  {snapshot.health.organization.observation ? (
                    <p>{snapshot.health.organization.observation}</p>
                  ) : null}
                  <em>{snapshot.health.organization.proof}</em>
                </div>
              ) : null}
            </div>
            <table className="database-table health-table">
              <thead>
                <tr>
                  <th scope="col">Signal</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Node</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.health.signals.length ? (
                  snapshot.health.signals.map((signal) => (
                    <tr key={signal.id}>
                      <td>{signal.text}</td>
                      <td>
                        <span className={`story-signal ${signal.severity}`}>{signal.severity}</span>
                      </td>
                      <td>
                        {signal.nodeId ? (
                          <button
                            className="database-row-button"
                            onClick={() => onSelectNode(signal.nodeId as string)}
                            title={`Select ${signal.nodeLabel ?? signal.nodeId}`}
                            type="button"
                          >
                            {signal.nodeLabel ?? signal.nodeId}
                          </button>
                        ) : (
                          'Whole map'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No topology diagnostics signals are attached yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
        {activeView === 'records' ? (
          <table className="database-table">
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">Kind</th>
                <th scope="col">Owner</th>
                <th scope="col">Status</th>
                <th scope="col">Sync</th>
                <th scope="col">Refs</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.records.length ? (
                snapshot.records.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="database-row-button"
                        onClick={() => onSelectNode(row.id)}
                        title={`Select ${row.label}`}
                        type="button"
                      >
                        {row.label}
                      </button>
                    </td>
                    <td>{formatKind(row.kind)}</td>
                    <td>{row.owner}</td>
                    <td>
                      <span className={`status-chip ${row.status}`}>{row.status}</span>
                    </td>
                    <td>
                      <span className={`node-sync ${row.syncStatus}`}>{row.syncStatus}</span>
                    </td>
                    <td>
                      {row.bindings} binding{row.bindings === 1 ? '' : 's'} /{' '}
                      {row.governanceRecords} proof
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No Atlas records loaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : null}
        {activeView === 'run' ? (
          <table className="database-table">
            <thead>
              <tr>
                <th scope="col">Executable unit</th>
                <th scope="col">Executor</th>
                <th scope="col">Gate</th>
                <th scope="col">Status</th>
                <th scope="col">Bindings</th>
                <th scope="col">Deps</th>
                <th scope="col">Proof</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.run.length ? (
                snapshot.run.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="database-row-button"
                        onClick={() => onSelectNode(row.id)}
                        title={`Select ${row.label}`}
                        type="button"
                      >
                        {row.label}
                      </button>
                    </td>
                    <td>{row.executor}</td>
                    <td>{row.gate}</td>
                    <td>
                      <span className={`status-chip ${row.status}`}>{row.status}</span>
                    </td>
                    <td>
                      <span className={`node-sync ${row.bindingStatus}`}>
                        {row.bindingStatus}
                      </span>
                    </td>
                    <td>
                      {row.upstream} in / {row.downstream} out
                    </td>
                    <td>{row.proofRecords}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No executable workflow units loaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : null}
        {activeView === 'bindings' ? (
          <table className="database-table">
            <thead>
              <tr>
                <th scope="col">Binding</th>
                <th scope="col">Node</th>
                <th scope="col">Kind</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.bindings.length ? (
                snapshot.bindings.map((row) => (
                  <tr key={`${row.nodeId}-${row.id}`}>
                    <td>
                      <button
                        className="database-row-button"
                        onClick={() => onSelectNode(row.nodeId)}
                        title={`Select ${row.nodeLabel}`}
                        type="button"
                      >
                        {row.label}
                      </button>
                    </td>
                    <td>{row.nodeLabel}</td>
                    <td>{row.kind}</td>
                    <td>{row.source}</td>
                    <td>
                      <span className={`node-sync ${row.status}`}>{row.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No bindings attached yet. Run Check to populate sync state.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : null}
        {activeView === 'governance' ? (
          <table className="database-table">
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">Product</th>
                <th scope="col">Node</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.governance.length ? (
                snapshot.governance.map((row) => (
                  <tr key={`${row.nodeId}-${row.productId}-${row.id}`}>
                    <td>
                      <button
                        className="database-row-button"
                        onClick={() => onSelectNode(row.nodeId)}
                        title={`Select ${row.nodeLabel}`}
                        type="button"
                      >
                        {row.title}
                      </button>
                    </td>
                    <td>
                      <span className={`node-record product-${row.productId}`}>
                        {formatProductId(row.productId)}
                      </span>
                    </td>
                    <td>{row.nodeLabel}</td>
                    <td>{row.source}</td>
                    <td>{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No Signal, Decision, or Proof records are attached yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : null}
        {activeView === 'activity' ? (
          <table className="database-table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Type</th>
                <th scope="col">Source</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.activity.length ? (
                snapshot.activity.slice(0, 80).map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td>
                      {row.nodeId ? (
                        <button
                          className="database-row-button"
                          onClick={() => onSelectNode(row.nodeId as string)}
                          type="button"
                        >
                          {row.label}
                        </button>
                      ) : (
                        row.label
                      )}
                    </td>
                    <td>{row.kind}</td>
                    <td>{row.source}</td>
                    <td>{row.state}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No observations, suggestions, or review actions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : null}
      </div>
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

function MediaEditorPanel({
  onApplyProposal,
  onClose,
  onDecideProposal,
  onInitialize,
  onRender,
  onRequestCodexProposal,
  open,
  project,
  sessionId
}: {
  onApplyProposal: (proposalId: string) => void;
  onClose: () => void;
  onDecideProposal: (proposalId: string, decision: 'approved' | 'rejected') => void;
  onInitialize: (sourcePath: string, timestampedTranscript: string, includeTitleOverlay: boolean) => void;
  onRender: () => void;
  onRequestCodexProposal: (instruction: string, privateContentConfirmed: boolean) => void;
  open: boolean;
  project: TranscriptEditorProject | null;
  sessionId: string;
}): React.ReactElement {
  const [instruction, setInstruction] = useState('');
  const [privateContentConfirmed, setPrivateContentConfirmed] = useState(false);
  const [sourcePath, setSourcePath] = useState('');
  const [timestampedTranscript, setTimestampedTranscript] = useState('');
  const [includeTitleOverlay, setIncludeTitleOverlay] = useState(false);
  const revision = project?.revisions.find((candidate) => candidate.id === project.currentRevisionId) ?? null;
  const operationById = new Map(revision?.cutList.map((operation) => [operation.id, operation]) ?? []);
  const clips = revision?.graph.nodes.filter((node) => node.kind === 'clip') ?? [];
  const graphNodes = revision?.graph.nodes ?? [];
  const graphEdges = revision?.graph.edges ?? [];
  const latestCompletedReceipt = project?.receipts.slice().reverse().find((receipt) => receipt.status === 'completed');

  return (
    <aside className={`drawer media-editor ${open ? 'open' : ''}`} aria-label="Transcript editor">
      <section className="drawer-section">
        <div className="section-title">
          <span className="title-lockup">
            <span className="title-icon"><Clapperboard aria-hidden="true" /></span>
            <span><strong>Transcript edit</strong><em>{project ? `${clips.length} durable clip nodes` : 'No media project attached'}</em></span>
          </span>
          <button aria-label="Close transcript editor" className="icon-only" onClick={onClose} title="Close transcript editor" type="button"><X aria-hidden="true" /></button>
        </div>
        {!project ? (
          <div className="media-actions media-import">
            <p className="empty">Start a local project from a source recording and timestamped transcript. The source stays on this Mac.</p>
            <label>
              <span>Local media file path</span>
              <input onChange={(event) => setSourcePath(event.target.value)} placeholder="/Users/you/Movies/recording.mp4" value={sourcePath} />
            </label>
            <label>
              <span>Timestamped transcript</span>
              <textarea onChange={(event) => setTimestampedTranscript(event.target.value)} placeholder={'00:00.000 --> 00:03.500 | Opening statement.\n00:03.500 --> 00:08.000 | Main point.'} value={timestampedTranscript} />
            </label>
            <label className="media-confirmation">
              <input checked={includeTitleOverlay} onChange={(event) => setIncludeTitleOverlay(event.target.checked)} type="checkbox" />
              <span>Add a basic local title overlay to this initial composition.</span>
            </label>
            <button className="primary" disabled={!sourcePath.trim() || !timestampedTranscript.trim()} onClick={() => onInitialize(sourcePath, timestampedTranscript, includeTitleOverlay)} type="button">
              <Clapperboard aria-hidden="true" /><span>Create local media project</span>
            </button>
          </div>
        ) : !revision ? (
          <p className="empty">The attached media project has no current revision.</p>
        ) : (
          <>
            <div className="media-summary">
              <span><strong>Revision</strong><em>{revision.id}</em></span>
              <span><strong>Transcript</strong><em>{project.transcriptSegments.length} segments</em></span>
              <span><strong>Render</strong><em>{project.receipts.at(-1)?.status ?? 'not requested'}</em></span>
            </div>
            <section className="media-graph" aria-label="Media dependency graph">
              <div className="media-graph-heading">
                <span><Waypoints aria-hidden="true" /><strong>Media dependency graph</strong></span>
                <em>{graphNodes.length} nodes · {graphEdges.length} edges</em>
              </div>
              <div className="media-graph-flow">
                <article className="media-graph-node"><strong>Source asset</strong><span>Immutable local recording</span></article>
                <span aria-hidden="true" className="media-graph-edge">↓ produces</span>
                <article className="media-graph-node"><strong>Transcript + cut list</strong><span>{project.transcriptSegments.length} timestamped segments</span></article>
                <span aria-hidden="true" className="media-graph-edge">↓ produces</span>
                <div className="media-graph-clips">
                  {clips.map((clip) => <article className="media-graph-node clip" key={`graph:${clip.id}`}>
                    <strong>{clip.id}</strong><span>{clip.diffs?.length ?? 0} durable decision diffs</span>
                  </article>)}
                </div>
                <span aria-hidden="true" className="media-graph-edge">↓ projects</span>
                <article className="media-graph-node"><strong>Timeline + render</strong><span>Temporal projection and receipt-bound output</span></article>
              </div>
              <p>Each clip is connected as <code>cut-list → clip → timeline</code>; a Codex run attaches to a proposal, never to an individual clip.</p>
            </section>
            <div className="media-timeline" aria-label="Timeline projection">
              {clips.map((clip) => {
                const operation = clip.cutOperationId ? operationById.get(clip.cutOperationId) : undefined;
                return <article className="media-clip-node" key={clip.id}>
                  <div className="media-clip-title"><span>Clip node</span><strong>{clip.id}</strong></div>
                  <p>{operation ? `${operation.startUs}–${operation.endUs} µs · ${operation.reason}` : 'Missing cut operation'}</p>
                  <span className="media-muted">Decision diffs are reviewable; hidden model thoughts are not recorded.</span>
                  <div className="media-history"><History aria-hidden="true" />{clip.diffs?.map((entry) => <span key={entry.id}>{entry.event} · {entry.summary}</span>)}</div>
                </article>;
              })}
            </div>
            <div className="media-actions">
              <label>
                <span>Ask Codex for a diff</span>
                <textarea onChange={(event) => setInstruction(event.target.value)} placeholder="e.g. Remove repeated filler while preserving the full argument." value={instruction} />
              </label>
              <label className="media-confirmation">
                <input checked={privateContentConfirmed} onChange={(event) => setPrivateContentConfirmed(event.target.checked)} type="checkbox" />
                <span>I approve sending this transcript context to my managed Codex session.</span>
              </label>
              <button className="primary" disabled={!instruction.trim() || !privateContentConfirmed} onClick={() => onRequestCodexProposal(instruction, privateContentConfirmed)} type="button">
                <Bot aria-hidden="true" /><span>Propose diff</span>
              </button>
              <button className="subtle-button" onClick={onRender} type="button"><Clapperboard aria-hidden="true" /><span>Preview / render local MP4</span></button>
            </div>
            {project.proposals.length ? <div className="media-proposals">
              {project.proposals.slice().reverse().map((proposal) => <article className="media-proposal" key={proposal.id}>
                <strong>{proposal.status} · {proposal.id}</strong>
                <p>{proposal.rationale}</p>
                <em>{proposal.operations.length} proposed cut operations · managed usage: {proposal.agentRun?.usage ?? 'not agent-generated'}</em>
                {proposal.status === 'proposed' ? <div><button className="primary" onClick={() => onDecideProposal(proposal.id, 'approved')} type="button">Approve</button><button className="subtle-button danger" onClick={() => onDecideProposal(proposal.id, 'rejected')} type="button">Reject</button></div> : null}
                {proposal.status === 'approved' ? <button className="primary" onClick={() => onApplyProposal(proposal.id)} type="button">Apply approved diff</button> : null}
              </article>)}
            </div> : null}
          </>
        )}
      </section>
      {project?.receipts.length ? <section className="drawer-section">
        <div className="section-title compact"><span className="title-lockup"><span className="title-icon"><Check aria-hidden="true" /></span><span><strong>Render receipts</strong><em>Local inspection proof</em></span></span></div>
        {project.receipts.slice(-3).reverse().map((receipt) => <article className="media-receipt" key={receipt.id}>
          <strong>{receipt.status} · {receipt.request.compositionId}</strong>
          <em>{receipt.inspection ? `${receipt.inspection.videoCodec} · ${receipt.inspection.width}×${receipt.inspection.height} · ${receipt.inspection.audioStreams} audio` : 'Inspection unavailable'}</em>
          <span>{receipt.cacheHit ? 'cache hit' : 'fresh render'} · {receipt.request.revisionId}</span>
        </article>)}
        {latestCompletedReceipt ? <video className="media-preview" controls src={`/api/sessions/${encodeURIComponent(sessionId)}/media-project/renders/${encodeURIComponent(latestCompletedReceipt.id)}.mp4`} /> : null}
      </section> : null}
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

function LocalTranscriptImportForm({
  onImport
}: {
  onImport: (input: LocalTranscriptImportInput) => Promise<void>;
}): React.ReactElement {
  const [filePath, setFilePath] = useState('');
  const [transcript, setTranscript] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    try {
      if (!filePath.trim()) throw new Error('Enter the absolute path to a local media file.');
      parseSrtTranscriptCues(transcript);
      setSubmitting(true);
      await onImport({ filePath: filePath.trim(), transcript });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Local import could not start.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="transcript-editor-import" onSubmit={(event) => void submit(event)}>
      <label>
        <span>Local media path</span>
        <input
          onChange={(event) => setFilePath(event.target.value)}
          placeholder="/Users/you/Movies/interview.mp4 or voiceover.m4a"
          spellCheck={false}
          value={filePath}
        />
      </label>
      <label>
        <span>Transcript SRT</span>
        <textarea
          onChange={(event) => setTranscript(event.target.value)}
          placeholder={'1\n00:00:00,000 --> 00:00:01,250\nHello there.'}
          spellCheck={false}
          value={transcript}
        />
      </label>
      <p>
        Video or audio stays on this machine. Pasted SRT becomes visible timestamped clips; no model or provider is contacted. Audio-only sources support transcript review and proposals; local video export remains unavailable.
      </p>
      {notice ? <p className="transcript-editor-import-notice" role="alert">{notice}</p> : null}
      <button className="primary" disabled={submitting} type="submit">
        <Film aria-hidden="true" />
        <span>{submitting ? 'Importing local source…' : 'Import local source'}</span>
      </button>
    </form>
  );
}

function TranscriptEditorPanel({
  onApplyProposal,
  onClose,
  onDecideProposal,
  onImport,
  onProposeRemoval,
  project
}: {
  onApplyProposal: (proposalId: string) => void;
  onClose: () => void;
  onDecideProposal: (proposalId: string, decision: 'approved' | 'rejected') => void;
  onImport: (input: LocalTranscriptImportInput) => Promise<void>;
  onProposeRemoval: (operationId: string) => void;
  project: TranscriptEditorProject | null;
}): React.ReactElement {
  const snapshot = useMemo(
    () => (project ? buildTranscriptEditorSnapshot(project) : null),
    [project]
  );

  return (
    <aside className="transcript-editor-panel" aria-label="Transcript editor">
      <div className="database-panel-header">
        <span className="title-lockup">
          <span className="title-icon">
            <Film aria-hidden="true" />
          </span>
          <span>
            <strong>Transcript editor</strong>
            <em>
              {snapshot
                ? 'Accepted revision, derived timeline, dependency graph, and visible clip diffs'
                : 'No local video project has been imported into this Atlas session.'}
            </em>
          </span>
        </span>
        <span className="transcript-editor-header-actions">
          {project ? (
            <a
              className="transcript-editor-caption-link"
              download
              href={`/api/sessions/${encodeURIComponent(project.atlasSessionId)}/transcript-project/captions.srt`}
            >
              Download SRT
            </a>
          ) : null}
          <button
            aria-label="Close transcript editor"
            className="icon-only"
            onClick={onClose}
            title="Close transcript editor"
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </span>
      </div>
      {snapshot ? (
        <>
          <div className="database-summary" aria-label="Transcript project summary">
            <span className="database-stat">
              <strong>{snapshot.source.width} × {snapshot.source.height}</strong>
              <span>{snapshot.source.hasAudio ? 'Local source with audio' : 'Local silent source'}</span>
            </span>
            <span className="database-stat">
              <strong>{snapshot.revision.id}</strong>
              <span>Accepted revision</span>
            </span>
            <span className="database-stat">
              <strong>{snapshot.timeline.clips.length}</strong>
              <span>{formatEditorTimestamp(snapshot.timeline.durationUs)} timeline</span>
            </span>
            <span className="database-stat">
              <strong>{snapshot.diffs.length}</strong>
              <span>Visible clip diffs</span>
            </span>
          </div>
          <div className="transcript-editor-graph" aria-label="Transcript dependency graph summary">
            <span>{snapshot.graph.nodes} graph nodes</span>
            <span>{snapshot.graph.edges} edges</span>
            <span>{snapshot.graph.clipNodes.length} clip nodes</span>
          </div>
          <div className="transcript-editor-content">
            <section className="transcript-editor-section" aria-label="Derived timeline clips">
              <div className="transcript-editor-section-heading">
                <strong>Timeline clips</strong>
                <span>{formatEditorTimestamp(snapshot.timeline.durationUs)} accepted</span>
              </div>
              <ol className="transcript-editor-list">
                {snapshot.timeline.clips.map((clip) => (
                  <li key={clip.id}>
                    <time>{formatEditorTimestamp(clip.startUs)}–{formatEditorTimestamp(clip.endUs)}</time>
                    <span>
                      {clip.text || 'Untitled transcript clip'}
                      <button
                        className="transcript-editor-action"
                        onClick={() => onProposeRemoval(clip.operationId)}
                        type="button"
                      >
                        Propose removal
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="transcript-editor-section" aria-label="Dependency graph clips">
              <div className="transcript-editor-section-heading">
                <strong>Clip nodes</strong>
                <span>Graph-derived</span>
              </div>
              <ol className="transcript-editor-list compact">
                {snapshot.graph.clipNodes.map((node) => (
                  <li key={node.id}>
                    <code>{node.id}</code>
                    <span>{node.operationId ?? 'No operation reference'}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="transcript-editor-section" aria-label="Clip diff history">
              <div className="transcript-editor-section-heading">
                <strong>Diff history</strong>
                <span>Immutable events</span>
              </div>
              <ol className="transcript-editor-list compact">
                {snapshot.diffs.map((diff) => (
                  <li key={`${diff.nodeId}:${diff.at}:${diff.event}`}>
                    <time>{diff.event}</time>
                    <span>{diff.summary}</span>
                  </li>
                ))}
              </ol>
              {project?.proposals.length ? (
                <ol className="transcript-editor-proposals" aria-label="Transcript edit proposals">
                  {project.proposals.map((proposal) => (
                    <li key={proposal.id}>
                      <strong>{proposal.status}</strong>
                      <span>{proposal.rationale}</span>
                      {proposal.status === 'proposed' ? (
                        <span className="transcript-editor-actions">
                          <button onClick={() => onDecideProposal(proposal.id, 'approved')} type="button">Approve</button>
                          <button onClick={() => onDecideProposal(proposal.id, 'rejected')} type="button">Reject</button>
                        </span>
                      ) : null}
                      {proposal.status === 'approved' ? (
                        <button onClick={() => onApplyProposal(proposal.id)} type="button">Apply approved edit</button>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          </div>
        </>
      ) : (
        <div className="transcript-editor-empty">
          <p>
            Importing a local source creates an explicit source asset, transcript, clips, and revision.
          </p>
          <LocalTranscriptImportForm onImport={onImport} />
        </div>
      )}
    </aside>
  );
}

function AtlasStudio(): React.ReactElement {
  const sessionId = useMemo(getSessionId, []);
  const initialStoryPanelOffset = useMemo(() => readStoredStoryPanelOffset(sessionId), [sessionId]);
  const [session, setSession] = useState<AtlasSession | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeNodeIds, setActiveNodeIds] = useState<Set<string>>(() => new Set());
  const [railOpen, setRailOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [mediaEditorOpen, setMediaEditorOpen] = useState(false);
  const [mediaProject, setMediaProject] = useState<TranscriptEditorProject | null>(null);
  const [transcriptEditorOpen, setTranscriptEditorOpen] = useState(false);
  const [transcriptProject, setTranscriptProject] = useState<TranscriptEditorProject | null>(null);
  const [databaseOpen, setDatabaseOpen] = useState(false);
  const [databaseView, setDatabaseView] = useState<DatabasePanelView>('records');
  const [presenterMode, setPresenterMode] = useState(false);
  const [presenterNotice, setPresenterNotice] = useState<string | null>(null);
  const [topologyLens, setTopologyLens] = useState<TopologyLens>('all');
  const [topologyQuery, setTopologyQuery] = useState('');
  const [fastFitRequest, setFastFitRequest] = useState(0);
  const [fastFocusRequest, setFastFocusRequest] = useState<{
    nodeId: string;
    requestId: number;
  } | null>(null);
  const [canvasViewport, setCanvasViewport] = useState<CanvasKernelViewport>({
    x: 0,
    y: 0,
    zoom: 1
  });
  const [storyPanelOffset, setStoryPanelOffset] =
    useState<StoryPanelOffset>(initialStoryPanelOffset);
  const [draft, setDraft] = useState<NodeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healSummary, setHealSummary] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<AtlasSession | null>(null);
  const nodeSignatures = useRef<Map<string, string>>(new Map());
  const activityTimer = useRef<number | null>(null);
  const storySelectionKey = useRef<string | null>(null);
  const storyPanelDrag = useRef<{
    originX: number;
    originY: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const presenterModeInitialized = useRef(false);

  const largeTopology = (session?.canvas.nodes.length ?? 0) >= 96;
  const normalizedTopologyQuery = topologyQuery.trim().toLowerCase();
  const topologyLensCounts = useMemo(() => {
    const countsByLens = new Map<TopologyLens, number>(TOPOLOGY_LENSES.map((lens) => [lens.id, 0]));
    const nodes = session?.canvas.nodes ?? [];
    countsByLens.set('all', nodes.length);
    for (const node of nodes) {
      const section = topologyBoardSectionForNode(node);
      countsByLens.set(section, (countsByLens.get(section) ?? 0) + 1);
    }
    return countsByLens;
  }, [session]);
  const visibleNodeIds = useMemo(() => {
    if (!session || (topologyLens === 'all' && !normalizedTopologyQuery)) return null;
    return new Set(
      session.canvas.nodes
        .filter((node) => topologyLens === 'all' || topologyBoardSectionForNode(node) === topologyLens)
        .filter((node) => nodeMatchesTopologyQuery(node, normalizedTopologyQuery))
        .map((node) => node.id)
    );
  }, [normalizedTopologyQuery, session, topologyLens]);
  const storyVisibleNodeIds = useMemo(
    () => (presenterMode && session ? storyPresenterNodeIds(session) : null),
    [presenterMode, session]
  );
  const activePresenterStory = Boolean(storyVisibleNodeIds);
  const canvasVisibleNodeIds = useMemo(
    () => intersectNodeIdSets(visibleNodeIds, storyVisibleNodeIds),
    [storyVisibleNodeIds, visibleNodeIds]
  );
  const selectedNode = useMemo(
    () => session?.canvas.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, session]
  );
  const counts = `${session?.canvas.nodes.length ?? 0} nodes / ${session?.canvas.edges.length ?? 0} edges`;
  const visibleCounts =
    canvasVisibleNodeIds
      ? `${canvasVisibleNodeIds.size} of ${session?.canvas.nodes.length ?? 0} nodes`
      : counts;
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

  const loadMediaProject = useCallback(async () => {
    try {
      const project = await requestJson<TranscriptEditorProject>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project`
      );
      setMediaProject(project);
    } catch {
      setMediaProject(null);
    }
  }, [sessionId]);

  const loadTranscriptProject = useCallback(async () => {
    try {
      const project = await requestJson<TranscriptEditorProject>(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcript-project`
      );
      setTranscriptProject(project);
    } catch {
      setTranscriptProject(null);
    }
  }, [sessionId]);

  const importTranscriptProject = useCallback(async ({ filePath, transcript }: LocalTranscriptImportInput) => {
    const result = await requestJson<TranscriptEditorProject>(
      `/api/sessions/${encodeURIComponent(sessionId)}/transcript-project/intake`,
      {
        body: JSON.stringify({
          assetId: `source:${Date.now().toString(36)}`,
          filePath,
          projectId: `transcript:${Date.now().toString(36)}`,
          transcriptSegments: parseSrtTranscriptCues(transcript)
        }),
        method: 'POST'
      }
    );
    setTranscriptProject(result);
    setError(null);
  }, [sessionId]);

  const initializeMediaProject = useCallback(async (sourcePath: string, transcript: string, includeTitleOverlay: boolean) => {
    try {
      const result = await requestJson<{ project: TranscriptEditorProject; session: AtlasSession }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project/import`,
        {
          body: JSON.stringify({
            id: `media_${Date.now().toString(36)}`,
            sourcePath,
            transcript,
            includeTitleOverlay
          }),
          method: 'POST'
        }
      );
      setMediaProject(result.project);
      applySession(result.session, 'local');
      setError(null);
    } catch {
      setError('Could not create the local media project. Check the local video and timestamped transcript format.');
    }
  }, [applySession, sessionId]);

  const requestCodexMediaProposal = useCallback(async (instruction: string, privateContentConfirmed: boolean) => {
    try {
      const result = await requestJson<{ project: TranscriptEditorProject; session: AtlasSession }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project/codex-proposals`,
        {
          body: JSON.stringify({
            id: `codex_${Date.now().toString(36)}`,
            operatorPrompt: instruction,
            operatorConfirmedPrivateContent: privateContentConfirmed
          }),
          method: 'POST'
        }
      );
      setMediaProject(result.project);
      applySession(result.session, 'local');
      setError(null);
    } catch {
      setError('Could not request a managed Codex diff. Confirm the local project and try again.');
    }
  }, [applySession, sessionId]);

  const decideMediaProposal = useCallback(async (proposalId: string, decision: 'approved' | 'rejected') => {
    try {
      const result = await requestJson<{ project: TranscriptEditorProject; session: AtlasSession }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project/proposals/${encodeURIComponent(proposalId)}`,
        { body: JSON.stringify({ decision, decidedBy: 'operator' }), method: 'PATCH' }
      );
      setMediaProject(result.project);
      applySession(result.session, 'local');
      setError(null);
    } catch {
      setError('Could not record that proposal decision. The diff has not been applied.');
    }
  }, [applySession, sessionId]);

  const applyMediaProposal = useCallback(async (proposalId: string) => {
    try {
      const result = await requestJson<{ project: TranscriptEditorProject; session: AtlasSession }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project/proposals/${encodeURIComponent(proposalId)}/apply`,
        { body: JSON.stringify({ revisionId: `revision_${Date.now().toString(36)}` }), method: 'POST' }
      );
      setMediaProject(result.project);
      applySession(result.session, 'local');
      setError(null);
    } catch {
      setError('Could not apply that approved diff. The current revision is unchanged.');
    }
  }, [applySession, sessionId]);

  const renderMediaProject = useCallback(async () => {
    try {
      const result = await requestJson<{ project: TranscriptEditorProject }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/media-project/render`,
        { body: JSON.stringify({ requestId: `render_${Date.now().toString(36)}` }), method: 'POST' }
      );
      setMediaProject(result.project);
      await loadSession();
      setError(null);
    } catch {
      setError('Could not render the local MP4. No successful render receipt was added.');
    }
  }, [loadSession, sessionId]);

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
    if (session?.mediaProject) void loadMediaProject();
    else setMediaProject(null);
  }, [loadMediaProject, session?.mediaProject?.updatedAt]);

  useEffect(() => {
    if (!session) return;
    if (!presenterModeInitialized.current && session.story?.active && session.story.steps.length) {
      presenterModeInitialized.current = true;
      setPresenterMode(true);
    }
  }, [session]);

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
    if (!selectedNodeId || !visibleNodeIds || visibleNodeIds.has(selectedNodeId)) return;
    setSelectedNodeId(null);
    setInspectorOpen(false);
  }, [selectedNodeId, visibleNodeIds]);

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

  const focusNodeOnCanvas = useCallback(
    (nodeId: string) => {
      setFastFocusRequest({ nodeId, requestId: Date.now() });
    },
    []
  );

  const selectFastNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setInspectorOpen(true);
  }, []);

  const selectDatabaseNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setInspectorOpen(true);
      focusNodeOnCanvas(nodeId);
    },
    [focusNodeOnCanvas]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleCanvasViewportChange = useCallback(
    (viewport: CanvasKernelViewport) => {
      setCanvasViewport(viewport);
      localStorage.setItem(`atlas-studio:${sessionId}:canvas-kernel-viewport`, JSON.stringify(viewport));
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
      const stage = canvasStageRef.current;
      const center = {
        x: ((stage?.clientWidth ?? window.innerWidth) / 2 - canvasViewport.x) / canvasViewport.zoom,
        y: ((stage?.clientHeight ?? window.innerHeight) / 2 - canvasViewport.y) / canvasViewport.zoom
      };
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
      const newest = next.canvas.nodes.at(-1);
      setSelectedNodeId(newest?.id ?? null);
      applySession(next, 'local');
      setInspectorOpen(true);
    },
    [applySession, canvasViewport, sessionId]
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
    setFastFitRequest((request) => request + 1);
    setFastFocusRequest(null);
  }, []);

  useEffect(() => {
    if (!largeTopology) return;
    window.setTimeout(() => fitCanvas(), 80);
  }, [fitCanvas, largeTopology, topologyLens]);

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
    setFastFocusRequest({ nodeId: firstFocusedNodeId, requestId: Date.now() });
    setInspectorOpen(false);
    setDatabaseOpen(false);
  }, [presenterMode, session?.story]);

  const tidyCanvas = useCallback(async () => {
    const viewportWidth = canvasStageRef.current?.clientWidth ?? window.innerWidth;
    const result = await requestJson<{
      session: AtlasSession;
      updates: Array<{ height?: number; id: string; width: number; x: number; y: number }>;
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

  const activatePresenter = useCallback(async () => {
    if (!session) return;
    if (presenterMode && activePresenterStory) {
      setPresenterMode(false);
      setPresenterNotice(null);
      return;
    }

    const currentStoryIds = storyPresenterNodeIds(session);
    if (currentStoryIds?.size) {
      setPresenterMode(true);
      setPresenterNotice(null);
      const firstNodeId = [...currentStoryIds][0];
      if (firstNodeId) setFastFocusRequest({ nodeId: firstNodeId, requestId: Date.now() });
      return;
    }

    const firstStoryStep = session.story?.steps.find(
      (step) => step.focusNodeIds?.length || step.focusEdgeIds?.length
    );
    if (firstStoryStep) {
      const next = await requestJson<AtlasSession>(
        `/api/sessions/${encodeURIComponent(sessionId)}/story/steps/${encodeURIComponent(
          firstStoryStep.id
        )}/activate`,
        { method: 'POST' }
      );
      applySession(next, 'local');
      setPresenterMode(true);
      setPresenterNotice(null);
      const firstNodeId = next.story?.focusNodeIds[0];
      if (firstNodeId) setFastFocusRequest({ nodeId: firstNodeId, requestId: Date.now() });
      return;
    }

    const payload = buildPresenterStoryPayload(session, visibleNodeIds);
    if (!payload) {
      setPresenterNotice('No visible topology records are available for presentation.');
      return;
    }

    const next = await requestJson<AtlasSession>(
      `/api/sessions/${encodeURIComponent(sessionId)}/story`,
      {
        body: JSON.stringify(payload),
        method: 'POST'
      }
    );
    applySession(next, 'local');
    setPresenterMode(true);
    setPresenterNotice(null);
    const firstNodeId = next.story?.focusNodeIds[0];
    if (firstNodeId) setFastFocusRequest({ nodeId: firstNodeId, requestId: Date.now() });
  }, [activePresenterStory, applySession, presenterMode, session, sessionId, visibleNodeIds]);

  const copyCommand = useCallback(async () => {
    const command = `pnpm atlas:studio observe --session ${sessionId} --suggest --text "client says..."`;
    await navigator.clipboard?.writeText(command);
  }, [sessionId]);

  const proposeTranscriptRemoval = useCallback(
    async (operationId: string) => {
      if (!transcriptProject) return;
      const revision = transcriptProject.revisions.find(
        (candidate) => candidate.id === transcriptProject.currentRevisionId
      );
      const selected = revision?.cutList.find((operation) => operation.id === operationId);
      if (!revision || !selected || selected.kind !== 'keep') return;

      const operations: CutOperation[] = revision.cutList.map((operation) =>
        operation.id === operationId
          ? { ...operation, kind: 'remove', reason: 'Manual transcript removal proposed by the operator.' }
          : operation
      );
      const next = await requestJson<TranscriptEditorProject>(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcript-project/proposals`,
        {
          body: JSON.stringify({
            id: `manual-remove:${operationId}:${Date.now()}`,
            baseRevisionId: revision.id,
            proposedBy: 'operator',
            rationale: `Manual removal proposed for ${selected.transcriptSegmentIds.join(', ')}.`,
            operations
          }),
          method: 'POST'
        }
      );
      setTranscriptProject(next);
      setError(null);
    },
    [sessionId, transcriptProject]
  );

  const decideTranscriptProposal = useCallback(
    async (proposalId: string, decision: 'approved' | 'rejected') => {
      const next = await requestJson<TranscriptEditorProject>(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcript-project/proposals/${encodeURIComponent(
          proposalId
        )}`,
        {
          body: JSON.stringify({
            decidedAt: new Date().toISOString(),
            decidedBy: 'operator',
            decision
          }),
          method: 'PATCH'
        }
      );
      setTranscriptProject(next);
      setError(null);
    },
    [sessionId]
  );

  const applyTranscriptProposal = useCallback(
    async (proposalId: string) => {
      if (!transcriptProject) return;
      const next = await requestJson<TranscriptEditorProject>(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcript-project/proposals/${encodeURIComponent(
          proposalId
        )}/apply`,
        {
          body: JSON.stringify({
            appliedAt: new Date().toISOString(),
            appliedBy: 'operator',
            revisionId: `revision-${transcriptProject.revisions.length + 1}`
          }),
          method: 'POST'
        }
      );
      setTranscriptProject(next);
      setError(null);
    },
    [sessionId, transcriptProject]
  );

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
            active={mediaEditorOpen}
            icon={Clapperboard}
            onClick={() => setMediaEditorOpen((value) => !value)}
            title={mediaEditorOpen ? 'Hide transcript editor' : 'Show transcript editor'}
          >
            Edit
          </IconButton>
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
            active={databaseOpen}
            icon={Database}
            onClick={() => {
              setDatabaseOpen((value) => !value);
              setTranscriptEditorOpen(false);
            }}
            title={databaseOpen ? 'Hide database layer' : 'Show database layer'}
          >
            Database
          </IconButton>
          <IconButton
            active={transcriptEditorOpen}
            icon={Film}
            onClick={() => {
              setTranscriptEditorOpen((value) => !value);
              setDatabaseOpen(false);
              void loadTranscriptProject();
            }}
            title={transcriptEditorOpen ? 'Hide transcript editor' : 'Show transcript editor'}
          >
            Edit
          </IconButton>
          <IconButton
            active={activePresenterStory}
            icon={Presentation}
            onClick={() => void activatePresenter()}
            title={activePresenterStory ? 'Exit presenter mode' : 'Enter presenter mode'}
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

      <main className={`studio-main ${databaseOpen || transcriptEditorOpen ? 'database-open' : ''}`}>
        <div
          ref={canvasStageRef}
          className={`canvas-stage ${activePresenterStory ? 'presenter-mode' : ''} ${
            largeTopology ? 'large-topology' : ''
          } fast-renderer-active`}
          aria-label="Atlas workflow canvas"
        >
          {session ? (
            <>
              <FastTopologyCanvas
                activeNodeIds={activeNodeIds}
                fitRequest={fastFitRequest}
                focusRequest={fastFocusRequest}
                onNodeSelect={selectFastNode}
                onPaneClick={onPaneClick}
                onViewportChange={handleCanvasViewportChange}
                selectedNodeId={selectedNodeId}
                session={session}
                visibleNodeIds={canvasVisibleNodeIds}
              />
              <div className="canvas-kicker canvas-overlay top-left">
                <Workflow aria-hidden="true" />
                <strong>Workflow map</strong>
                <span>{visibleCounts}</span>
              </div>
              <div
                aria-label="Topology section view"
                className="canvas-board-legend canvas-overlay top-center"
              >
                <label className="canvas-search">
                  <Search aria-hidden="true" />
                  <input
                    aria-label="Find topology node"
                    onChange={(event) => setTopologyQuery(event.target.value)}
                    placeholder="Find node"
                    type="search"
                    value={topologyQuery}
                  />
                  {topologyQuery ? (
                    <button
                      aria-label="Clear topology search"
                      onClick={() => setTopologyQuery('')}
                      title="Clear search"
                      type="button"
                    >
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                </label>
                {TOPOLOGY_LENSES.map((lens) => (
                  <button
                    aria-pressed={topologyLens === lens.id}
                    key={lens.id}
                    onClick={() => setTopologyLens(lens.id)}
                    title={`Show ${lens.label}`}
                    type="button"
                  >
                    <span>{lens.label}</span>
                    <em>{topologyLensCounts.get(lens.id) ?? 0}</em>
                  </button>
                ))}
              </div>
              <div className="canvas-legend canvas-overlay top-right">
                <span className="status-chip run">Run</span>
                <span className="status-chip wait">Wait</span>
                <span className="status-chip stop">Stop</span>
              </div>
              <div className="canvas-mark canvas-overlay bottom-right">
                <CubeMark />
              </div>
              {presenterNotice ? (
                <div className="presenter-notice canvas-overlay bottom-left">
                  {presenterNotice}
                </div>
              ) : null}
              {activePresenterStory ? (
                <div
                  className="story-panel-wrap canvas-overlay bottom-left"
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
                </div>
              ) : null}
            </>
          ) : null}
        </div>

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
        <MediaEditorPanel
          onApplyProposal={(proposalId) => void applyMediaProposal(proposalId)}
          onClose={() => setMediaEditorOpen(false)}
          onDecideProposal={(proposalId, decision) => void decideMediaProposal(proposalId, decision)}
          onInitialize={(sourcePath, transcript, includeTitleOverlay) => void initializeMediaProject(sourcePath, transcript, includeTitleOverlay)}
          onRender={() => void renderMediaProject()}
          onRequestCodexProposal={(instruction, privateContentConfirmed) => void requestCodexMediaProposal(instruction, privateContentConfirmed)}
          open={mediaEditorOpen}
          project={mediaProject}
          sessionId={sessionId}
        />
        {databaseOpen ? (
          <DatabaseLayerPanel
            activeView={databaseView}
            lens={{
              active: topologyLens !== 'all' || Boolean(normalizedTopologyQuery),
              label: topologyLensLabel(topologyLens),
              query: topologyQuery.trim(),
              totalNodes: session?.canvas.nodes.length ?? 0,
              visibleNodes: visibleNodeIds?.size ?? session?.canvas.nodes.length ?? 0
            }}
            onChangeView={setDatabaseView}
            onClose={() => setDatabaseOpen(false)}
            onSelectNode={selectDatabaseNode}
            session={session}
            visibleNodeIds={visibleNodeIds}
          />
        ) : null}
        {transcriptEditorOpen ? (
          <TranscriptEditorPanel
            onApplyProposal={(proposalId) => void applyTranscriptProposal(proposalId)}
            onClose={() => setTranscriptEditorOpen(false)}
            onDecideProposal={(proposalId, decision) =>
              void decideTranscriptProposal(proposalId, decision)
            }
            onImport={importTranscriptProject}
            onProposeRemoval={(operationId) => void proposeTranscriptRemoval(operationId)}
            project={transcriptProject}
          />
        ) : null}
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
            aria-label="Open Map-to-Build handoff"
            className="toolbar-link"
            href={`/api/sessions/${encodeURIComponent(sessionId)}/client-handoff.md`}
            title="Open Map-to-Build handoff"
          >
            <FileText aria-hidden="true" />
            <span>Map-to-Build</span>
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
