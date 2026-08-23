import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { WorkflowDefinition, WorkflowReplayManifest } from './types.js';

export type WorkflowStarterTemplate = 'local-runbook';

export class WorkflowStarterError extends Error {
  readonly code: 'STARTER_TARGET_EXISTS' | 'STARTER_WRITE_FAILED' | 'UNKNOWN_STARTER_TEMPLATE';

  constructor(
    code: 'STARTER_TARGET_EXISTS' | 'STARTER_WRITE_FAILED' | 'UNKNOWN_STARTER_TEMPLATE',
    message: string
  ) {
    super(message);
    this.name = 'WorkflowStarterError';
    this.code = code;
  }
}

const LOCAL_RUNBOOK_WORKFLOW: WorkflowDefinition = {
  schemaVersion: 'workflow_definition.v0.1',
  workflowId: 'operations.local.runbook',
  version: '0.1.0',
  title: 'Local operating runbook',
  businessObjective:
    'Turn a recurring operating procedure into a safe, inspectable local workflow before any connected system runs.',
  owners: {
    workflow: 'operator',
    policy: 'operator',
    technical: 'repository-owner'
  },
  systems: [
    {
      id: 'local-runbook',
      title: 'Local runbook source',
      tier: 'database',
      owningSurface: 'versioned files in this repository',
      sourceOfTruth: true
    },
    {
      id: 'local-validation',
      title: 'Local validation',
      tier: 'automation',
      owningSurface: 'workflow-compiler CLI',
      sourceOfTruth: false
    },
    {
      id: 'operator-policy',
      title: 'Operator policy',
      tier: 'judgment',
      owningSurface: 'this versioned workflow definition',
      sourceOfTruth: true
    }
  ],
  objects: [
    {
      id: 'runbook',
      title: 'Runbook source',
      sourceSystemId: 'local-runbook',
      requiredFields: ['source_path', 'runbook_revision']
    },
    {
      id: 'workflow_receipt',
      title: 'Workflow receipt',
      sourceSystemId: 'local-runbook',
      requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome']
    }
  ],
  events: [
    {
      id: 'runbook_drafted',
      title: 'Runbook drafted',
      objectId: 'runbook',
      requiredEvidence: ['source_path', 'runbook_revision']
    },
    {
      id: 'next_step_requested',
      title: 'Next step requested',
      objectId: 'runbook',
      requiredEvidence: ['source_path', 'runbook_revision', 'validation_receipt']
    }
  ],
  actors: [
    { id: 'codex-agent', title: 'Paired Codex agent' },
    { id: 'operator', title: 'Human operator' }
  ],
  states: [
    { id: 'draft', title: 'Draft' },
    { id: 'checked', title: 'Checked' },
    { id: 'ready', title: 'Ready', terminal: true }
  ],
  actions: [
    {
      id: 'validate_runbook',
      title: 'Validate the local runbook',
      kind: 'decision',
      authority: 'codex-agent',
      autonomy: 'auto_allow',
      systemsTouched: ['local-runbook', 'local-validation'],
      requiredEvidence: ['source_path', 'runbook_revision', 'validation_receipt'],
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'escalate',
        owner: 'operator',
        path: 'Keep the runbook local, inspect the validation result, and revise the versioned source.'
      },
      tool: {
        name: 'local_runbook_validate',
        targetSystemId: 'local-validation',
        parameters: [
          {
            name: 'runbook_revision',
            type: 'string',
            description: 'Version identifier for the local runbook source.'
          },
          {
            name: 'source_path',
            type: 'string',
            description: 'Repository-local path to the runbook source.'
          },
          {
            name: 'validation_receipt',
            type: 'string',
            description: 'Local validation receipt identifier.'
          }
        ]
      },
      agentId: 'codex-paired-agent'
    },
    {
      id: 'approve_next_step',
      title: 'Approve the next connected step',
      kind: 'decision',
      authority: 'operator',
      autonomy: 'approval_required',
      systemsTouched: ['local-runbook', 'operator-policy'],
      requiredEvidence: ['source_path', 'runbook_revision', 'validation_receipt'],
      approval: { required: true, owner: 'operator' },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'operator',
        path: 'Keep the workflow local until the operator reviews the evidence and chooses a next step.'
      }
    },
    {
      id: 'execute_live_action',
      title: 'Execute a live action',
      kind: 'publish',
      authority: 'operator',
      autonomy: 'blocked',
      systemsTouched: ['operator-policy'],
      requiredEvidence: ['source_path', 'runbook_revision', 'live_action_reason'],
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'operator',
        path: 'Stop. No live action belongs in this local-only starter; add a separately reviewed runtime contract first.'
      }
    }
  ],
  transitions: [
    {
      id: 'draft-to-checked',
      from: 'draft',
      to: 'checked',
      actionId: 'validate_runbook'
    },
    {
      id: 'checked-to-ready',
      from: 'checked',
      to: 'ready',
      actionId: 'approve_next_step'
    },
    {
      id: 'draft-to-ready-live-action',
      from: 'draft',
      to: 'ready',
      actionId: 'execute_live_action'
    }
  ],
  agents: [
    {
      id: 'codex-paired-agent',
      title: 'Paired Codex agent',
      purpose:
        'Propose and validate repository-local runbook changes without owning a live action.',
      allowedActionIds: ['validate_runbook'],
      escalationOwner: 'operator'
    }
  ],
  evaluations: [
    {
      id: 'local-validation-passes',
      title: 'Complete local evidence permits validation',
      actionId: 'validate_runbook',
      expectedOutcome: 'pass',
      requiredEvidence: ['source_path', 'runbook_revision', 'validation_receipt']
    },
    {
      id: 'connected-step-waits',
      title: 'A connected next step waits for the operator',
      actionId: 'approve_next_step',
      expectedOutcome: 'approval_required',
      requiredEvidence: ['source_path', 'runbook_revision', 'validation_receipt']
    },
    {
      id: 'live-action-stops',
      title: 'A live action remains blocked in the local starter',
      actionId: 'execute_live_action',
      expectedOutcome: 'blocked',
      requiredEvidence: ['source_path', 'runbook_revision', 'live_action_reason']
    }
  ]
};

const LOCAL_RUNBOOK_CASES: WorkflowReplayManifest = {
  schemaVersion: 'workflow_replay_manifest.v0.1',
  workflowId: 'operations.local.runbook',
  cases: [
    {
      caseId: 'local-validation-passes',
      title: 'Complete local evidence validates the runbook',
      initialState: 'draft',
      actionId: 'validate_runbook',
      actorId: 'codex-agent',
      evidence: {
        source_path: 'RUNBOOK.md',
        runbook_revision: 'starter-v1',
        validation_receipt: 'local-validation-fixture-001'
      },
      approvals: [],
      expectedOutcome: 'pass',
      expectedState: 'checked'
    },
    {
      caseId: 'connected-step-waits',
      title: 'The next connected step waits for the operator',
      initialState: 'checked',
      actionId: 'approve_next_step',
      actorId: 'operator',
      evidence: {
        source_path: 'RUNBOOK.md',
        runbook_revision: 'starter-v1',
        validation_receipt: 'local-validation-fixture-001'
      },
      approvals: [],
      expectedOutcome: 'approval_required',
      expectedState: 'checked'
    },
    {
      caseId: 'live-action-stops',
      title: 'A live action remains blocked',
      initialState: 'draft',
      actionId: 'execute_live_action',
      actorId: 'operator',
      evidence: {
        source_path: 'RUNBOOK.md',
        runbook_revision: 'starter-v1',
        live_action_reason: 'The local starter has no connected runtime.'
      },
      approvals: [],
      expectedOutcome: 'blocked',
      expectedState: 'draft'
    }
  ]
};

const LOCAL_RUNBOOK_FILES: Record<string, string> = {
  'PLAYBOOK.md': [
    '# Local operating runbook playbook',
    '',
    'Use this pattern to turn recurring work into an inspectable repository artifact.',
    '',
    'A paired Codex agent may propose bounded edits and explain the contract. The operator owns approval, connected systems, and every live action.',
    '',
    'This starter has no credentials, network calls, or execution controls.',
    '',
    '1. Describe the recurring outcome and the evidence it needs.',
    '2. Let Codex propose a small change to the versioned runbook and workflow files.',
    '3. Validate and simulate the workflow in the terminal.',
    '4. Review the run, wait, and stop outcomes before adding any connected runtime.',
    ''
  ].join('\n'),
  'README.md': [
    '# Local-only workflow starter',
    '',
    'This directory is a local-only starter for a paired Codex agent and Workflow Compiler.',
    'It creates no credentials, calls no network service, and executes no live action.',
    '',
    'Run from this directory:',
    '',
    'npx workflow-compiler validate --workflow workflow.json',
    'npx workflow-compiler simulate --workflow workflow.json --cases cases.json',
    'npx workflow-compiler explain --workflow workflow.json --cases cases.json',
    '',
    'Compile inspectable artifacts only after the simulation matches expectations:',
    '',
    'npx workflow-compiler compile --workflow workflow.json --cases cases.json --out artifacts',
    ''
  ].join('\n'),
  'RUNBOOK.md': [
    '# Local operating runbook',
    '',
    '## Purpose',
    '',
    'Turn recurring operator work into a versioned, testable procedure before connecting a real system.',
    '',
    '## Operator loop',
    '',
    '1. Ask the paired Codex agent to propose a small repository-local change.',
    '2. Review the diff and update the workflow evidence requirements.',
    '3. Run local validation and replay simulation.',
    '4. Keep a connected next step waiting for explicit operator approval.',
    '',
    '## Boundary',
    '',
    'This starter does not execute live actions. A connected runtime, credential, or external write needs a separately reviewed contract and promotion path.',
    ''
  ].join('\n'),
  'cases.json': JSON.stringify(LOCAL_RUNBOOK_CASES, null, 2) + '\n',
  'workflow.json': JSON.stringify(LOCAL_RUNBOOK_WORKFLOW, null, 2) + '\n'
};

export interface WorkflowStarterResult {
  template: WorkflowStarterTemplate;
  dir: string;
  files: string[];
}

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return (error as { code?: unknown }).code === 'EEXIST';
}

export async function writeWorkflowStarter(
  template: WorkflowStarterTemplate,
  requestedDir: string
): Promise<WorkflowStarterResult> {
  if (template !== 'local-runbook') {
    throw new WorkflowStarterError(
      'UNKNOWN_STARTER_TEMPLATE',
      'Unknown starter template: ' + String(template) + '.'
    );
  }

  const dir = resolve(requestedDir);
  try {
    await mkdir(dir, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (isAlreadyExists(error)) {
      throw new WorkflowStarterError(
        'STARTER_TARGET_EXISTS',
        'Refusing to initialize because the target directory already exists: ' + dir
      );
    }
    throw new WorkflowStarterError(
      'STARTER_WRITE_FAILED',
      'Unable to create the starter directory: ' + dir
    );
  }

  try {
    await Promise.all(
      Object.entries(LOCAL_RUNBOOK_FILES).map(([file, content]) =>
        writeFile(join(dir, file), content, { encoding: 'utf8', mode: 0o600 })
      )
    );
  } catch {
    throw new WorkflowStarterError(
      'STARTER_WRITE_FAILED',
      'Unable to write the local-runbook starter in: ' + dir
    );
  }

  return {
    template,
    dir,
    files: Object.keys(LOCAL_RUNBOOK_FILES).sort()
  };
}
