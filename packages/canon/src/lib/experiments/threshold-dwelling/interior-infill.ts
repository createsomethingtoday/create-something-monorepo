import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate,
  type ThresholdDwellingPlanZone
} from './dimensioned-project.js';

/**
 * A revision-ready interior infill. Measurements here are concept targets that
 * make the authored plan usable; they are not fixture clearances, accessibility
 * determinations, finish schedules, or construction instructions.
 */
export interface ThresholdDwellingInteriorInfill {
  schemaVersion: 'workway.interior-infill.v1';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  projectRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  status: 'recommended-concept-resolution';
  serviceRevision: {
    id: 'enlarge-laundry-and-preserve-pantry';
    current: {
      laundry: { widthIn: number; depthIn: number };
      pantry: { widthIn: number; depthIn: number };
    };
    proposed: {
      laundry: { widthIn: number; depthIn: number };
      pantry: { widthIn: number; depthIn: number };
      dividerMoveIn: number;
      preserveCombinedAreaSqFt: true;
    };
    reason: string;
  };
  publicRoom: {
    openRoomWidthIn: number;
    openRoomDepthIn: number;
    functionalBays: readonly [
      { id: 'kitchen'; widthIn: number; depthIn: number },
      { id: 'dining'; widthIn: number; depthIn: number },
      { id: 'living'; widthIn: number; depthIn: number }
    ];
    kitchenConcept: {
      serviceRunDepthIn: number;
      islandWidthIn: number;
      islandDepthIn: number;
      selectedWorkingAisleTargetIn: number;
      selectedFrontClearTargetIn: number;
    };
    circulation: {
      hallDepthIn: number;
      keepHallFurnishingFree: true;
      status: 'concept-target-not-accessibility-determination';
    };
  };
  privateRoomUse: readonly [
    { id: 'daughter-sleep-zone'; widthIn: number; depthIn: number },
    { id: 'primary-sleep-zone'; widthIn: number; depthIn: number },
    { id: 'inlaw-sleep-zone'; widthIn: number; depthIn: number },
    { id: 'inlaw-sitting-zone'; widthIn: number; depthIn: number }
  ];
  materialRoles: readonly [
    { material: 'low-sheen-polished-concrete'; locations: readonly string[]; rule: string },
    { material: 'large-format-porcelain'; locations: readonly string[]; rule: string },
    { material: 'mineral-finish-gypsum'; locations: readonly string[]; rule: string },
    { material: 'durable-casework'; locations: readonly string[]; rule: string },
    { material: 'protected-cedar'; locations: readonly string[]; rule: string }
  ];
  glazingAndLighting: {
    publicGlazing: 'retain-floor-to-ceiling-intent-with-recessed-shade-provisions';
    bedroomGlazing: 'layered-privacy-and-operable-egress-determination-required';
    lighting: 'low-glare-layers-coordinated-with-ceiling-and-structure';
  };
  requiredNextDeterminations: readonly [
    'dimensioned-casework-fixture-and-furniture-plan',
    'door-swings-and-final-clearance-review',
    'wet-room-waterproofing-and-slip-resistance-selection',
    'window-treatment-and-privacy-coordination',
    'lighting-electrical-and-hvac-coordination'
  ];
  constructionReady: false;
}

export interface ThresholdDwellingInteriorInfillAssessment {
  currentLaundryDepthIn: number;
  proposedLaundryDepthIn: number;
  combinedServiceAreaSqFtPreserved: boolean;
  publicRoomBaysFillOpenRoom: boolean;
  hallIsSevenFeetDeep: boolean;
  constructionReady: false;
}

const feet = (value: number): number => value * 12;
const squareFeet = (widthIn: number, depthIn: number): number => (widthIn * depthIn) / 144;

function requiredZone(candidate: ThresholdDwellingDimensionCandidate, id: string): ThresholdDwellingPlanZone {
  const zone = candidate.zones.find((item) => item.id === id);
  if (!zone) throw new Error(`Missing Threshold Dwelling zone: ${id}`);
  return zone;
}

/**
 * Captures the least-invasive interior resolution: relocate a single service
 * divider by two feet, keep all exterior geometry, and turn the open room into
 * legible kitchen/dining/living bays without partitioning the hall.
 */
export const THRESHOLD_DWELLING_INTERIOR_INFILL = {
  schemaVersion: 'workway.interior-infill.v1',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  projectRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  status: 'recommended-concept-resolution',
  serviceRevision: {
    id: 'enlarge-laundry-and-preserve-pantry',
    current: {
      laundry: { widthIn: feet(12), depthIn: feet(4) },
      pantry: { widthIn: feet(12), depthIn: feet(9) }
    },
    proposed: {
      laundry: { widthIn: feet(12), depthIn: feet(6) },
      pantry: { widthIn: feet(12), depthIn: feet(7) },
      dividerMoveIn: feet(2),
      preserveCombinedAreaSqFt: true
    },
    reason:
      'A 12 ft by 4 ft zone is too shallow to treat as a conventional laundry room. Moving the divider two feet creates a 12 ft by 6 ft utility room while retaining the same 156 sq ft combined laundry/pantry area.'
  },
  publicRoom: {
    openRoomWidthIn: feet(43),
    openRoomDepthIn: feet(13),
    functionalBays: [
      { id: 'kitchen', widthIn: feet(15), depthIn: feet(13) },
      { id: 'dining', widthIn: feet(13), depthIn: feet(13) },
      { id: 'living', widthIn: feet(15), depthIn: feet(13) }
    ],
    kitchenConcept: {
      serviceRunDepthIn: 30,
      islandWidthIn: 108,
      islandDepthIn: 36,
      selectedWorkingAisleTargetIn: 42,
      selectedFrontClearTargetIn: 48
    },
    circulation: {
      hallDepthIn: feet(7),
      keepHallFurnishingFree: true,
      status: 'concept-target-not-accessibility-determination'
    }
  },
  privateRoomUse: [
    { id: 'daughter-sleep-zone', widthIn: feet(18), depthIn: feet(14) },
    { id: 'primary-sleep-zone', widthIn: feet(21), depthIn: feet(15) },
    { id: 'inlaw-sleep-zone', widthIn: feet(16), depthIn: feet(22) },
    { id: 'inlaw-sitting-zone', widthIn: feet(10), depthIn: feet(14) }
  ],
  materialRoles: [
    {
      material: 'low-sheen-polished-concrete',
      locations: ['entry', 'hall', 'public room', 'sleeping-room datum'],
      rule: 'Use a low-sheen sealed slab as the continuous durable datum; use removable rugs and textiles for warmth and acoustics rather than adding fragile finish layers.'
    },
    {
      material: 'large-format-porcelain',
      locations: ['baths', 'laundry'],
      rule: 'Use a wet-area floor and wall finish only after waterproofing, slope, transition, slip-resistance, and maintenance requirements are selected.'
    },
    {
      material: 'mineral-finish-gypsum',
      locations: ['bedroom walls', 'bedroom ceilings', 'service walls'],
      rule: 'Keep the quiet neutral field around the structural frame; use a repairable paint/mineral finish instead of decorative wall systems.'
    },
    {
      material: 'durable-casework',
      locations: ['kitchen service run', 'pantry', 'laundry', 'entry storage'],
      rule: 'Use painted or documented veneer casework with easily replaced pulls, drawer hardware, and selected tactile wood touchpoints.'
    },
    {
      material: 'protected-cedar',
      locations: ['one public ceiling plane', 'select tactile millwork'],
      rule: 'Keep cedar limited to sheltered, touchable, maintainable accents; do not turn it into default cabinetry, bedroom ceilings, wet-area finish, or exterior decking.'
    }
  ],
  glazingAndLighting: {
    publicGlazing: 'retain-floor-to-ceiling-intent-with-recessed-shade-provisions',
    bedroomGlazing: 'layered-privacy-and-operable-egress-determination-required',
    lighting: 'low-glare-layers-coordinated-with-ceiling-and-structure'
  },
  requiredNextDeterminations: [
    'dimensioned-casework-fixture-and-furniture-plan',
    'door-swings-and-final-clearance-review',
    'wet-room-waterproofing-and-slip-resistance-selection',
    'window-treatment-and-privacy-coordination',
    'lighting-electrical-and-hvac-coordination'
  ],
  constructionReady: false
} as const satisfies ThresholdDwellingInteriorInfill;

/** Computes the conservation and fit checks that do not require a code engine. */
export function assessThresholdDwellingInteriorInfill(
  candidate: ThresholdDwellingDimensionCandidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  infill: ThresholdDwellingInteriorInfill = THRESHOLD_DWELLING_INTERIOR_INFILL
): ThresholdDwellingInteriorInfillAssessment {
  const laundry = requiredZone(candidate, 'zone-laundry');
  const pantry = requiredZone(candidate, 'zone-pantry');
  const openLiving = requiredZone(candidate, 'zone-open-living');
  const hall = requiredZone(candidate, 'zone-center-hall');
  const currentServiceAreaSqFt = squareFeet(laundry.widthIn, laundry.heightIn) + squareFeet(pantry.widthIn, pantry.heightIn);
  const proposedServiceAreaSqFt =
    squareFeet(infill.serviceRevision.proposed.laundry.widthIn, infill.serviceRevision.proposed.laundry.depthIn) +
    squareFeet(infill.serviceRevision.proposed.pantry.widthIn, infill.serviceRevision.proposed.pantry.depthIn);
  const publicBayWidthIn = infill.publicRoom.functionalBays.reduce((total, bay) => total + bay.widthIn, 0);

  return {
    currentLaundryDepthIn: laundry.heightIn,
    proposedLaundryDepthIn: infill.serviceRevision.proposed.laundry.depthIn,
    combinedServiceAreaSqFtPreserved: currentServiceAreaSqFt === proposedServiceAreaSqFt,
    publicRoomBaysFillOpenRoom:
      publicBayWidthIn === openLiving.widthIn &&
      infill.publicRoom.functionalBays.every((bay) => bay.depthIn === openLiving.heightIn),
    hallIsSevenFeetDeep: hall.heightIn === infill.publicRoom.circulation.hallDepthIn,
    constructionReady: false
  };
}
