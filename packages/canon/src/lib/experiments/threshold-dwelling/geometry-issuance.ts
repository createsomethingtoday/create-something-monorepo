import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate
} from './dimensioned-project.js';
import { THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION } from './living-system-revision.js';
import type {
  ThresholdDwellingEvidenceStatus,
  ThresholdDwellingProfessionalReviewRequirementId
} from './professional-review.js';

/**
 * The geometry evidence needed before a renderer may represent vertical and
 * opening geometry as an issued physical 1:1 scene. This gate is deliberately
 * narrower than construction approval: it creates a traceable representation
 * boundary, never a permit, safety finding, or release to build.
 */
export type ThresholdDwellingPhysicalSceneFactId =
  | 'finished-floor-and-site-datum'
  | 'exterior-wall-assembly-geometry'
  | 'interior-partition-geometry'
  | 'roof-and-ceiling-geometry'
  | 'door-opening-geometry'
  | 'window-and-glass-opening-geometry'
  | 'structural-support-and-lateral-geometry'
  | 'mep-service-coordination-geometry'
  | 'exterior-grade-and-threshold-geometry';

export type ThresholdDwellingPhysicalSceneStatus =
  | 'blocked-vertical-geometry-unissued'
  | 'eligible-with-professional-review';

export interface ThresholdDwellingPhysicalSceneFact {
  id: ThresholdDwellingPhysicalSceneFactId;
  title: string;
  purpose: string;
  requiredProfessionalReviewIds: readonly ThresholdDwellingProfessionalReviewRequirementId[];
  evidenceStatus: ThresholdDwellingEvidenceStatus;
  /** A revision-specific authoritative value; null means no geometry was issued. */
  value: string | number | null;
  sourceDocumentId: string | null;
  verifiedBy: string | null;
}

export interface ThresholdDwellingPhysicalSceneIssuance {
  schemaVersion: 'workway.physical-scene-issuance.v1';
  id: 'threshold-dwelling-rev-0.8-physical-scene-gate';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  baselineRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  spatialRevision: typeof THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision;
  coordinateTruth: 'revised-plan-horizontal-only';
  facts: readonly ThresholdDwellingPhysicalSceneFact[];
  constructionReady: false;
}

export interface ThresholdDwellingPhysicalSceneIssuanceAssessment {
  issuanceId: ThresholdDwellingPhysicalSceneIssuance['id'];
  physicalSceneStatus: ThresholdDwellingPhysicalSceneStatus;
  unissuedFactIds: ThresholdDwellingPhysicalSceneFactId[];
  canGeneratePhysicalOneToOneScene: boolean;
  /** This remains false even when a visual-scene evidence gate is satisfied. */
  constructionReady: false;
}

const missingFact = (
  id: ThresholdDwellingPhysicalSceneFactId,
  title: string,
  purpose: string,
  requiredProfessionalReviewIds: readonly ThresholdDwellingProfessionalReviewRequirementId[]
): ThresholdDwellingPhysicalSceneFact => ({
  id,
  title,
  purpose,
  requiredProfessionalReviewIds,
  evidenceStatus: 'missing',
  value: null,
  sourceDocumentId: null,
  verifiedBy: null
});

/**
 * Current truth: Rev 0.8 has verified horizontal plan coordinates, while all
 * elevations, assemblies, and opening geometry remain unissued. Keeping those
 * values null prevents an illustrative mass from being promoted into fact.
 */
export const THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE: ThresholdDwellingPhysicalSceneIssuance = {
  schemaVersion: 'workway.physical-scene-issuance.v1',
  id: 'threshold-dwelling-rev-0.8-physical-scene-gate',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  baselineRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  spatialRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision,
  coordinateTruth: 'revised-plan-horizontal-only',
  facts: [
    missingFact(
      'finished-floor-and-site-datum',
      'Finished-floor elevation and site datum',
      'Relate the model to surveyed grade, drainage, thresholds, and real-world elevations.',
      ['licensed-site-survey', 'coordinated-architectural-package']
    ),
    missingFact(
      'exterior-wall-assembly-geometry',
      'Exterior-wall assembly geometry',
      'Define actual wall thicknesses, layers, facade offsets, and weather-protection depth.',
      ['coordinated-architectural-package', 'energy-compliance-package']
    ),
    missingFact(
      'interior-partition-geometry',
      'Interior-partition geometry',
      'Define partition thicknesses, heights, backing, and ceiling relationships.',
      ['coordinated-architectural-package', 'mechanical-electrical-plumbing-design']
    ),
    missingFact(
      'roof-and-ceiling-geometry',
      'Roof and ceiling geometry',
      'Define roof slopes, bearing conditions, ceiling planes, drainage, and depth.',
      ['coordinated-architectural-package', 'structural-and-wind-design', 'energy-compliance-package']
    ),
    missingFact(
      'door-opening-geometry',
      'Door-opening geometry',
      'Define frame and leaf sizes, heights, swings, thresholds, clear widths, and hardware allowances.',
      ['coordinated-architectural-package', 'jurisdictional-determination']
    ),
    missingFact(
      'window-and-glass-opening-geometry',
      'Window and glass-opening geometry',
      'Define sill and head heights, panel sizes and operation, facade support, and glass performance.',
      [
        'coordinated-architectural-package',
        'structural-and-wind-design',
        'energy-compliance-package',
        'jurisdictional-determination'
      ]
    ),
    missingFact(
      'structural-support-and-lateral-geometry',
      'Structural support and lateral geometry',
      'Define columns, beams, foundations, connections, and braced or moment-resisting elements.',
      ['structural-and-wind-design']
    ),
    missingFact(
      'mep-service-coordination-geometry',
      'MEP service-coordination geometry',
      'Define equipment, ducts, piping, electrical zones, penetrations, and service clearances.',
      ['mechanical-electrical-plumbing-design', 'energy-compliance-package']
    ),
    missingFact(
      'exterior-grade-and-threshold-geometry',
      'Exterior grade and threshold geometry',
      'Define grade planes, exterior stairs or ramps, drainage, and the building-envelope transition.',
      ['licensed-site-survey', 'coordinated-architectural-package', 'jurisdictional-determination']
    )
  ],
  constructionReady: false
};

function hasAcceptedTraceableGeometry(fact: ThresholdDwellingPhysicalSceneFact): boolean {
  return (
    fact.evidenceStatus === 'accepted' &&
    fact.value !== null &&
    Boolean(fact.sourceDocumentId?.trim()) &&
    Boolean(fact.verifiedBy?.trim())
  );
}

/**
 * Assess whether a renderer may present a physical 1:1 representation. An
 * eligible result only means the required geometry is traceably issued for
 * visualization; professional and authority determinations remain separate.
 */
export function assessThresholdDwellingPhysicalSceneIssuance(
  issuance: ThresholdDwellingPhysicalSceneIssuance
): ThresholdDwellingPhysicalSceneIssuanceAssessment {
  const unissuedFactIds = issuance.facts
    .filter((fact) => !hasAcceptedTraceableGeometry(fact))
    .map((fact) => fact.id);
  const canGeneratePhysicalOneToOneScene = unissuedFactIds.length === 0;

  return {
    issuanceId: issuance.id,
    physicalSceneStatus: canGeneratePhysicalOneToOneScene
      ? 'eligible-with-professional-review'
      : 'blocked-vertical-geometry-unissued',
    unissuedFactIds,
    canGeneratePhysicalOneToOneScene,
    constructionReady: false
  };
}
