import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { defaultLabelForKind } from './atlas.js';
import type {
  AtlasCanvasEdge,
  AtlasCanvasNode,
  AtlasCanvasNodeKind,
  AtlasCanvasNodeStatus,
  AtlasObservation,
  AtlasSession,
  AtlasSessionActor,
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
  createdBy?: AtlasSessionActor;
};

type UpdateNodeInput = Partial<Omit<AtlasCanvasNode, 'id' | 'createdBy'>>;

type AddEdgeInput = {
  source: string;
  target: string;
  label?: string;
  evidence?: string;
  createdBy?: AtlasSessionActor;
};

type AddObservationInput = {
  text: string;
  source?: AtlasSessionActor;
  suggest?: boolean;
};

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
    createdBy: input.createdBy ?? 'system',
    updatedAt: now()
  };
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
    createdBy: 'operator',
    updatedAt: now()
  };
  suggestion.status = 'accepted';
  suggestion.acceptedAt = now();
  session.canvas.nodes.push(node);
  return writeSession(session, cwd);
}

export function exportSessionMarkdown(session: AtlasSession): string {
  const lines = [
    `# ${session.client} - Atlas Workflow Map`,
    '',
    `Workflow: ${session.workflow}`,
    session.owner ? `Owner: ${session.owner}` : null,
    `Updated: ${session.updatedAt}`,
    '',
    '## Canvas Nodes',
    ...session.canvas.nodes.map(
      (node) =>
        `- ${node.label} [${node.kind}, ${node.status}]${node.owner ? ` - owner: ${node.owner}` : ''}${node.notes ? ` - ${node.notes}` : ''}`
    ),
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
    ''
  ].filter((line): line is string => line !== null);

  return `${lines.join('\n')}\n`;
}
