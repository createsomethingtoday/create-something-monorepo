import type { PlaybookWorkflow } from './workflows.js';
import type { OutcomePlaybook, RequiredIntegration } from './outcome-playbooks.js';

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

function touchpointForIntegration(integration: RequiredIntegration): { referenceId: string; customLabel: string; notes: string } {
  // Keep this intentionally coarse. We use customLabel to preserve specificity.
  const slug = integration.slug.toLowerCase();

  if (slug.includes('gmail') || slug === 'gmail') {
    return { referenceId: 'tp_email', customLabel: integration.label, notes: integration.purpose };
  }
  if (slug.includes('slack')) {
    return { referenceId: 'tp_chat', customLabel: integration.label, notes: integration.purpose };
  }

  // Default: most SaaS systems are operated through a web dashboard, even when integrated via API.
  return { referenceId: 'tp_web', customLabel: integration.label, notes: integration.purpose };
}

export function exportOutcomePlaybookToAtlasStudio(playbook: OutcomePlaybook): AtlasBuilderState {
  const nodes: AtlasBuilderNode[] = [];
  const edges: AtlasBuilderEdge[] = [];

  // Primary touchpoint: Codex-first playbooks are operated from a CLI/agent environment.
  const codexTouchpointNodeId = `${playbook.id}__tp_codex`;
  nodes.push({
    id: codexTouchpointNodeId,
    type: 'touchpoint',
    referenceId: 'tp_cli',
    x: 0,
    y: 0,
    customLabel: 'Codex',
    notes: 'Primary execution environment (Codex-first workflow).',
    measuredW: 180,
    measuredH: 52,
    personaId: 'persona-human',
  });

  // Optional: external system touchpoints derived from requiredIntegrations.
  const externalIntegrations = playbook.requiredIntegrations.filter((i) => i.kind !== 'mcp');
  const externalTouchpointNodeIds: string[] = [];
  for (let i = 0; i < externalIntegrations.length; i++) {
    const integration = externalIntegrations[i];
    const tp = touchpointForIntegration(integration);
    const nodeId = `${playbook.id}__tp_${integration.slug.replace(/[^a-z0-9]+/gi, '_')}`;
    externalTouchpointNodeIds.push(nodeId);

    // Stack external touchpoints vertically to keep the main step line clean.
    nodes.push({
      id: nodeId,
      type: 'touchpoint',
      referenceId: tp.referenceId,
      x: 0,
      y: 90 + i * 80,
      customLabel: tp.customLabel,
      notes: tp.notes,
      measuredW: 180,
      measuredH: 52,
      personaId: 'persona-human',
    });
  }

  const stepXStart = 240;
  const stepXGap = 340;

  let ingestStepNodeId: string | null = null;

  for (let i = 0; i < playbook.steps.length; i++) {
    const step = playbook.steps[i];
    const stepNodeId = `${playbook.id}__step_${i + 1}`;

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

    // Sequential edges
    if (i === 0) {
      edges.push({
        id: `${playbook.id}__edge_tp_1`,
        source: codexTouchpointNodeId,
        target: stepNodeId,
      });
    } else {
      edges.push({
        id: `${playbook.id}__edge_${i}`,
        source: `${playbook.id}__step_${i}`,
        target: stepNodeId,
      });
    }

    // Prefer wiring external touchpoints into the first "system_api" step (or fall back to first step).
    if (!ingestStepNodeId && (step.referenceId === 'system_api' || step.referenceId === 'task_retrieve' || step.referenceId === 'system_read_db')) {
      ingestStepNodeId = stepNodeId;
    }
  }

  if (!ingestStepNodeId && playbook.steps.length > 0) {
    ingestStepNodeId = `${playbook.id}__step_1`;
  }

  if (ingestStepNodeId) {
    for (const nodeId of externalTouchpointNodeIds) {
      edges.push({
        id: `${playbook.id}__edge_${nodeId}_ingest`,
        source: nodeId,
        target: ingestStepNodeId,
      });
    }
  }

  return { nodes, edges, personas: PERSONAS };
}
