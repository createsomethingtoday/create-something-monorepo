import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate
} from './dimensioned-project.js';

/**
 * A schematic resolution for the carport conflict found in the first
 * dimension review. It is deliberately separate from the main dwelling
 * footprint: the existing 10 ft by 27 ft east projection remains useful as a
 * covered entry/service loggia rather than being overloaded as vehicle space.
 */
export interface ThresholdDwellingCarportInfillRecommendation {
  schemaVersion: 'workway.carport-infill.v1';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  projectRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  status: 'recommended-concept-resolution';
  designIntent: string;
  retainedEastProjection: {
    widthIn: number;
    depthIn: number;
    roles: readonly ['covered-entry', 'dog-service', 'weather-protected-arrival'];
  };
  recommendedCarportPavilion: {
    kind: 'single-vehicle-open-companion-pavilion';
    clearBayWidthIn: number;
    clearBayLengthIn: number;
    vehicleApproach: 'parallel-to-the-27-foot-axis';
    internalPartitions: 'not-permitted-within-clear-bay';
    structuralSupport: 'outside-clear-bay-by-qualified-design';
  };
  pedestrianArrival: {
    independentFromVehicleBay: true;
    conceptTargetClearWidthIn: number;
    route: 'carport-to-covered-entry-loggia';
    complianceStatus: 'professional-determination-required';
  };
  revisionOperation: {
    id: 'replace-east-projection-carport-label';
    reclassifyExisting10By7SegmentAs: 'covered-service-canopy';
    add: 'companion-12-by-27-single-vehicle-carport-pavilion';
  };
  requiredNextDeterminations: readonly [
    'surveyed-siting-setbacks-access-and-turning',
    'grading-and-roof-drainage',
    'structural-and-wind-design',
    'electrical-lighting-and-ev-readiness',
    'jurisdictional-covered-parking-and-separation-requirements'
  ];
  constructionReady: false;
}

export interface ThresholdDwellingCarportInfillAssessment {
  projectId: ThresholdDwellingDimensionCandidate['id'];
  existingProjectionMatchesBaseline: boolean;
  companionCarportClearAreaSqFt: number;
  canReplaceAmbiguousCarportLabel: boolean;
  constructionReady: false;
}

const feet = (valueIn: number): number => valueIn / 12;

/**
 * The companion pavilion is a design target, not a construction size. The
 * clear bay excludes columns, braces, gutters, electrical equipment, and any
 * wall/kennel/entry partition so each of those may be resolved without
 * diminishing the parking envelope.
 */
export const THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION = {
  schemaVersion: 'workway.carport-infill.v1',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  projectRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  status: 'recommended-concept-resolution',
  designIntent:
    'Keep the light 10 ft by 27 ft east projection as a covered entry and service loggia. Add an open, parallel companion carport pavilion so a vehicle, dog utility, and pedestrian arrival do not compete for the same narrow segment.',
  retainedEastProjection: {
    widthIn: 120,
    depthIn: 324,
    roles: ['covered-entry', 'dog-service', 'weather-protected-arrival']
  },
  recommendedCarportPavilion: {
    kind: 'single-vehicle-open-companion-pavilion',
    clearBayWidthIn: 144,
    clearBayLengthIn: 324,
    vehicleApproach: 'parallel-to-the-27-foot-axis',
    internalPartitions: 'not-permitted-within-clear-bay',
    structuralSupport: 'outside-clear-bay-by-qualified-design'
  },
  pedestrianArrival: {
    independentFromVehicleBay: true,
    conceptTargetClearWidthIn: 48,
    route: 'carport-to-covered-entry-loggia',
    complianceStatus: 'professional-determination-required'
  },
  revisionOperation: {
    id: 'replace-east-projection-carport-label',
    reclassifyExisting10By7SegmentAs: 'covered-service-canopy',
    add: 'companion-12-by-27-single-vehicle-carport-pavilion'
  },
  requiredNextDeterminations: [
    'surveyed-siting-setbacks-access-and-turning',
    'grading-and-roof-drainage',
    'structural-and-wind-design',
    'electrical-lighting-and-ev-readiness',
    'jurisdictional-covered-parking-and-separation-requirements'
  ],
  constructionReady: false
} as const satisfies ThresholdDwellingCarportInfillRecommendation;

/** Returns the measurable parts of the recommendation without approving construction. */
export function assessThresholdDwellingCarportInfill(
  candidate: ThresholdDwellingDimensionCandidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  recommendation: ThresholdDwellingCarportInfillRecommendation =
    THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION
): ThresholdDwellingCarportInfillAssessment {
  const existingProjection = candidate.overhangs.filter((overhang) => overhang.xIn === candidate.footprint.widthIn);
  const existingProjectionWidthIn = Math.max(...existingProjection.map((overhang) => overhang.widthIn));
  const existingProjectionDepthIn = existingProjection.reduce(
    (total, overhang) => total + overhang.heightIn,
    0
  );
  const carport = recommendation.recommendedCarportPavilion;

  return {
    projectId: candidate.id,
    existingProjectionMatchesBaseline:
      existingProjectionWidthIn === recommendation.retainedEastProjection.widthIn &&
      existingProjectionDepthIn === recommendation.retainedEastProjection.depthIn,
    companionCarportClearAreaSqFt: feet(carport.clearBayWidthIn) * feet(carport.clearBayLengthIn),
    canReplaceAmbiguousCarportLabel:
      carport.internalPartitions === 'not-permitted-within-clear-bay' &&
      recommendation.pedestrianArrival.independentFromVehicleBay,
    constructionReady: false
  };
}
