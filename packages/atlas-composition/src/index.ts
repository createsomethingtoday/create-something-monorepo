/**
 * Renderer-neutral composition contracts for Atlas presentation artifacts.
 *
 * This package owns no tenant state, renderer state, execution authority, or
 * source-system records. It makes one durable Map module composable across a
 * human Arc, a reusable Playbook, and an operating Runbook.
 */

export const ATLAS_COMPOSITION_SCHEMA = 'create-something/atlas-composition@1' as const;
export const ATLAS_STORY_ADAPTER_SCHEMA = 'atlas-story-v1' as const;

export type AtlasMotionCue =
  | 'signal-reveal'
  | 'module-focus'
  | 'handoff-trace'
  | 'decision-gate'
  | 'recovery-loop'
  | 'proof-stamp'
  | 'none';

export type AtlasRouteKind = 'arc' | 'playbook' | 'runbook';
export type AtlasSceneKind = 'signal' | 'automation' | 'map' | 'judgment' | 'runbook' | 'receipt';
export type AtlasActionStatus = 'proposed' | 'approved' | 'rejected' | 'completed';

export type AtlasMapVersion = {
  id?: string;
  mode: 'pinned' | 'live';
};

export type AtlasMapModule = {
  id: string;
  title: string;
  description: string;
  map: {
    mapId: string;
    version: AtlasMapVersion;
  };
  selection: {
    edgeIds: string[];
    nodeIds: string[];
  };
};

export type AtlasArtifact = {
  id: string;
  kind: 'evidence' | 'guide' | 'media' | 'receipt' | 'specification';
  title: string;
  summary: string;
  provenance: {
    alt: string;
    costUsd: number;
    model: string;
    promptReference: string;
    rights: string;
    source: string;
  };
};

export type AtlasCompositionScene = {
  id: string;
  kind: AtlasSceneKind;
  label: string;
  title: string;
  summary: string;
  detail: string;
  artifactIds: string[];
  evidence: string[];
  mapModuleIds: string[];
  focusNodeIds: string[];
  motion: {
    cue: AtlasMotionCue;
    reducedMotion: 'static-emphasis';
    source: 'agent-authored-structured-data';
  };
};

export type AtlasCompositionRoute = {
  id: string;
  kind: AtlasRouteKind;
  title: string;
  description: string;
  sceneIds: string[];
};

export type AtlasComposition = {
  schema: typeof ATLAS_COMPOSITION_SCHEMA;
  id: string;
  title: string;
  description: string;
  mode: 'local-fixture';
  mapModules: AtlasMapModule[];
  artifacts: AtlasArtifact[];
  routes: AtlasCompositionRoute[];
  scenes: AtlasCompositionScene[];
};

export type AtlasMapSnapshot = {
  mapId: string;
  latestVersion: string;
  versions: string[];
};

export type AtlasMapModuleResolution = {
  map: AtlasMapSnapshot;
  module: AtlasMapModule;
  resolvedVersion: string;
  versionMode: AtlasMapVersion['mode'];
};

export type AtlasActionProposal = {
  actionId: string;
  arcId: string;
  description: string;
  gate: 'approval';
  proposedBy: string;
  status: AtlasActionStatus;
  title: string;
  boundaries: string[];
  decision?: {
    decidedBy: string;
    value: 'approved' | 'rejected';
  };
};

export type AtlasActionReceipt = {
  actionId: string;
  evidence: string;
  id: string;
  issuer: string;
  kind: 'proof';
  mode: 'local-fixture';
  status: 'recorded';
};

export type AtlasCompositionValidation = {
  ok: boolean;
  issues: string[];
};

const APP_REVIEW_MAP_MODULE_ID = 'app-review-governance-map';

const APP_REVIEW_GOVERNANCE_ARTIFACTS: AtlasArtifact[] = [
  {
    id: 'app-governance-architecture',
    kind: 'evidence',
    title: 'Governance source boundary',
    summary: 'D1 owns durable governance state; Airtable remains a human workspace and projection.',
    provenance: {
      alt: 'A source-boundary evidence record for the App Governance database.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'slack-signal-contract',
    kind: 'evidence',
    title: 'Signal intake contract',
    summary: 'A Claude agent reads a Slack signal through a user-scoped MCP and normalizes it through the governed boundary.',
    provenance: {
      alt: 'A signal travels from Slack through an agent to a governed write boundary.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'zendesk-context-contract',
    kind: 'evidence',
    title: 'Partner-context boundary',
    summary: 'Zendesk remains the partner and support conversation, linked as context instead of replacing governance state.',
    provenance: {
      alt: 'A Zendesk context artifact remains linked to, but separate from, the governance record.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/webflow-app-review-mcp/README.md'
    }
  },
  {
    id: 'action-gate-contract',
    kind: 'specification',
    title: 'Approval-gated workflow action',
    summary: 'An agent may propose a bounded action; an operator must approve or reject it before execution.',
    provenance: {
      alt: 'An action moves from proposal through an operator decision before it can execute.',
      costUsd: 0,
      model: 'not-applicable—workflow action contract',
      promptReference: 'app-review-governance-arc.action.v1',
      rights: 'First-party repository migration contract.',
      source: 'packages/app-governance-db/migrations/0010_workflow_actions.sql'
    }
  },
  {
    id: 'receipt-contract',
    kind: 'receipt',
    title: 'Receipt contract',
    summary: 'The governed runtime records proof, decision, handoff, sync, or error evidence as a receipt.',
    provenance: {
      alt: 'A receipt shows the evidence returned after a bounded workflow action.',
      costUsd: 0,
      model: 'not-applicable—workflow receipt contract',
      promptReference: 'app-review-governance-arc.receipt.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'motion-authoring-contract',
    kind: 'media',
    title: 'AI-native motion specification',
    summary: 'An agent may author structured motion cues and accessibility metadata; the renderer owns execution.',
    provenance: {
      alt: 'A data-authored presentation scene moves from signal to proof without autoplay-only meaning.',
      costUsd: 0,
      model: 'not-applicable—structured motion data, not generated media',
      promptReference: 'app-review-governance-arc.motion.v1',
      rights: 'First-party local fixture; no third-party or generated bitmap asset.',
      source: 'packages/atlas-composition/src/index.ts'
    }
  }
];

export const APP_REVIEW_GOVERNANCE_COMPOSITION: AtlasComposition = {
  schema: ATLAS_COMPOSITION_SCHEMA,
  id: 'app-review-governance',
  title: 'App Review Governance',
  description:
    'A local presentation fixture showing how an App Review signal becomes an operator decision and a receipt without collapsing source-system authority.',
  mode: 'local-fixture',
  mapModules: [
    {
      id: APP_REVIEW_MAP_MODULE_ID,
      title: 'App Review governance map',
      description: 'One explicit, pinned map module reused by the Arc, Playbook, and Runbook.',
      map: {
        mapId: 'app-review-governance-canonical-map',
        version: { id: '2026-08-10', mode: 'pinned' }
      },
      selection: {
        nodeIds: [
          'slack-signal',
          'claude-agent',
          'app-governance-mcp',
          'd1-governance-record',
          'airtable-projection',
          'zendesk-context',
          'operator-decision',
          'workflow-receipt'
        ],
        edgeIds: [
          'signal-to-agent',
          'agent-to-mcp',
          'mcp-to-d1',
          'd1-to-airtable',
          'zendesk-to-d1',
          'd1-to-operator',
          'operator-to-receipt'
        ]
      }
    }
  ],
  artifacts: APP_REVIEW_GOVERNANCE_ARTIFACTS,
  scenes: [
    {
      id: 'signal',
      kind: 'signal',
      label: 'Signal',
      title: 'A signal arrives. It is not a decision yet.',
      summary: 'Slack holds the starting signal.',
      detail:
        'The agent can read a relevant channel through a user-scoped Slack MCP, preserving source context before anything becomes governed work.',
      artifactIds: ['slack-signal-contract', 'motion-authoring-contract'],
      evidence: ['Slack is an intake signal, not the durable governance record.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['slack-signal', 'claude-agent'],
      motion: {
        cue: 'signal-reveal',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'normalize',
      kind: 'automation',
      label: 'Normalize',
      title: 'The agent turns context into a governed item.',
      summary: 'MCP bounds the write path.',
      detail:
        'The agent writes normalized, idempotent work through the App Governance MCP. It does not write directly into a presentation or silently inherit approval.',
      artifactIds: ['slack-signal-contract', 'app-governance-architecture', 'motion-authoring-contract'],
      evidence: ['The governed MCP boundary makes retries and ownership inspectable.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['claude-agent', 'app-governance-mcp', 'd1-governance-record'],
      motion: {
        cue: 'handoff-trace',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'orient',
      kind: 'map',
      label: 'Orient',
      title: 'One map makes source, context, and projection visible.',
      summary: 'D1 is durable; Airtable is human-readable.',
      detail:
        'The map keeps the governed record distinct from its Airtable projection and from linked Zendesk context, so an operator can see why each object appears.',
      artifactIds: ['app-governance-architecture', 'zendesk-context-contract', 'motion-authoring-contract'],
      evidence: ['Airtable is a workspace/projection; Zendesk remains linked partner context.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['d1-governance-record', 'airtable-projection', 'zendesk-context'],
      motion: {
        cue: 'module-focus',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'decide',
      kind: 'judgment',
      label: 'Decide',
      title: 'The operator decides the bounded next action.',
      summary: 'Proposed is not approved.',
      detail:
        'An agent can draft the smallest reversible action. Approval, rejection, owner, and policy gate remain explicit human judgment.',
      artifactIds: ['action-gate-contract', 'motion-authoring-contract'],
      evidence: ['Workflow actions have explicit proposed, approved, rejected, and completed states.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['d1-governance-record', 'operator-decision'],
      motion: {
        cue: 'decision-gate',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'run',
      kind: 'runbook',
      label: 'Run',
      title: 'The approved action follows the bounded runbook.',
      summary: 'The action can run only after its gate clears.',
      detail:
        'This fixture simulates a local-only reconciliation check. It has no production target, no external write, and no right to execute a rejected proposal.',
      artifactIds: ['action-gate-contract', 'motion-authoring-contract'],
      evidence: ['The prototype action is local-only and returns no production claim.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['operator-decision', 'app-governance-mcp', 'workflow-receipt'],
      motion: {
        cue: 'recovery-loop',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'proof',
      kind: 'receipt',
      label: 'Proof',
      title: 'The result returns as a receipt, not a chat claim.',
      summary: 'Proof closes the Arc.',
      detail:
        'The visible receipt states the issuer, evidence, mode, and boundary so the story can end with an inspectable artifact instead of an assertion.',
      artifactIds: ['receipt-contract', 'motion-authoring-contract'],
      evidence: ['Receipts record proof, decision, handoff, sync, or error evidence.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['workflow-receipt', 'd1-governance-record'],
      motion: {
        cue: 'proof-stamp',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    }
  ],
  routes: [
    {
      id: 'app-review-governance-arc',
      kind: 'arc',
      title: 'App Review Governance Arc',
      description: 'The durable A-to-Z human story from a source signal to a receipt.',
      sceneIds: ['signal', 'normalize', 'orient', 'decide', 'run', 'proof']
    },
    {
      id: 'app-review-governance-playbook',
      kind: 'playbook',
      title: 'App Review Governance Playbook',
      description: 'The reusable method for preserving source boundaries and decision gates.',
      sceneIds: ['signal', 'normalize', 'orient', 'decide', 'proof']
    },
    {
      id: 'app-review-governance-runbook',
      kind: 'runbook',
      title: 'App Review Governance Runbook',
      description: 'The method bound to the App Review operating context and local action simulation.',
      sceneIds: ['orient', 'decide', 'run', 'proof']
    }
  ]
};

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function findById<T extends { id: string }>(items: T[], id: string, kind: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${kind} not found: ${id}`);
  return item;
}

export function validateAtlasComposition(composition: AtlasComposition): AtlasCompositionValidation {
  const issues: string[] = [];
  if (composition.schema !== ATLAS_COMPOSITION_SCHEMA) {
    issues.push(`Unsupported composition schema: ${composition.schema}`);
  }

  const moduleIds = composition.mapModules.map((module) => module.id);
  const artifactIds = composition.artifacts.map((artifact) => artifact.id);
  const sceneIds = composition.scenes.map((scene) => scene.id);
  const routeIds = composition.routes.map((route) => route.id);
  for (const [kind, ids] of [
    ['map module', moduleIds],
    ['artifact', artifactIds],
    ['scene', sceneIds],
    ['route', routeIds]
  ] as const) {
    if (hasDuplicates(ids)) issues.push(`Duplicate ${kind} ids are not composable.`);
  }

  for (const module of composition.mapModules) {
    if ('nestedModuleIds' in module) {
      issues.push(`Map module ${module.id} declares nested map modules; map modules must be flat references.`);
    }
    if (module.map.version.mode === 'pinned' && !module.map.version.id) {
      issues.push(`Pinned map module ${module.id} is missing a version id.`);
    }
    if (!module.selection.nodeIds.length) issues.push(`Map module ${module.id} has no selected nodes.`);
  }

  for (const scene of composition.scenes) {
    if (!scene.mapModuleIds.length) issues.push(`Scene ${scene.id} has no reusable map module.`);
    if (scene.motion.cue === 'none') issues.push(`Scene ${scene.id} has no motion cue.`);
    if (scene.motion.reducedMotion !== 'static-emphasis') {
      issues.push(`Scene ${scene.id} must define a static reduced-motion equivalent.`);
    }
    for (const id of scene.mapModuleIds) {
      if (!moduleIds.includes(id)) issues.push(`Scene ${scene.id} references unknown map module ${id}.`);
    }
    for (const id of scene.artifactIds) {
      if (!artifactIds.includes(id)) issues.push(`Scene ${scene.id} references unknown artifact ${id}.`);
    }
  }

  for (const route of composition.routes) {
    if (!route.sceneIds.length) issues.push(`Route ${route.id} contains no scenes.`);
    for (const id of route.sceneIds) {
      if (!sceneIds.includes(id)) issues.push(`Route ${route.id} references unknown scene ${id}.`);
    }
  }

  return { ok: issues.length === 0, issues };
}

export function resolveMapModule(
  composition: AtlasComposition,
  moduleId: string,
  getMap: (mapId: string) => AtlasMapSnapshot
): AtlasMapModuleResolution {
  const module = findById(composition.mapModules, moduleId, 'Map module');
  const map = getMap(module.map.mapId);
  if (map.mapId !== module.map.mapId) {
    throw new Error(`Map resolver returned ${map.mapId} for module ${module.id}.`);
  }

  const resolvedVersion =
    module.map.version.mode === 'pinned' ? module.map.version.id : map.latestVersion;
  if (!resolvedVersion) throw new Error(`Map module ${module.id} has no resolvable version.`);
  if (!map.versions.includes(resolvedVersion)) {
    throw new Error(`Map version ${resolvedVersion} is unavailable for ${map.mapId}.`);
  }

  return { map, module, resolvedVersion, versionMode: module.map.version.mode };
}

export function toAtlasStoryAdapter(
  composition: AtlasComposition,
  routeId: string
): {
  ephemeral: true;
  route: AtlasCompositionRoute;
  schema: typeof ATLAS_STORY_ADAPTER_SCHEMA;
  scenes: Array<{
    id: string;
    motionCue: 'highlight-nodes' | 'trace-handoff' | 'reveal-proof';
    title: string;
  }>;
} {
  const route = findById(composition.routes, routeId, 'Composition route');
  const motionCueBySceneCue: Record<Exclude<AtlasMotionCue, 'none'>, 'highlight-nodes' | 'trace-handoff' | 'reveal-proof'> = {
    'signal-reveal': 'highlight-nodes',
    'module-focus': 'highlight-nodes',
    'handoff-trace': 'trace-handoff',
    'decision-gate': 'highlight-nodes',
    'recovery-loop': 'trace-handoff',
    'proof-stamp': 'reveal-proof'
  };

  return {
    ephemeral: true,
    route,
    schema: ATLAS_STORY_ADAPTER_SCHEMA,
    scenes: route.sceneIds.map((sceneId) => {
      const scene = findById(composition.scenes, sceneId, 'Composition scene');
      if (scene.motion.cue === 'none') throw new Error(`Scene ${scene.id} has no adapter motion cue.`);
      return { id: scene.id, motionCue: motionCueBySceneCue[scene.motion.cue], title: scene.title };
    })
  };
}

export function proposeArcAction(
  composition: AtlasComposition,
  input: { proposedBy: string }
): AtlasActionProposal {
  const validation = validateAtlasComposition(composition);
  if (!validation.ok) throw new Error(`Invalid composition: ${validation.issues.join(' ')}`);
  if (!input.proposedBy.trim()) throw new Error('An agent identity is required to propose an action.');

  return {
    actionId: 'reconcile-app-review-governance-checklist',
    arcId: composition.id,
    title: 'Reconcile the staged App Review governance checklist',
    description:
      'Compare the local staged checklist fixture with the App Review Governance contract and return a difference report. No external system is read or written.',
    gate: 'approval',
    proposedBy: input.proposedBy.trim(),
    status: 'proposed',
    boundaries: [
      'Local fixture only.',
      'No Airtable, Slack, Zendesk, D1, or production mutation.',
      'A rejected proposal cannot execute.'
    ]
  };
}

export function decideArcAction(
  proposal: AtlasActionProposal,
  input: { decidedBy: string; decision: 'approved' | 'rejected' }
): AtlasActionProposal {
  if (proposal.status !== 'proposed') throw new Error(`Only proposed actions can be decided; received ${proposal.status}.`);
  if (!input.decidedBy.trim()) throw new Error('An operator identity is required to decide an action.');

  return {
    ...proposal,
    status: input.decision,
    decision: { decidedBy: input.decidedBy.trim(), value: input.decision }
  };
}

export function executeArcAction(
  action: AtlasActionProposal,
  input: { executor: string }
): { action: Omit<AtlasActionProposal, 'status'> & { status: 'completed' }; receipt: AtlasActionReceipt } {
  if (action.status !== 'approved') {
    throw new Error(`Action ${action.actionId} must be approved before it can execute.`);
  }
  if (!input.executor.trim()) throw new Error('A runtime identity is required to issue a receipt.');

  return {
    action: { ...action, status: 'completed' },
    receipt: {
      id: `receipt-${action.actionId}`,
      actionId: action.actionId,
      kind: 'proof',
      issuer: input.executor.trim(),
      mode: 'local-fixture',
      status: 'recorded',
      evidence: 'Local fixture reconciliation completed; no external system was read or written.'
    }
  };
}
