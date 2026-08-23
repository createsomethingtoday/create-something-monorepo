import type {
  WorkflowDefinitionV0_1,
  WorkflowDefinitionV0_2
} from '../src/index.js';

const legacyDefinition: WorkflowDefinitionV0_1 = {
  schemaVersion: 'workflow_definition.v0.1',
  workflowId: 'legacy-workflow',
  version: '1.0.0',
  title: 'Legacy workflow',
  businessObjective: 'Prove schema-discriminated action contracts.',
  owners: { workflow: 'operator', policy: 'operator', technical: 'operator' },
  systems: [],
  objects: [],
  events: [],
  actors: [],
  states: [],
  actions: [
    {
      id: 'legacy-action',
      title: 'Legacy action',
      kind: 'read',
      authority: 'operator',
      autonomy: 'auto_allow',
      systemsTouched: [],
      requiredEvidence: [],
      approval: { required: false },
      receipt: { requiredFields: [] },
      recovery: { mode: 'manual_fallback', owner: 'operator', path: 'Stop.' }
    }
  ],
  transitions: [],
  agents: [],
  evaluations: []
};

const invalidLegacyAction: WorkflowDefinitionV0_1['actions'][number] = {
  ...legacyDefinition.actions[0],
  // @ts-expect-error Evidence constraints are only valid for workflow_definition.v0.2.
  requiredEvidenceValues: { status: 'passed' }
};

const constrainedDefinition: WorkflowDefinitionV0_2 = {
  ...legacyDefinition,
  schemaVersion: 'workflow_definition.v0.2',
  actions: [
    {
      ...legacyDefinition.actions[0],
      requiredEvidenceValues: { status: 'passed' },
      requiredEvidenceMatchers: {
        summary: { kind: 'contains_case_insensitive', values: ['approved'] }
      }
    }
  ]
};

void legacyDefinition;
void invalidLegacyAction;
void constrainedDefinition;
