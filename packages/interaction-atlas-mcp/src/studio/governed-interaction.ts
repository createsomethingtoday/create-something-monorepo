import {
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  type GovernedInteractionBundle,
  type GovernedInteractionCompatibilityDecision,
  type GovernedInteractionHostContract,
} from '@create-something/workflow-compiler';

export const ATLAS_STUDIO_INTERACTION_HOST: GovernedInteractionHostContract = {
  hostId: 'atlas-studio',
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

export interface AtlasGovernedInteractionInspection {
  schemaVersion: 'atlas_governed_interaction_inspection.v0.1';
  bundle: GovernedInteractionBundle;
  compatibility: GovernedInteractionCompatibilityDecision;
  authority: 'read_only';
}

export function inspectAtlasGovernedInteraction(
  input: unknown,
): AtlasGovernedInteractionInspection {
  const bundle = parseGovernedInteractionBundle(input);
  return {
    schemaVersion: 'atlas_governed_interaction_inspection.v0.1',
    bundle,
    compatibility: evaluateGovernedInteractionCompatibility(
      bundle,
      ATLAS_STUDIO_INTERACTION_HOST,
    ),
    authority: 'read_only',
  };
}
