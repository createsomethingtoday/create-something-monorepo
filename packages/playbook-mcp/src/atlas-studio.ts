import type { PlaybookWorkflow } from './workflows.js';

export interface AtlasPersona {
  id: string;
  name: string;
  role: string;
  color: string;
  category: 'human' | 'ai' | 'system';
  initials: string;
}

export interface AtlasBuilderNode {
  id: string;
  type: 'task' | 'touchpoint';
  referenceId: string;
  x: number;
  y: number;
  customLabel: string;
  notes: string;
  measuredW: number;
  measuredH: number;
  personaId: string;
}

export interface AtlasBuilderEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  customX?: number;
}

export interface AtlasBuilderState {
  nodes: AtlasBuilderNode[];
  edges: AtlasBuilderEdge[];
  personas: AtlasPersona[];
}

const PERSONAS: AtlasPersona[] = [
  {
    id: 'persona-human',
    name: 'Human',
    role: 'Sets goals, reviews outcomes',
    color: '#F59E0B',
    category: 'human',
    initials: 'H',
  },
  {
    id: 'persona-ai',
    name: 'AI',
    role: 'Synthesis and verification tasks',
    color: '#3B82F6',
    category: 'ai',
    initials: 'AI',
  },
  {
    id: 'persona-system',
    name: 'System',
    role: 'Deterministic operations / tool calls',
    color: '#10B981',
    category: 'system',
    initials: 'S',
  },
];

function personaIdForReferenceId(referenceId: string): AtlasPersona['id'] {
  if (referenceId.startsWith('human_')) return 'persona-human';
  if (referenceId.startsWith('task_')) return 'persona-ai';
  if (referenceId.startsWith('system_')) return 'persona-system';
  return 'persona-system';
}

function touchpointForHost(hostSlug: string): { referenceId: string; customLabel: string } {
  switch (hostSlug) {
    case 'codex':
      return { referenceId: 'tp_cli', customLabel: 'Codex' };
    case 'cursor':
      return { referenceId: 'tp_web', customLabel: 'Cursor' };
    case 'claude-desktop':
      return { referenceId: 'tp_chat', customLabel: 'Claude Desktop' };
    case 'claude-code':
      return { referenceId: 'tp_cli', customLabel: 'Claude Code' };
    case 'windsurf':
      return { referenceId: 'tp_web', customLabel: 'Windsurf' };
    case 'vscode':
      return { referenceId: 'tp_web', customLabel: 'VS Code (Copilot)' };
    default:
      return { referenceId: 'tp_web', customLabel: hostSlug };
  }
}

export function exportWorkflowToAtlasStudio(workflow: PlaybookWorkflow): AtlasBuilderState {
  const tp = touchpointForHost(workflow.hostSlug);

  const nodes: AtlasBuilderNode[] = [];
  const edges: AtlasBuilderEdge[] = [];

  const touchpointNodeId = `${workflow.id}__tp`;
  nodes.push({
    id: touchpointNodeId,
    type: 'touchpoint',
    referenceId: tp.referenceId,
    x: 0,
    y: 0,
    customLabel: tp.customLabel,
    notes: `${workflow.hostName} host environment`,
    measuredW: 180,
    measuredH: 52,
    personaId: 'persona-human',
  });

  const stepXStart = 240;
  const stepXGap = 340;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stepNodeId = `${workflow.id}__step_${i + 1}`;

    nodes.push({
      id: stepNodeId,
      type: 'task',
      referenceId: step.referenceId,
      x: stepXStart + i * stepXGap,
      y: 0,
      customLabel: step.customLabel,
      notes: step.notes,
      measuredW: 280,
      measuredH: 120,
      personaId: personaIdForReferenceId(step.referenceId),
    });

    if (i === 0) {
      edges.push({
        id: `${workflow.id}__edge_tp_1`,
        source: touchpointNodeId,
        target: stepNodeId,
      });
    } else {
      edges.push({
        id: `${workflow.id}__edge_${i}`,
        source: `${workflow.id}__step_${i}`,
        target: stepNodeId,
      });
    }
  }

  return { nodes, edges, personas: PERSONAS };
}

