import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate,
  type ThresholdDwellingPlanZone,
  type ThresholdDwellingRectIn
} from './dimensioned-project.js';
import {
  THRESHOLD_DWELLING_GLAZING_STRATEGY,
  type ThresholdDwellingGlazingStrategy
} from './glazing-strategy.js';
import {
  assessThresholdDwellingProfessionalReview,
  type ThresholdDwellingProfessionalReviewRequirementId
} from './professional-review.js';

/**
 * Deterministic concept checks for the Threshold Dwelling. This keeps an
 * internally coherent plan from being misrepresented as a safe, permitted, or
 * construction-ready building.
 */
export type ThresholdDwellingBuildLogicFindingId =
  | 'zone-coverage-and-overlap'
  | 'circulation-band-continuity'
  | 'east-projection-vehicle-use'
  | 'sleeping-suite-opening-intent'
  | 'mep-and-resilience-equipment-siting'
  | 'glazing-performance-and-structure'
  | 'professional-evidence-gates';

export type ThresholdDwellingBuildLogicFindingStatus =
  | 'pass'
  | 'owner-decision-required'
  | 'professional-determination-required';

export interface ThresholdDwellingBuildLogicFinding {
  id: ThresholdDwellingBuildLogicFindingId;
  status: ThresholdDwellingBuildLogicFindingStatus;
  severity: 'information' | 'high' | 'critical';
  title: string;
  evidence: string;
  requiredNextStep: string;
}

export interface ThresholdDwellingBuildLogicMetrics {
  footprintAreaSqFt: number;
  classifiedAreaSqFt: number;
  unclassifiedAreaSqFt: number;
  overlappingZonePairIds: readonly string[];
  continuousCirculationBandDepthIn: number;
  eastProjectionEnvelope: {
    widthIn: number;
    depthIn: number;
  };
  carportLabeledSegment: {
    widthIn: number;
    depthIn: number;
    areaSqFt: number;
  };
  publicFacade: {
    openingWidthIn: number;
    facadeWidthIn: number;
    linearOpeningRatio: number;
  };
}

export interface ThresholdDwellingBuildLogicAssessment {
  schemaVersion: 'workway.design-logic-review.v1';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  projectRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  status: 'concept-logical-with-gates';
  purpose: 'concept-program-and-geometry-review';
  metrics: ThresholdDwellingBuildLogicMetrics;
  findings: readonly ThresholdDwellingBuildLogicFinding[];
  ownerDecisionRequired: true;
  ownerDecision: {
    id: 'east-projection-vehicle-use';
    choices: readonly [
      'reclassify-10-by-7-segment-as-non-vehicle-canopy',
      'select-a-separate-or-expanded-covered-parking-footprint'
    ];
  };
  missingProfessionalRequirementIds: readonly ThresholdDwellingProfessionalReviewRequirementId[];
  canFreezeArchitecturalPlan: false;
  constructionReady: false;
}

const squareFeet = (rect: Pick<ThresholdDwellingRectIn, 'widthIn' | 'heightIn'>): number =>
  (rect.widthIn * rect.heightIn) / 144;

function overlaps(first: ThresholdDwellingPlanZone, second: ThresholdDwellingPlanZone): boolean {
  return (
    first.xIn < second.xIn + second.widthIn &&
    first.xIn + first.widthIn > second.xIn &&
    first.yIn < second.yIn + second.heightIn &&
    first.yIn + first.heightIn > second.yIn
  );
}

function zonePairsWithOverlap(candidate: ThresholdDwellingDimensionCandidate): string[] {
  const pairs: string[] = [];
  for (let index = 0; index < candidate.zones.length; index += 1) {
    for (let comparisonIndex = index + 1; comparisonIndex < candidate.zones.length; comparisonIndex += 1) {
      const first = candidate.zones[index];
      const second = candidate.zones[comparisonIndex];
      if (overlaps(first, second)) pairs.push(`${first.id}:${second.id}`);
    }
  }
  return pairs;
}

function requiredZone(candidate: ThresholdDwellingDimensionCandidate, id: string): ThresholdDwellingPlanZone {
  const planZone = candidate.zones.find((zone) => zone.id === id);
  if (!planZone) throw new Error(`Missing Threshold Dwelling plan zone: ${id}`);
  return planZone;
}

function requiredOverhang(
  candidate: ThresholdDwellingDimensionCandidate,
  id: string
): ThresholdDwellingRectIn & { id: string; label: string } {
  const overhang = candidate.overhangs.find((item) => item.id === id);
  if (!overhang) throw new Error(`Missing Threshold Dwelling projection: ${id}`);
  return overhang;
}

function hasNamedEquipmentReserve(candidate: ThresholdDwellingDimensionCandidate): boolean {
  return candidate.zones.some((zone) =>
    /mechanical|electrical|battery|inverter|equipment/i.test(zone.id)
  );
}

/**
 * Returns only the checks that can be proven from the authored plan plus the
 * existing WorkWay review registers. It does not implement a building code,
 * determine a parking standard, or substitute for professional design.
 */
export function assessThresholdDwellingBuildLogic(
  candidate: ThresholdDwellingDimensionCandidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  glazingStrategy: ThresholdDwellingGlazingStrategy = THRESHOLD_DWELLING_GLAZING_STRATEGY
): ThresholdDwellingBuildLogicAssessment {
  const footprintAreaSqFt = squareFeet({
    widthIn: candidate.footprint.widthIn,
    heightIn: candidate.footprint.depthIn
  });
  const classifiedAreaSqFt = candidate.zones.reduce((total, zone) => total + squareFeet(zone), 0);
  const overlappingZonePairIds = zonePairsWithOverlap(candidate);
  const circulationZones = [
    requiredZone(candidate, 'zone-west-hall'),
    requiredZone(candidate, 'zone-center-hall'),
    requiredZone(candidate, 'zone-entry-hall')
  ];
  const circulationBandDepthIn = circulationZones[0].heightIn;
  const hasContinuousCirculationBand =
    circulationZones.every((zone) => zone.yIn === circulationZones[0].yIn) &&
    circulationZones.every((zone) => zone.heightIn === circulationBandDepthIn) &&
    circulationZones[0].xIn + circulationZones[0].widthIn === circulationZones[1].xIn &&
    circulationZones[1].xIn + circulationZones[1].widthIn === circulationZones[2].xIn;
  const carport = requiredOverhang(candidate, 'overhang-carport');
  const publicFacade = glazingStrategy.facadeStrategies.find(
    (facade) => facade.planDatumFacade === 'north'
  );
  if (!publicFacade) throw new Error('Missing Threshold Dwelling public glazing facade strategy.');
  const openLiving = requiredZone(candidate, 'zone-open-living');
  const professionalReview = assessThresholdDwellingProfessionalReview(candidate);
  const sleepingPanels = glazingStrategy.panelIntents.filter(
    (panel) => panel.role === 'sleeping-suite'
  );
  const hasSleepingOpeningIntent =
    sleepingPanels.length === 3 &&
    sleepingPanels.every((panel) => panel.egress === 'professional-determination-required');
  const projectionEnvelope = {
    widthIn: Math.max(...candidate.overhangs.map((overhang) => overhang.widthIn)),
    depthIn: candidate.overhangs.reduce((total, overhang) => total + overhang.heightIn, 0)
  };

  return {
    schemaVersion: 'workway.design-logic-review.v1',
    projectId: candidate.id,
    projectRevision: candidate.source.revision,
    status: 'concept-logical-with-gates',
    purpose: 'concept-program-and-geometry-review',
    metrics: {
      footprintAreaSqFt,
      classifiedAreaSqFt,
      unclassifiedAreaSqFt: footprintAreaSqFt - classifiedAreaSqFt,
      overlappingZonePairIds,
      continuousCirculationBandDepthIn: circulationBandDepthIn,
      eastProjectionEnvelope: projectionEnvelope,
      carportLabeledSegment: {
        widthIn: carport.widthIn,
        depthIn: carport.heightIn,
        areaSqFt: squareFeet(carport)
      },
      publicFacade: {
        openingWidthIn: publicFacade.planOpeningWidthIn,
        facadeWidthIn: openLiving.widthIn,
        linearOpeningRatio: publicFacade.planOpeningWidthIn / openLiving.widthIn
      }
    },
    findings: [
      {
        id: 'zone-coverage-and-overlap',
        status:
          footprintAreaSqFt === classifiedAreaSqFt && overlappingZonePairIds.length === 0
            ? 'pass'
            : 'professional-determination-required',
        severity:
          footprintAreaSqFt === classifiedAreaSqFt && overlappingZonePairIds.length === 0
            ? 'information'
            : 'critical',
        title: 'Main 65 ft by 42 ft block is a closed conceptual program',
        evidence: `The ${footprintAreaSqFt} sq ft footprint is classified by the authored zones with ${overlappingZonePairIds.length} overlapping zone pairs and ${footprintAreaSqFt - classifiedAreaSqFt} sq ft unclassified.`,
        requiredNextStep:
          'Preserve this coordinate baseline, then let the coordinated architectural package establish actual wall thicknesses, fixtures, door swings, clearances, and assemblies.'
      },
      {
        id: 'circulation-band-continuity',
        status: hasContinuousCirculationBand ? 'pass' : 'professional-determination-required',
        severity: hasContinuousCirculationBand ? 'information' : 'high',
        title: 'Arrival and hall band is continuous at concept scale',
        evidence: hasContinuousCirculationBand
          ? `West hall, center hall, and entry hall form one ${circulationBandDepthIn / 12} ft-deep band across the main block.`
          : 'The authored hall zones no longer form a continuous shared-depth circulation band.',
        requiredNextStep:
          'Do not convert the conceptual band into an accessibility or egress determination until doors, swings, fixtures, furnishings, and the adopted requirements are coordinated.'
      },
      {
        id: 'east-projection-vehicle-use',
        status: 'owner-decision-required',
        severity: 'critical',
        title: 'The carport label is not a resolved vehicle-use design',
        evidence: `The approved east projection is ${projectionEnvelope.widthIn / 12} ft by ${projectionEnvelope.depthIn / 12} ft overall, but its segment labeled Carport is only ${carport.widthIn / 12} ft by ${carport.heightIn / 12} ft (${squareFeet(carport)} sq ft). No vehicle envelope, maneuvering path, parking clearance, or site access has been selected.`,
        requiredNextStep:
          'Owner decision required: reclassify the 10 ft by 7 ft segment as a non-vehicle service canopy, or select a separate or expanded covered-parking footprint and then validate it against the surveyed site and jurisdictional path.'
      },
      {
        id: 'sleeping-suite-opening-intent',
        status: 'professional-determination-required',
        severity: hasSleepingOpeningIntent ? 'high' : 'critical',
        title: 'Sleeping suites have exterior-window intent, not verified egress',
        evidence: hasSleepingOpeningIntent
          ? 'Each sleeping suite is represented by an exterior opening intent, but no sill, head, net clear opening, operation, window-well, or adopted-code determination is present.'
          : 'The current glazing strategy does not preserve a verifiable exterior-opening intent for every sleeping suite.',
        requiredNextStep:
          'Require a coordinated window schedule and a qualified determination of emergency escape/rescue or any approved alternate provision.'
      },
      {
        id: 'mep-and-resilience-equipment-siting',
        status: 'professional-determination-required',
        severity: 'high',
        title: 'All-electric resilience intent lacks a designated equipment reserve',
        evidence: hasNamedEquipmentReserve(candidate)
          ? 'A named mechanical, electrical, or resilience equipment reserve is present, but its capacity and clearances remain unverified.'
          : 'The all-electric, solar/battery-ready decision has no explicitly designated mechanical, electrical, battery, inverter, or service-equipment location in the authored plan.',
        requiredNextStep:
          'Before an architectural freeze, coordinate equipment siting, service capacity, working clearances, conduit routes, ventilation, condensate, plumbing, and exterior utility relationships through the MEP package.'
      },
      {
        id: 'glazing-performance-and-structure',
        status: 'professional-determination-required',
        severity: 'high',
        title: 'The public glazing strategy is viable as intent but not yet a facade system',
        evidence: `${publicFacade.planOpeningWidthIn / 12} ft of plan openings occupy ${(
          (publicFacade.planOpeningWidthIn / openLiving.widthIn) *
          100
        ).toFixed(1)}% of the ${openLiving.widthIn / 12} ft public facade. Actual compass orientation remains unmapped.`,
        requiredNextStep:
          'Tie the plan to the surveyed site, then coordinate solar/shade response, energy/HVAC loads, engineered support and lateral design, safety glazing, and tested water-management details.'
      },
      {
        id: 'professional-evidence-gates',
        status: 'professional-determination-required',
        severity: 'critical',
        title: 'No required professional evidence has been accepted',
        evidence: `${professionalReview.missingRequirementIds.length} of ${professionalReview.requirements.length} required WorkWay evidence gates are currently unaccepted.`,
        requiredNextStep:
          'Collect accepted, revision-specific site survey, architectural, structural/wind, MEP, energy, and jurisdictional artifacts before requesting a human construction-readiness determination.'
      }
    ],
    ownerDecisionRequired: true,
    ownerDecision: {
      id: 'east-projection-vehicle-use',
      choices: [
        'reclassify-10-by-7-segment-as-non-vehicle-canopy',
        'select-a-separate-or-expanded-covered-parking-footprint'
      ]
    },
    missingProfessionalRequirementIds: professionalReview.missingRequirementIds,
    canFreezeArchitecturalPlan: false,
    constructionReady: false
  };
}
