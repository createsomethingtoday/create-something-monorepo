import {
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  type GovernedInteractionBundle,
  type GovernedInteractionBundleV0_1,
  type GovernedInteractionBundleV0_3,
  type GovernedInteractionCompatibilityDecisionV0_1,
  type GovernedInteractionCompatibilityDecisionV0_2,
  type GovernedInteractionHostContract,
} from '@create-something/workflow-compiler';

export const ATLAS_STUDIO_INTERACTION_HOST: GovernedInteractionHostContract = {
  hostId: 'atlas-studio',
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

export interface AtlasGovernedInteractionInspectionV0_1 {
  schemaVersion: 'atlas_governed_interaction_inspection.v0.1';
  bundle: GovernedInteractionBundleV0_1;
  compatibility: GovernedInteractionCompatibilityDecisionV0_1;
  authority: 'read_only';
}

export interface AtlasGovernedInteractionInspectionV0_2 {
  schemaVersion: 'atlas_governed_interaction_inspection.v0.2';
  bundle: GovernedInteractionBundle;
  compatibility: GovernedInteractionCompatibilityDecisionV0_2;
  authority: 'read_only';
}

export interface AtlasGovernedInteractionInspectionV0_3 {
  schemaVersion: 'atlas_governed_interaction_inspection.v0.3';
  bundle: GovernedInteractionBundleV0_3;
  compatibility: GovernedInteractionCompatibilityDecisionV0_2;
  authority: 'read_only';
}

export type AtlasGovernedInteractionInspection =
  | AtlasGovernedInteractionInspectionV0_1
  | AtlasGovernedInteractionInspectionV0_2
  | AtlasGovernedInteractionInspectionV0_3;

export function inspectAtlasGovernedInteraction(
  input: unknown,
): AtlasGovernedInteractionInspection {
  const bundle = parseGovernedInteractionBundle(input);
  if (bundle.schemaVersion === 'governed_interaction_bundle.v0.3') {
    return {
      schemaVersion: 'atlas_governed_interaction_inspection.v0.3',
      bundle,
      compatibility: evaluateGovernedInteractionCompatibility(
        bundle,
        ATLAS_STUDIO_INTERACTION_HOST,
      ),
      authority: 'read_only',
    };
  }
  return {
    schemaVersion: 'atlas_governed_interaction_inspection.v0.2',
    bundle,
    compatibility: evaluateGovernedInteractionCompatibility(
      bundle,
      ATLAS_STUDIO_INTERACTION_HOST,
    ),
    authority: 'read_only',
  };
}
