import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { WorkflowDefinition, WorkflowReplayManifest } from './types.js';

export type WorkflowStarterTemplate = 'local-runbook' | 'marketplace-submission';

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

const MARKETPLACE_SUBMISSION_WORKFLOW: WorkflowDefinition = {
  schemaVersion: 'workflow_definition.v0.2',
  workflowId: 'webflow.marketplace.submission-to-review',
  version: '0.1.0',
  title: 'Webflow Marketplace submission to review',
  businessObjective:
    'Make the submission-to-review path legible and replayable before a builder connects a live intake, validation, Airtable, or reviewer runtime.',
  owners: {
    workflow: 'Marketplace operations owner',
    policy: 'Marketplace review owner',
    technical: 'Marketplace Submission Cloud owner'
  },
  systems: [
    {
      id: 'marketplace-submission-cloud',
      title: 'Marketplace Submission Cloud',
      tier: 'automation',
      owningSurface: 'apps/marketplace-template-submission-cloud',
      sourceOfTruth: false
    },
    {
      id: 'published-site-validation',
      title: 'Published-site validation',
      tier: 'automation',
      owningSurface:
        'apps/marketplace-template-submission-cloud/app/api/intake/validate-published-url/route.ts',
      sourceOfTruth: false
    },
    {
      id: 'validator-app-preflight',
      title: 'Validator App preflight',
      tier: 'automation',
      owningSurface: 'apps/marketplace-template-submission-cloud/lib/intake/validator-app.ts',
      sourceOfTruth: false
    },
    {
      id: 'airtable-marketplace',
      title: 'Airtable Marketplace',
      tier: 'database',
      owningSurface: 'Marketplace Template Submission Automation and reviewer records',
      sourceOfTruth: true
    },
    {
      id: 'marketplace-review-policy',
      title: 'Marketplace review policy',
      tier: 'judgment',
      owningSurface: 'Marketplace review owner and reviewer queue',
      sourceOfTruth: true
    }
  ],
  objects: [
    {
      id: 'submission_intent',
      title: 'Submission intent',
      sourceSystemId: 'marketplace-submission-cloud',
      requiredFields: ['submission_id', 'published_url', 'form_schema_version']
    },
    {
      id: 'validation_result',
      title: 'Form and published-site validation result',
      sourceSystemId: 'published-site-validation',
      requiredFields: ['submission_id', 'form_validation_receipt', 'published_url']
    },
    {
      id: 'preflight_result',
      title: 'Validator App preflight result',
      sourceSystemId: 'validator-app-preflight',
      requiredFields: ['submission_id', 'preflight_policy', 'preflight_receipt', 'preflight_status']
    },
    {
      id: 'automation_handoff',
      title: 'Confirmed Airtable Automation handoff receipt',
      sourceSystemId: 'airtable-marketplace',
      requiredFields: [
        'submission_id',
        'automation_version',
        'webhook_receipt',
        'handoff_state',
        'asset_id',
        'version_id',
        'review_status'
      ]
    },
    {
      id: 'review_request',
      title: 'Reviewer queue request',
      sourceSystemId: 'airtable-marketplace',
      requiredFields: ['submission_id', 'asset_id', 'version_id', 'review_request_receipt']
    }
  ],
  events: [
    {
      id: 'form_completed',
      title: 'Submission form completed',
      objectId: 'submission_intent',
      requiredEvidence: ['submission_id', 'published_url', 'form_schema_version']
    },
    {
      id: 'form_validated',
      title: 'Form and published site validated',
      objectId: 'validation_result',
      requiredEvidence: ['submission_id', 'form_validation_receipt', 'published_url']
    },
    {
      id: 'preflight_completed',
      title: 'Validator App preflight completed',
      objectId: 'preflight_result',
      requiredEvidence: [
        'submission_id',
        'preflight_policy',
        'preflight_receipt',
        'preflight_status'
      ]
    },
    {
      id: 'automation_handoff_observed',
      title: 'Confirmed Airtable Automation handoff observed',
      objectId: 'automation_handoff',
      requiredEvidence: [
        'submission_id',
        'automation_version',
        'webhook_receipt',
        'handoff_state',
        'asset_id',
        'version_id',
        'review_status'
      ]
    },
    {
      id: 'review_requested',
      title: 'Reviewer queue request observed',
      objectId: 'review_request',
      requiredEvidence: ['submission_id', 'asset_id', 'version_id', 'review_request_receipt']
    }
  ],
  actors: [
    { id: 'creator', title: 'Marketplace creator' },
    { id: 'marketplace-submission-runtime', title: 'Marketplace Submission Cloud runtime' },
    { id: 'marketplace-reviewer', title: 'Marketplace reviewer' },
    { id: 'codex-agent', title: 'Paired Codex agent' }
  ],
  states: [
    { id: 'draft', title: 'Draft' },
    { id: 'form_validated', title: 'Form validated' },
    { id: 'preflight_passed', title: 'Preflight passed' },
    { id: 'ready_for_review', title: 'Ready for review' },
    { id: 'reviewed', title: 'Reviewed', terminal: true }
  ],
  actions: [
    {
      id: 'validate_submission_form',
      title: 'Validate the submission form and published site',
      kind: 'decision',
      authority: 'marketplace-submission-runtime',
      autonomy: 'auto_allow',
      systemsTouched: ['marketplace-submission-cloud', 'published-site-validation'],
      requiredEvidence: [
        'submission_id',
        'published_url',
        'form_schema_version',
        'form_validation_receipt'
      ],
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'Marketplace operations owner',
        path: 'Keep the submission outside the review queue and correct the form or published-site evidence.'
      }
    },
    {
      id: 'enforce_validator_preflight',
      title: 'Enforce the Validator App preflight contract',
      kind: 'decision',
      authority: 'marketplace-submission-runtime',
      autonomy: 'auto_allow',
      systemsTouched: ['marketplace-submission-cloud', 'validator-app-preflight'],
      requiredEvidence: [
        'submission_id',
        'published_url',
        'preflight_policy',
        'preflight_receipt',
        'preflight_status'
      ],
      requiredEvidenceValues: { preflight_status: 'passed' },
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'Marketplace operations owner',
        path: 'Stop the handoff when preflight does not pass and use the owning intake surface to resolve it.'
      }
    },
    {
      id: 'inspect_automation_handoff_receipt',
      title: 'Inspect the confirmed Airtable Automation handoff receipt',
      kind: 'read',
      authority: 'codex-agent',
      autonomy: 'auto_allow',
      systemsTouched: ['airtable-marketplace'],
      requiredEvidence: [
        'submission_id',
        'automation_version',
        'webhook_receipt',
        'handoff_state',
        'asset_id',
        'version_id',
        'review_status'
      ],
      requiredEvidenceValues: { handoff_state: 'confirmed' },
      requiredEvidenceMatchers: {
        review_status: {
          kind: 'contains_case_insensitive',
          values: ['ready for review', 'response to review', 'in review']
        }
      },
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'escalate',
        owner: 'Marketplace operations owner',
        path: 'Do not retry blindly. Inspect the owning runtime and reconcile only with an idempotent, receipt-aware procedure.'
      },
      agentId: 'codex-paired-agent'
    },
    {
      id: 'stop_failed_preflight',
      title: 'Stop a failed Validator App preflight',
      kind: 'decision',
      authority: 'marketplace-submission-runtime',
      autonomy: 'blocked',
      systemsTouched: ['marketplace-submission-cloud', 'validator-app-preflight'],
      requiredEvidence: [
        'submission_id',
        'preflight_status',
        'preflight_receipt',
        'preflight_failure_reason'
      ],
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'Marketplace operations owner',
        path: 'Keep the submission out of Airtable review routing until a new passing preflight result exists.'
      }
    },
    {
      id: 'await_reviewer_decision',
      title: 'Wait for the marketplace reviewer decision',
      kind: 'decision',
      authority: 'marketplace-reviewer',
      autonomy: 'approval_required',
      systemsTouched: ['airtable-marketplace', 'marketplace-review-policy'],
      requiredEvidence: ['submission_id', 'asset_id', 'version_id', 'review_request_receipt'],
      approval: { required: true, owner: 'marketplace-reviewer' },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'escalate',
        owner: 'Marketplace review owner',
        path: 'Keep the request in the reviewer queue; only the assigned reviewer or policy owner can resolve the decision.'
      }
    },
    {
      id: 'send_creator_decision',
      title: 'Send a creator decision',
      kind: 'write',
      authority: 'marketplace-reviewer',
      autonomy: 'blocked',
      systemsTouched: ['airtable-marketplace', 'marketplace-review-policy'],
      requiredEvidence: ['submission_id', 'decision_receipt', 'creator_contact_ref'],
      approval: { required: false },
      receipt: {
        requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome', 'evidence_refs']
      },
      recovery: {
        mode: 'manual_fallback',
        owner: 'Marketplace review owner',
        path: 'Use the owning reviewer communication process after its decision and delivery evidence are independently verified.'
      }
    }
  ],
  transitions: [
    {
      id: 'draft-to-form-validated',
      from: 'draft',
      to: 'form_validated',
      actionId: 'validate_submission_form'
    },
    {
      id: 'form-validated-to-preflight-passed',
      from: 'form_validated',
      to: 'preflight_passed',
      actionId: 'enforce_validator_preflight'
    },
    {
      id: 'preflight-passed-to-ready-for-review',
      from: 'preflight_passed',
      to: 'ready_for_review',
      actionId: 'inspect_automation_handoff_receipt'
    },
    {
      id: 'ready-for-review-to-reviewed',
      from: 'ready_for_review',
      to: 'reviewed',
      actionId: 'await_reviewer_decision'
    }
  ],
  agents: [
    {
      id: 'codex-paired-agent',
      title: 'Paired Codex agent',
      purpose:
        'Inspect only provided local evidence and explain the versioned submission-to-review contract without calling an owning system.',
      allowedActionIds: ['inspect_automation_handoff_receipt'],
      escalationOwner: 'Marketplace operations owner'
    }
  ],
  evaluations: [
    {
      id: 'form-validation-passes',
      title: 'Complete form evidence permits the local form-validation contract',
      actionId: 'validate_submission_form',
      expectedOutcome: 'pass',
      requiredEvidence: [
        'submission_id',
        'published_url',
        'form_schema_version',
        'form_validation_receipt'
      ]
    },
    {
      id: 'validator-preflight-passes',
      title: 'A passing preflight result permits inspection of the handoff',
      actionId: 'enforce_validator_preflight',
      expectedOutcome: 'pass',
      requiredEvidence: [
        'submission_id',
        'published_url',
        'preflight_policy',
        'preflight_receipt',
        'preflight_status'
      ]
    },
    {
      id: 'automation-handoff-receipt-passes',
      title: 'A confirmed automation receipt permits local inspection',
      actionId: 'inspect_automation_handoff_receipt',
      expectedOutcome: 'pass',
      requiredEvidence: [
        'submission_id',
        'automation_version',
        'webhook_receipt',
        'handoff_state',
        'asset_id',
        'version_id',
        'review_status'
      ]
    },
    {
      id: 'failed-preflight-stops',
      title: 'A failed preflight remains a stop',
      actionId: 'stop_failed_preflight',
      expectedOutcome: 'blocked',
      requiredEvidence: [
        'submission_id',
        'preflight_status',
        'preflight_receipt',
        'preflight_failure_reason'
      ]
    },
    {
      id: 'missing-automation-receipt-stops',
      title: 'A missing automation receipt stops local inspection',
      actionId: 'inspect_automation_handoff_receipt',
      expectedOutcome: 'blocked',
      requiredEvidence: ['submission_id', 'automation_version']
    },
    {
      id: 'reviewer-decision-waits',
      title: 'A reviewer decision remains approval-gated',
      actionId: 'await_reviewer_decision',
      expectedOutcome: 'approval_required',
      requiredEvidence: ['submission_id', 'asset_id', 'version_id', 'review_request_receipt']
    },
    {
      id: 'creator-message-stops',
      title: 'Creator messaging remains outside the local template',
      actionId: 'send_creator_decision',
      expectedOutcome: 'blocked',
      requiredEvidence: ['submission_id', 'decision_receipt', 'creator_contact_ref']
    }
  ]
};

const MARKETPLACE_SUBMISSION_CASES: WorkflowReplayManifest = {
  schemaVersion: 'workflow_replay_manifest.v0.1',
  workflowId: 'webflow.marketplace.submission-to-review',
  cases: [
    {
      caseId: 'form-validation-passes',
      title: 'Complete form evidence validates locally',
      initialState: 'draft',
      actionId: 'validate_submission_form',
      actorId: 'marketplace-submission-runtime',
      evidence: {
        submission_id: 'submission-fixture-001',
        published_url: 'https://example.test/templates/fixture',
        form_schema_version: 'fixture-v1',
        form_validation_receipt: 'form-validation-fixture-001'
      },
      approvals: [],
      expectedOutcome: 'pass',
      expectedState: 'form_validated'
    },
    {
      caseId: 'validator-preflight-passes',
      title: 'A passing preflight result permits the next local contract step',
      initialState: 'form_validated',
      actionId: 'enforce_validator_preflight',
      actorId: 'marketplace-submission-runtime',
      evidence: {
        submission_id: 'submission-fixture-001',
        published_url: 'https://example.test/templates/fixture',
        preflight_policy: 'validator-app-enforce-fixture-v1',
        preflight_receipt: 'preflight-fixture-001',
        preflight_status: 'passed'
      },
      approvals: [],
      expectedOutcome: 'pass',
      expectedState: 'preflight_passed'
    },
    {
      caseId: 'automation-handoff-receipt-passes',
      title: 'A complete handoff receipt is locally inspectable',
      initialState: 'preflight_passed',
      actionId: 'inspect_automation_handoff_receipt',
      actorId: 'codex-agent',
      evidence: {
        submission_id: 'submission-fixture-001',
        automation_version: 'marketplace-template-submission-fixture-v1',
        webhook_receipt: 'webhook-fixture-001',
        handoff_state: 'confirmed',
        asset_id: 'asset-fixture-001',
        version_id: 'version-fixture-001',
        review_status: '🆕Ready for Review'
      },
      approvals: [],
      expectedOutcome: 'pass',
      expectedState: 'ready_for_review'
    },
    {
      caseId: 'failed-preflight-stops',
      title: 'A failed preflight cannot be routed onward by this template',
      initialState: 'form_validated',
      actionId: 'stop_failed_preflight',
      actorId: 'marketplace-submission-runtime',
      evidence: {
        submission_id: 'submission-fixture-002',
        preflight_status: 'failed',
        preflight_receipt: 'preflight-fixture-002',
        preflight_failure_reason: 'Fixture failure only; resolve in the owning intake surface.'
      },
      approvals: [],
      expectedOutcome: 'blocked',
      expectedState: 'form_validated'
    },
    {
      caseId: 'missing-automation-receipt-stops',
      title: 'A handoff without a receipt cannot be treated as ready for review',
      initialState: 'preflight_passed',
      actionId: 'inspect_automation_handoff_receipt',
      actorId: 'codex-agent',
      evidence: {
        submission_id: 'submission-fixture-003',
        automation_version: 'marketplace-template-submission-fixture-v1'
      },
      approvals: [],
      expectedOutcome: 'blocked',
      expectedState: 'preflight_passed'
    },
    {
      caseId: 'reviewer-decision-waits',
      title: 'A reviewer decision waits for an authorized reviewer',
      initialState: 'ready_for_review',
      actionId: 'await_reviewer_decision',
      actorId: 'marketplace-reviewer',
      evidence: {
        submission_id: 'submission-fixture-001',
        asset_id: 'asset-fixture-001',
        version_id: 'version-fixture-001',
        review_request_receipt: 'review-request-fixture-001'
      },
      approvals: [],
      expectedOutcome: 'approval_required',
      expectedState: 'ready_for_review'
    },
    {
      caseId: 'creator-message-stops',
      title: 'Creator messaging is blocked in this local contract',
      initialState: 'ready_for_review',
      actionId: 'send_creator_decision',
      actorId: 'marketplace-reviewer',
      evidence: {
        submission_id: 'submission-fixture-001',
        decision_receipt: 'review-decision-fixture-001',
        creator_contact_ref: 'creator-contact-fixture-001'
      },
      approvals: [],
      expectedOutcome: 'blocked',
      expectedState: 'ready_for_review'
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

const MARKETPLACE_SUBMISSION_FILES: Record<string, string> = {
  'PLAYBOOK.md': [
    '# Marketplace submission-to-review playbook',
    '',
    'Use this local contract to explain the full submission path before connecting a live intake or review service.',
    '',
    'A paired Codex agent may inspect the versioned files and supplied fixture evidence. It does not call Webflow, Airtable, Validator App, or a reviewer service.',
    '',
    '1. Capture the required form fields and published URL as evidence.',
    '2. Require a Validator App preflight result before treating a handoff as eligible.',
    '3. Require a confirmed handoff state plus its asset, version, and an owning review-ready status receipt before marking the submission ready for review.',
    '4. Keep reviewer approval and creator communication in the owning human workflow.',
    '5. Replay pass, wait, and stop cases locally before changing a production owner.',
    ''
  ].join('\n'),
  'README.md': [
    '# Marketplace submission-to-review starter',
    '',
    'This is a local, read-only contract for explaining a Marketplace submission from form completion through human review.',
    'It does not call Webflow, Airtable, or a review service; it creates no credentials, sends no webhook, and does not message a creator.',
    '',
    'Run from this directory:',
    '',
    'npx workflow-compiler validate --workflow workflow.json',
    'npx workflow-compiler simulate --workflow workflow.json --cases cases.json',
    'npx workflow-compiler explain --workflow workflow.json --cases cases.json',
    '',
    'The cases use sanitized deterministic fixture identifiers. Replace them only with reviewed local evidence fixtures; a source pointer is not proof that a live service ran.',
    '',
    'Read [SOURCES.md](./SOURCES.md) before changing an owning surface. The pointers describe where production behavior is owned, not an adapter or permission to invoke it.',
    ''
  ].join('\n'),
  'RUNBOOK.md': [
    '# Marketplace submission-to-review runbook',
    '',
    '## Purpose',
    '',
    'Make app-form validation, published-site checks, Validator App preflight, Airtable Automation handoff, reviewer waiting, and creator-message boundaries visible in one replayable artifact.',
    '',
    '## Operator loop',
    '',
    '1. Confirm the form includes a submission identifier, published URL, and schema revision.',
    '2. Require the form-validation receipt before continuing.',
    '3. Require a passing Validator App preflight policy, result, and receipt.',
    '4. Treat an Airtable Automation webhook receipt as processing evidence only. Require the confirmed handoff state plus asset, version, and an owning review-ready status receipt before reviewer readiness; this template does not send or retry a webhook.',
    '5. Keep the reviewer decision waiting for the assigned reviewer.',
    '6. Keep creator messaging blocked until the owning reviewer communication process has independently verified its decision and delivery evidence.',
    '',
    '## Recovery',
    '',
    'A failed preflight remains stopped. A missing webhook receipt or processing handoff is not a reason to retry blindly: inspect the owning runtime, then reconcile only with its idempotent, receipt-aware procedure.',
    '',
    '## Boundary',
    '',
    'This starter is documentation and deterministic local replay. It has no network client, provider credentials, execution controls, Airtable writes, Webflow actions, approval controls, or delivery transport.',
    ''
  ].join('\n'),
  'SOURCES.md': [
    '# Source-bound documentation',
    '',
    'These are read-only pointers to the repository surfaces that own the live behavior. They are not proof of a current production result, and this starter never reads or invokes them.',
    '',
    '- `apps/marketplace-template-submission-cloud/app/api/intake/template/route.ts` — template-intake boundary and preflight outcome handling.',
    '- `apps/marketplace-template-submission-cloud/app/api/intake/validate-published-url/route.ts` — published URL validation boundary.',
    '- `apps/marketplace-template-submission-cloud/lib/intake/validator-app.ts` — Validator App preflight policy contract.',
    '- `apps/marketplace-template-submission-cloud/README.md` — Marketplace Template Submission Automation handoff ownership.',
    '- `docs/deliveries/webflow-marketplace/2026-06-05-submission-quality-loop-report.md` — historical quality-loop documentation; do not treat it as a live receipt.',
    '',
    'Use the paths to orient a reviewed implementation or troubleshooting pass. Keep live data, credentials, webhook transport, reviewer decisions, and creator messaging in their owning systems.',
    ''
  ].join('\n'),
  'cases.json': JSON.stringify(MARKETPLACE_SUBMISSION_CASES, null, 2) + '\n',
  'workflow.json': JSON.stringify(MARKETPLACE_SUBMISSION_WORKFLOW, null, 2) + '\n'
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
  const files =
    template === 'local-runbook'
      ? LOCAL_RUNBOOK_FILES
      : template === 'marketplace-submission'
        ? MARKETPLACE_SUBMISSION_FILES
        : undefined;
  if (!files) {
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
      Object.entries(files).map(([file, content]) =>
        writeFile(join(dir, file), content, { encoding: 'utf8', mode: 0o600 })
      )
    );
  } catch {
    throw new WorkflowStarterError(
      'STARTER_WRITE_FAILED',
      'Unable to write the ' + template + ' starter in: ' + dir
    );
  }

  return {
    template,
    dir,
    files: Object.keys(files).sort()
  };
}
