import {
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  type GovernedInteractionCompatibilityDecision,
  type GovernedInteractionHostContract,
} from './interaction.js';
import type { GovernedInteractionBundle } from './types.js';

export const CLIENT_WORKSPACE_INTERACTION_HOST: GovernedInteractionHostContract = {
  hostId: 'client-workspace',
  language: 'create-something/control',
  runtimeVersions: ['0.1.0'],
  capabilities: [
    'interaction.select',
    'receipt.inspect',
    'replay.inspect',
    'workflow.inspect',
  ],
  operations: ['select_replay_case'],
};

export interface ClientWorkspaceGovernedInteractionInspection {
  schemaVersion: 'client_workspace_governed_interaction_inspection.v0.1';
  bundle: GovernedInteractionBundle;
  compatibility: GovernedInteractionCompatibilityDecision;
  authority: 'signed_delivery_read_only';
}

export function inspectClientWorkspaceGovernedInteraction(
  input: unknown,
  expectedDefinitionHash: string,
): ClientWorkspaceGovernedInteractionInspection {
  const bundle = parseGovernedInteractionBundle(input);
  return {
    schemaVersion: 'client_workspace_governed_interaction_inspection.v0.1',
    bundle,
    compatibility: evaluateGovernedInteractionCompatibility(bundle, {
      ...CLIENT_WORKSPACE_INTERACTION_HOST,
      definitionHashes: { [bundle.workflowId]: expectedDefinitionHash },
    }),
    authority: 'signed_delivery_read_only',
  };
}
