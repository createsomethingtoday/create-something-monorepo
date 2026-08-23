import {
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  type GovernedInteractionCompatibilityDecisionV0_1,
  type GovernedInteractionCompatibilityDecisionV0_2,
  type GovernedInteractionHostContract,
} from './interaction.js';
import type {
  GovernedInteractionBundle,
  GovernedInteractionBundleV0_1,
  GovernedInteractionBundleV0_3,
} from './types.js';

export const CLIENT_WORKSPACE_INTERACTION_HOST: GovernedInteractionHostContract = {
  hostId: 'client-workspace',
  language: 'create-something/control',
  schemaVersions: [
    'governed_interaction_bundle.v0.1',
    'governed_interaction_bundle.v0.2',
    'governed_interaction_bundle.v0.3',
  ],
  runtimeVersions: ['0.1.0'],
  capabilities: [
    'interaction.select',
    'receipt.inspect',
    'replay.inspect',
    'workflow.inspect',
  ],
  operations: ['select_replay_case'],
};

export interface ClientWorkspaceGovernedInteractionInspectionV0_1 {
  schemaVersion: 'client_workspace_governed_interaction_inspection.v0.1';
  bundle: GovernedInteractionBundleV0_1;
  compatibility: GovernedInteractionCompatibilityDecisionV0_1;
  authority: 'signed_delivery_read_only';
}

export interface ClientWorkspaceGovernedInteractionInspectionV0_2 {
  schemaVersion: 'client_workspace_governed_interaction_inspection.v0.2';
  bundle: GovernedInteractionBundle;
  compatibility: GovernedInteractionCompatibilityDecisionV0_2;
  authority: 'signed_delivery_read_only';
}

export interface ClientWorkspaceGovernedInteractionInspectionV0_3 {
  schemaVersion: 'client_workspace_governed_interaction_inspection.v0.3';
  bundle: GovernedInteractionBundleV0_3;
  compatibility: GovernedInteractionCompatibilityDecisionV0_2;
  authority: 'signed_delivery_read_only';
}

export type ClientWorkspaceGovernedInteractionInspection =
  | ClientWorkspaceGovernedInteractionInspectionV0_1
  | ClientWorkspaceGovernedInteractionInspectionV0_2
  | ClientWorkspaceGovernedInteractionInspectionV0_3;

export function inspectClientWorkspaceGovernedInteraction(
  input: unknown,
  expectedDefinitionHash: string,
): ClientWorkspaceGovernedInteractionInspection {
  const bundle = parseGovernedInteractionBundle(input);
  if (bundle.schemaVersion === 'governed_interaction_bundle.v0.3') {
    return {
      schemaVersion: 'client_workspace_governed_interaction_inspection.v0.3',
      bundle,
      compatibility: evaluateGovernedInteractionCompatibility(bundle, {
        ...CLIENT_WORKSPACE_INTERACTION_HOST,
        definitionHashes: { [bundle.workflowId]: expectedDefinitionHash },
      }),
      authority: 'signed_delivery_read_only',
    };
  }
  return {
    schemaVersion: 'client_workspace_governed_interaction_inspection.v0.2',
    bundle,
    compatibility: evaluateGovernedInteractionCompatibility(bundle, {
      ...CLIENT_WORKSPACE_INTERACTION_HOST,
      definitionHashes: { [bundle.workflowId]: expectedDefinitionHash },
    }),
    authority: 'signed_delivery_read_only',
  };
}
