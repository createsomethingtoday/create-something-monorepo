import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { defaultLabelForKind } from './atlas.js';
import { buildAtlasDatabaseHealth, type AtlasDatabaseHealth } from './database-health.js';
import type {
  AtlasCanvasEdge,
  AtlasCanvasNode,
  AtlasCanvasNodeKind,
  AtlasCanvasNodeStatus,
  AtlasGovernanceRecordProductId,
  AtlasGovernanceRecordRef,
  AtlasGovernanceProductAttachment,
  AtlasGovernanceProductId,
  AtlasGovernanceProductLink,
  AtlasObservation,
  AtlasSession,
  AtlasSessionActor,
  AtlasStoryCallout,
  AtlasStoryQuestion,
  AtlasStoryStep,
  AtlasSuggestion
} from './types.js';

type CreateSessionInput = {
  client: string;
  workflow: string;
  owner?: string;
};

type AddNodeInput = {
  kind: AtlasCanvasNodeKind;
  label?: string;
  atlasId?: string;
  x?: number;
  y?: number;
  owner?: string;
  status?: AtlasCanvasNodeStatus;
  notes?: string;
  evidence?: string;
  products?: AtlasGovernanceProductAttachment[];
  createdBy?: AtlasSessionActor;
};

type UpdateNodeInput = Partial<Omit<AtlasCanvasNode, 'id' | 'createdBy'>>;

type AttachGovernanceRecordInput = Omit<AtlasGovernanceRecordRef, 'attachedAt' | 'attachedBy'> & {
  attachedBy?: AtlasSessionActor;
};

export type RemoveNodeResult = {
  removedEdges: AtlasCanvasEdge[];
  removedNode: AtlasCanvasNode;
  session: AtlasSession;
};

type AddEdgeInput = {
  source: string;
  target: string;
  label?: string;
  evidence?: string;
  createdBy?: AtlasSessionActor;
};

type UpdateEdgeInput = Partial<Omit<AtlasCanvasEdge, 'id' | 'createdBy' | 'source' | 'target'>>;

type AddObservationInput = {
  text: string;
  source?: AtlasSessionActor;
  suggest?: boolean;
};

export type SetStoryInput = {
  activeStepId?: string;
  callouts?: Array<Omit<AtlasStoryCallout, 'id'> & { id?: string }>;
  dimUnfocused?: boolean;
  focusEdgeIds?: string[];
  focusNodeIds?: string[];
  narration?: string;
  nextAction?: string;
  questions?: Array<
    Omit<AtlasStoryQuestion, 'id' | 'status'> & {
      id?: string;
      status?: AtlasStoryQuestion['status'];
    }
  >;
  steps?: Array<Omit<AtlasStoryStep, 'id'> & { id?: string }>;
  title?: string;
  updatedBy?: AtlasSessionActor;
};

export type AddStoryQuestionInput = Omit<AtlasStoryQuestion, 'id' | 'status'> & {
  updatedBy?: AtlasSessionActor;
};

export type StoryStepDirection = 'next' | 'previous';

function now(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function findRepoRoot(start: string): string {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  return path.resolve(start);
}

export function getStudioHome(cwd = process.cwd()): string {
  return process.env.CREATE_SOMETHING_ATLAS_HOME ?? path.join(findRepoRoot(cwd), '.atlas-studio');
}

export function getSessionPath(sessionId: string, cwd = process.cwd()): string {
  return path.join(getStudioHome(cwd), 'sessions', `${sessionId}.json`);
}

async function ensureSessionDir(cwd = process.cwd()): Promise<void> {
  await mkdir(path.join(getStudioHome(cwd), 'sessions'), { recursive: true });
  await mkdir(path.join(getStudioHome(cwd), 'exports'), { recursive: true });
}

function defaultNode(input: {
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  x: number;
  y: number;
  owner?: string;
  status?: AtlasCanvasNodeStatus;
  notes?: string;
  products?: AtlasGovernanceProductAttachment[];
  createdBy?: AtlasSessionActor;
}): AtlasCanvasNode {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    x: input.x,
    y: input.y,
    width: 280,
    height: 142,
    owner: input.owner,
    status: input.status ?? 'unknown',
    notes: input.notes,
    products: input.products ?? defaultProductsForNodeKind(input.kind, input.label),
    createdBy: input.createdBy ?? 'system',
    updatedAt: now()
  };
}

const SESSION_PRODUCTS: AtlasGovernanceProductId[] = ['atlas', 'signal', 'decision', 'proof'];

const SESSION_PRODUCT_LINKS: AtlasGovernanceProductLink[] = [
  {
    source: 'atlas',
    target: 'signal',
    mode: 'connects',
    label: 'Atlas maps where the signal enters.',
    required: true
  },
  {
    source: 'signal',
    target: 'decision',
    mode: 'produces',
    label: 'Signal produces a decision requirement.',
    required: true
  },
  {
    source: 'decision',
    target: 'proof',
    mode: 'produces',
    label: 'Decision produces proof of the action or pause.',
    required: true
  },
  {
    source: 'proof',
    target: 'atlas',
    mode: 'records',
    label: 'Proof records back onto the Atlas map.',
    required: true
  }
];

const PRODUCT_IDS_BY_KIND: Record<AtlasCanvasNodeKind, AtlasGovernanceProductId[]> = {
  actor: ['atlas'],
  data: ['signal'],
  system: ['signal'],
  ai: ['decision'],
  human: ['decision'],
  constraint: ['decision'],
  touchpoint: ['proof']
};

const PRODUCT_SURFACE_BY_ID: Record<
  AtlasGovernanceProductId,
  AtlasGovernanceProductAttachment['surface']
> = {
  atlas: 'map',
  signal: 'inbox',
  decision: 'queue',
  proof: 'proof-graph'
};

function defaultProductsForNodeKind(
  kind: AtlasCanvasNodeKind,
  source?: string
): AtlasGovernanceProductAttachment[] {
  return PRODUCT_IDS_BY_KIND[kind].map((productId) => ({
    productId,
    mode: productId === 'proof' ? 'records' : productId === 'atlas' ? 'connects' : 'produces',
    surface: PRODUCT_SURFACE_BY_ID[productId],
    required: true,
    source
  }));
}

function productAttachmentForGovernanceRecord(
  productId: AtlasGovernanceRecordProductId
): AtlasGovernanceProductAttachment {
  return {
    productId,
    mode: productId === 'proof' ? 'records' : productId === 'signal' ? 'consumes' : 'produces',
    surface: PRODUCT_SURFACE_BY_ID[productId],
    required: false,
    source: 'governance-record'
  };
}

function normalizeGovernanceRecordRef(input: AttachGovernanceRecordInput): AtlasGovernanceRecordRef {
  const id = input.id.trim();
  const title = input.title.trim();
  if (!id) throw new Error('Governance record id is required');
  if (!title) throw new Error('Governance record title is required');
  if (!['signal', 'decision', 'proof'].includes(input.productId)) {
    throw new Error('Governance record type must be signal, decision, or proof');
  }
  return {
    id,
    productId: input.productId,
    title,
    summary: input.summary?.trim() || undefined,
    status: input.status?.trim() || undefined,
    href: normalizeRecordHref(input.href),
    source: input.source?.trim() || undefined,
    attachedAt: now(),
    attachedBy: input.attachedBy ?? 'agent'
  };
}

function normalizeRecordHref(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function seedCanvas(input: CreateSessionInput): AtlasSession['canvas'] {
  const client = defaultNode({
    id: 'actor_client',
    kind: 'actor',
    label: input.client,
    x: 70,
    y: 210,
    owner: input.owner,
    notes: 'Client-side owner or team for the mapped workflow.'
  });
  const workflow = defaultNode({
    id: 'data_workflow',
    kind: 'data',
    label: input.workflow,
    x: 350,
    y: 210,
    owner: input.owner,
    notes: 'Workflow object being mapped during onboarding.'
  });
  const agent = defaultNode({
    id: 'actor_agent',
    kind: 'actor',
    label: 'Agent support',
    x: 630,
    y: 210,
    status: 'wait',
    notes: 'Agent can help once the run/wait/stop boundary is clear.'
  });
  const approval = defaultNode({
    id: 'human_approval',
    kind: 'human',
    label: 'Approval boundary',
    x: 900,
    y: 210,
    owner: input.owner,
    status: 'wait',
    notes: 'Human owner decides when the workflow can run, pause, or stop.'
  });

  return {
    nodes: [client, workflow, agent, approval],
    edges: [
      {
        id: 'edge_client_workflow',
        source: client.id,
        target: workflow.id,
        label: 'describes',
        createdBy: 'system',
        updatedAt: now()
      },
      {
        id: 'edge_workflow_agent',
        source: workflow.id,
        target: agent.id,
        label: 'can assist',
        createdBy: 'system',
        updatedAt: now()
      },
      {
        id: 'edge_agent_approval',
        source: agent.id,
        target: approval.id,
        label: 'requires boundary',
        createdBy: 'system',
        updatedAt: now()
      }
    ]
  };
}

export async function createSession(
  input: CreateSessionInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  await ensureSessionDir(cwd);
  const createdAt = now();
  const id = `${slug(input.client) || 'client'}-${slug(input.workflow) || 'workflow'}-${Date.now().toString(36)}`;
  const session: AtlasSession = {
    version: 1,
    id,
    client: input.client,
    workflow: input.workflow,
    owner: input.owner,
    createdAt,
    updatedAt: createdAt,
    canvas: seedCanvas(input),
    products: SESSION_PRODUCTS,
    productLinks: SESSION_PRODUCT_LINKS,
    observations: [],
    suggestions: []
  };
  await writeSession(session, cwd);
  return session;
}

export async function readSession(sessionId: string, cwd = process.cwd()): Promise<AtlasSession> {
  const raw = await readFile(getSessionPath(sessionId, cwd), 'utf8');
  return JSON.parse(raw) as AtlasSession;
}

export async function writeSession(
  session: AtlasSession,
  cwd = process.cwd()
): Promise<AtlasSession> {
  await ensureSessionDir(cwd);
  session.updatedAt = now();
  await writeFile(getSessionPath(session.id, cwd), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
  return session;
}

export async function listSessions(cwd = process.cwd()): Promise<AtlasSession[]> {
  await ensureSessionDir(cwd);
  const dir = path.join(getStudioHome(cwd), 'sessions');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
  const sessions = await Promise.all(
    files.map(
      async (file) => JSON.parse(await readFile(path.join(dir, file), 'utf8')) as AtlasSession
    )
  );
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readSessionDatabaseHealth(
  sessionId: string,
  cwd = process.cwd()
): Promise<AtlasDatabaseHealth> {
  return buildAtlasDatabaseHealth(await readSession(sessionId, cwd));
}

function nextNodePosition(
  session: AtlasSession,
  kind: AtlasCanvasNodeKind
): { x: number; y: number } {
  const lanes: Record<AtlasCanvasNodeKind, number> = {
    actor: 100,
    data: 225,
    human: 350,
    ai: 475,
    system: 600,
    constraint: 100,
    touchpoint: 475
  };
  const sameKind = session.canvas.nodes.filter((node) => node.kind === kind).length;
  return {
    x: 80 + (sameKind % 3) * 290,
    y: lanes[kind] + Math.floor(sameKind / 3) * 150
  };
}

export async function addNode(
  sessionId: string,
  input: AddNodeInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const fallbackPosition = nextNodePosition(session, input.kind);
  const node: AtlasCanvasNode = {
    id: randomId(input.kind),
    kind: input.kind,
    label: input.label?.trim() || defaultLabelForKind(input.kind),
    atlasId: input.atlasId,
    x: input.x ?? fallbackPosition.x,
    y: input.y ?? fallbackPosition.y,
    width: 280,
    height: 142,
    owner: input.owner,
    status: input.status ?? 'unknown',
    notes: input.notes,
    evidence: input.evidence,
    createdBy: input.createdBy ?? 'agent',
    updatedAt: now()
  };
  session.canvas.nodes.push(node);
  return writeSession(session, cwd);
}

export async function updateNode(
  sessionId: string,
  nodeId: string,
  input: UpdateNodeInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const index = session.canvas.nodes.findIndex((node) => node.id === nodeId);
  if (index === -1) throw new Error(`Unknown node: ${nodeId}`);
  session.canvas.nodes[index] = {
    ...session.canvas.nodes[index],
    ...input,
    id: nodeId,
    updatedAt: now()
  };
  return writeSession(session, cwd);
}

export async function attachGovernanceRecord(
  sessionId: string,
  nodeId: string,
  input: AttachGovernanceRecordInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const index = session.canvas.nodes.findIndex((node) => node.id === nodeId);
  if (index === -1) throw new Error(`Unknown node: ${nodeId}`);

  const record = normalizeGovernanceRecordRef(input);
  const node = session.canvas.nodes[index];
  const existingRecords = node.governanceRecords ?? [];
  const products = node.products ?? defaultProductsForNodeKind(node.kind, node.label);
  const hasProduct = products.some((product) => product.productId === record.productId);
  const nextRecords = [
    ...existingRecords.filter(
      (item) => !(item.productId === record.productId && item.id === record.id)
    ),
    record
  ];

  session.canvas.nodes[index] = {
    ...node,
    products: hasProduct ? products : [...products, productAttachmentForGovernanceRecord(record.productId)],
    governanceRecords: nextRecords,
    updatedAt: now()
  };

  return writeSession(session, cwd);
}

export async function updateNodes(
  sessionId: string,
  inputs: Array<{ id: string } & UpdateNodeInput>,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  if (!inputs.length) return session;

  const inputById = new Map(inputs.map((input) => [input.id, input]));
  const missing = inputs
    .map((input) => input.id)
    .filter((id) => !session.canvas.nodes.some((node) => node.id === id));
  if (missing.length)
    throw new Error(`Unknown node${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);

  const updatedAt = now();
  session.canvas.nodes = session.canvas.nodes.map((node) => {
    const input = inputById.get(node.id);
    if (!input) return node;
    const { id, ...patch } = input;
    return {
      ...node,
      ...patch,
      id,
      updatedAt
    };
  });

  return writeSession(session, cwd);
}

export async function removeNode(
  sessionId: string,
  nodeId: string,
  cwd = process.cwd()
): Promise<RemoveNodeResult> {
  const session = await readSession(sessionId, cwd);
  const nodeIndex = session.canvas.nodes.findIndex((node) => node.id === nodeId);
  if (nodeIndex === -1) throw new Error(`Unknown node: ${nodeId}`);

  const removedNode = session.canvas.nodes[nodeIndex];
  session.canvas.nodes = session.canvas.nodes.filter((node) => node.id !== nodeId);

  const removedEdges = session.canvas.edges.filter(
    (edge) => edge.source === nodeId || edge.target === nodeId
  );
  session.canvas.edges = session.canvas.edges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId
  );

  return {
    removedEdges,
    removedNode,
    session: await writeSession(session, cwd)
  };
}

export async function addEdge(
  sessionId: string,
  input: AddEdgeInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const hasSource = session.canvas.nodes.some((node) => node.id === input.source);
  const hasTarget = session.canvas.nodes.some((node) => node.id === input.target);
  if (!hasSource) throw new Error(`Unknown source node: ${input.source}`);
  if (!hasTarget) throw new Error(`Unknown target node: ${input.target}`);
  const edge: AtlasCanvasEdge = {
    id: randomId('edge'),
    source: input.source,
    target: input.target,
    label: input.label,
    evidence: input.evidence,
    createdBy: input.createdBy ?? 'agent',
    updatedAt: now()
  };
  session.canvas.edges.push(edge);
  return writeSession(session, cwd);
}

export async function updateEdge(
  sessionId: string,
  edgeId: string,
  input: UpdateEdgeInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const index = session.canvas.edges.findIndex((edge) => edge.id === edgeId);
  if (index === -1) throw new Error(`Unknown edge: ${edgeId}`);
  session.canvas.edges[index] = {
    ...session.canvas.edges[index],
    ...input,
    id: edgeId,
    updatedAt: now()
  };
  return writeSession(session, cwd);
}

function suggestionsFromText(text: string, session: AtlasSession): AtlasSuggestion[] {
  const normalized = text.toLowerCase();
  const createdAt = now();
  const suggestions: AtlasSuggestion[] = [];
  const add = (
    kind: AtlasCanvasNodeKind,
    label: string,
    reason: string,
    status: AtlasCanvasNodeStatus = 'unknown'
  ) => {
    const position = nextNodePosition(session, kind);
    suggestions.push({
      id: randomId('suggestion'),
      status: 'queued',
      reason,
      createdAt,
      payload: {
        kind,
        label,
        x: position.x,
        y: position.y,
        width: 280,
        height: 142,
        status,
        notes: `Suggested from observation: ${text.slice(0, 220)}`
      }
    });
  };

  if (/(approve|approval|owner|sign off|review)/.test(normalized)) {
    add('human', 'Approval needed', 'The observation names a human decision boundary.', 'wait');
  }
  if (/(privacy|secret|token|credential|access|permission)/.test(normalized)) {
    add(
      'constraint',
      'Access or privacy boundary',
      'The observation introduces a constraint that should be visible.',
      'stop'
    );
  }
  if (/(draft|summarize|classify|verify|extract|generate)/.test(normalized)) {
    add('ai', 'AI assist task', 'The observation names work AI may safely assist with.', 'wait');
  }
  if (/(route|notify|log|store|sync|webhook|automation)/.test(normalized)) {
    add(
      'system',
      'System operation',
      'The observation names infrastructure work the system should handle.',
      'run'
    );
  }
  if (/(record|receipt|file|form|database|note|ticket|issue)/.test(normalized)) {
    add(
      'data',
      'Workflow artifact',
      'The observation names data that should move through the workflow.',
      'unknown'
    );
  }
  if (/(notion|linear|dify|email|slack|dashboard|site|page)/.test(normalized)) {
    add(
      'touchpoint',
      'Inspection touchpoint',
      'The observation names where a person may inspect or act.',
      'unknown'
    );
  }

  return suggestions;
}

export async function addObservation(
  sessionId: string,
  input: AddObservationInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const observation: AtlasObservation = {
    id: randomId('observation'),
    text: input.text,
    source: input.source ?? 'agent',
    createdAt: now()
  };
  session.observations.unshift(observation);
  if (input.suggest) {
    session.suggestions.unshift(...suggestionsFromText(input.text, session));
  }
  return writeSession(session, cwd);
}

export async function setStoryFocus(
  sessionId: string,
  input: SetStoryInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const existing = session.story;
  const steps = (input.steps ?? existing?.steps ?? []).map((step) => ({
    id: step.id ?? randomId('step'),
    focusEdgeIds: step.focusEdgeIds,
    focusNodeIds: step.focusNodeIds,
    owner: step.owner,
    proof: step.proof,
    status: step.status,
    summary: step.summary,
    title: step.title
  }));
  const activeStepId =
    input.activeStepId ??
    existing?.activeStepId ??
    steps.find((step) => step.status === 'current')?.id ??
    steps[0]?.id;
  session.story = {
    active: true,
    activeStepId,
    callouts: (input.callouts ?? existing?.callouts ?? []).map((callout) => ({
      id: callout.id ?? randomId('callout'),
      nodeId: callout.nodeId,
      severity: callout.severity,
      text: callout.text
    })),
    dimUnfocused: input.dimUnfocused ?? existing?.dimUnfocused ?? true,
    focusEdgeIds: input.focusEdgeIds ?? existing?.focusEdgeIds ?? [],
    focusNodeIds: input.focusNodeIds ?? existing?.focusNodeIds ?? [],
    narration: input.narration ?? existing?.narration,
    nextAction: input.nextAction ?? existing?.nextAction,
    questions: (input.questions ?? existing?.questions ?? []).map((question) => ({
      id: question.id ?? randomId('question'),
      nodeId: question.nodeId,
      owner: question.owner,
      question: question.question,
      status: question.status ?? 'open'
    })),
    steps,
    title: input.title ?? existing?.title,
    updatedAt: now(),
    updatedBy: input.updatedBy ?? 'agent'
  };
  return writeSession(session, cwd);
}

function storyStepIndex(session: AtlasSession, stepId?: string): number {
  const steps = session.story?.steps ?? [];
  if (!steps.length) return -1;
  if (stepId) {
    const byId = steps.findIndex((step) => step.id === stepId);
    if (byId >= 0) return byId;
  }
  const activeId = session.story?.activeStepId;
  if (activeId) {
    const byActive = steps.findIndex((step) => step.id === activeId);
    if (byActive >= 0) return byActive;
  }
  const current = steps.findIndex((step) => step.status === 'current');
  return current >= 0 ? current : 0;
}

function applyStoryStep(session: AtlasSession, index: number): AtlasSession {
  const story = session.story;
  const steps = story?.steps ?? [];
  const step = steps[index];
  if (!story || !step) throw new Error('Unknown Atlas Studio story step.');

  session.story = {
    ...story,
    active: true,
    activeStepId: step.id,
    focusEdgeIds: step.focusEdgeIds ?? [],
    focusNodeIds: step.focusNodeIds ?? [],
    narration: step.summary,
    steps: steps.map((item, itemIndex) => ({
      ...item,
      status: itemIndex < index ? 'done' : itemIndex === index ? 'current' : 'next'
    })),
    updatedAt: now(),
    updatedBy: 'agent'
  };
  return session;
}

export async function activateStoryStep(
  sessionId: string,
  stepId: string,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const index = storyStepIndex(session, stepId);
  if (index < 0 || session.story?.steps[index]?.id !== stepId) {
    throw new Error(`Unknown Atlas Studio story step: ${stepId}`);
  }
  return writeSession(applyStoryStep(session, index), cwd);
}

export async function advanceStoryStep(
  sessionId: string,
  direction: StoryStepDirection,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const steps = session.story?.steps ?? [];
  if (!steps.length) throw new Error('This Atlas Studio session has no story steps.');
  const current = storyStepIndex(session);
  const next =
    direction === 'next' ? Math.min(current + 1, steps.length - 1) : Math.max(current - 1, 0);
  return writeSession(applyStoryStep(session, next), cwd);
}

export async function addStoryQuestion(
  sessionId: string,
  input: AddStoryQuestionInput,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const existing = session.story;
  session.story = {
    active: true,
    activeStepId: existing?.activeStepId,
    callouts: existing?.callouts ?? [],
    dimUnfocused: existing?.dimUnfocused ?? true,
    focusEdgeIds: existing?.focusEdgeIds ?? [],
    focusNodeIds: input.nodeId
      ? Array.from(new Set([...(existing?.focusNodeIds ?? []), input.nodeId]))
      : (existing?.focusNodeIds ?? []),
    narration: existing?.narration,
    questions: [
      ...(existing?.questions ?? []),
      {
        id: randomId('question'),
        nodeId: input.nodeId,
        owner: input.owner,
        question: input.question,
        status: 'open'
      }
    ],
    nextAction: existing?.nextAction,
    steps: existing?.steps ?? [],
    title: existing?.title ?? 'Validation question',
    updatedAt: now(),
    updatedBy: input.updatedBy ?? 'agent'
  };
  return writeSession(session, cwd);
}

export async function clearStoryFocus(
  sessionId: string,
  input: { updatedBy?: AtlasSessionActor } = {},
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  session.story = {
    active: false,
    activeStepId: undefined,
    callouts: [],
    dimUnfocused: false,
    focusEdgeIds: [],
    focusNodeIds: [],
    nextAction: undefined,
    questions: session.story?.questions ?? [],
    steps: [],
    updatedAt: now(),
    updatedBy: input.updatedBy ?? 'agent'
  };
  return writeSession(session, cwd);
}

export async function acceptSuggestion(
  sessionId: string,
  suggestionId: string,
  cwd = process.cwd()
): Promise<AtlasSession> {
  const session = await readSession(sessionId, cwd);
  const suggestion = session.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) throw new Error(`Unknown suggestion: ${suggestionId}`);
  if (suggestion.status !== 'queued') return session;
  const node: AtlasCanvasNode = {
    ...suggestion.payload,
    id: randomId(suggestion.payload.kind),
    products:
      suggestion.payload.products ??
      defaultProductsForNodeKind(suggestion.payload.kind, suggestion.payload.label),
    createdBy: 'operator',
    updatedAt: now()
  };
  suggestion.status = 'accepted';
  suggestion.acceptedAt = now();
  session.canvas.nodes.push(node);
  return writeSession(session, cwd);
}

export function exportSessionMarkdown(session: AtlasSession): string {
  const proposals = session.proposals ?? [];
  const products = session.products ?? SESSION_PRODUCTS;
  const productLinks = session.productLinks ?? SESSION_PRODUCT_LINKS;
  const lines = [
    `# ${session.client} - Atlas Workflow Map`,
    '',
    `Workflow: ${session.workflow}`,
    session.owner ? `Owner: ${session.owner}` : null,
    `Updated: ${session.updatedAt}`,
    '',
    '## Product Composition',
    `Products: ${products.map((product) => product[0].toUpperCase() + product.slice(1)).join(' -> ')}`,
    ...productLinks.map((link) => `- ${link.source} -> ${link.target}: ${link.label}`),
    '',
    '## Canvas Nodes',
    ...session.canvas.nodes.flatMap((node) => {
      const header = `- ${node.label} [${node.kind}, ${node.status}]${node.owner ? ` - owner: ${node.owner}` : ''}${node.notes ? ` - ${node.notes}` : ''}`;
      const records = node.governanceRecords ?? [];
      return records.length
        ? [
            header,
            ...records.map(
              (record) =>
                `  - ${record.productId}: ${record.title} (${record.id})${record.status ? ` - ${record.status}` : ''}${record.href ? ` - ${record.href}` : ''}`
            )
          ]
        : [header];
    }),
    '',
    '## Edges',
    ...session.canvas.edges.map(
      (edge) => `- ${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ''}`
    ),
    '',
    '## Observations',
    ...session.observations.map((observation) => `- ${observation.text}`),
    '',
    '## Queued Suggestions',
    ...session.suggestions
      .filter((suggestion) => suggestion.status === 'queued')
      .map(
        (suggestion) =>
          `- ${suggestion.payload.label} [${suggestion.payload.kind}] - ${suggestion.reason}`
      ),
    '',
    '## Write-back Proposals',
    ...(proposals.length
      ? proposals.flatMap((proposal) => [
          `- ${proposal.id} [${proposal.status}] - ${proposal.summary.total} actions (${proposal.summary.safe} safe, ${proposal.summary.review} review, ${proposal.summary.approval} approval, ${proposal.summary.drift} drift)`,
          ...proposal.actions.map(
            (action) =>
              `  - ${action.title} [${action.risk}, ${action.status}] - ${action.summary}${action.reviewNote ? ` Note: ${action.reviewNote}` : ''}`
          )
        ])
      : ['- No write-back proposals generated yet.']),
    ''
  ].filter((line): line is string => line !== null);

  return `${lines.join('\n')}\n`;
}
