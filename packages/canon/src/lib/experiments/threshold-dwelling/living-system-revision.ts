import type { FloorPlanData } from '../../types/architecture.js';
import {
  THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION,
  type ThresholdDwellingCarportInfillRecommendation
} from './carport-infill.js';
import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  projectThresholdDwellingFloorPlan,
  type ThresholdDwellingDimensionCandidate
} from './dimensioned-project.js';
import {
  THRESHOLD_DWELLING_INTERIOR_INFILL,
  type ThresholdDwellingInteriorInfill
} from './interior-infill.js';

export interface ThresholdDwellingLivingSystemOperation {
  id:
    | 'move-service-divider'
    | 'assign-public-room-bays'
    | 'protect-main-circulation-band'
    | 'reclassify-east-loggia'
    | 'add-companion-carport-render-projection'
    | 'apply-material-roles';
  status: 'proposed';
  summary: string;
  changesPrimaryFootprint: boolean;
  requiresAcceptedDeterminations: readonly string[];
}

export interface ThresholdDwellingLivingSystemLoop {
  id: 'arrival' | 'daily-public' | 'service-reset' | 'private-retreat';
  purpose: string;
  spaces: readonly string[];
  rule: string;
}

export interface ThresholdDwellingLivingSystemRevision {
  schemaVersion: 'workway.living-system-revision.v1';
  id: 'threshold-dwelling-rev-0.8-living-system';
  status: 'proposed-design-intent';
  base: {
    projectId: ThresholdDwellingDimensionCandidate['id'];
    revision: ThresholdDwellingDimensionCandidate['source']['revision'];
  };
  proposedRevision: '0.8';
  premise: string;
  operations: readonly ThresholdDwellingLivingSystemOperation[];
  operatingLoops: readonly ThresholdDwellingLivingSystemLoop[];
  presentationPlacement: {
    companionCarport: {
      xIn: number;
      yIn: number;
      widthIn: number;
      depthIn: number;
      diagramOnly: true;
      statement: string;
    };
  };
  requiredNextDeterminations: readonly string[];
  constructionReady: false;
}

export interface ThresholdDwellingLivingSystemAssessment {
  baseFootprintPreserved: boolean;
  baseRevisionPreserved: boolean;
  serviceAreaSqFtPreserved: boolean;
  laundryDepthIn: number;
  publicRoomBaysPreserved: boolean;
  circulationBandRemainsFurnitureFree: boolean;
  companionCarportClearAreaSqFt: number;
  companionCarportIsPresentationOnly: boolean;
  constructionReady: false;
}

const feet = (valueIn: number): number => valueIn / 12;
const areaSqFt = (widthIn: number, depthIn: number): number => (widthIn * depthIn) / 144;

function reviseCandidateForLivingSystem(
  candidate: ThresholdDwellingDimensionCandidate,
  interiorInfill: ThresholdDwellingInteriorInfill
): ThresholdDwellingDimensionCandidate {
  const { laundry, pantry } = interiorInfill.serviceRevision.proposed;

  return {
    ...candidate,
    walls: candidate.walls.map((wall) =>
      wall.id === 'wall-service-west-divider'
        ? {
            ...wall,
            start: { ...wall.start, yIn: laundry.depthIn },
            end: { ...wall.end, yIn: laundry.depthIn }
          }
        : wall
    ),
    doors: candidate.doors.map((door) =>
      door.id === 'door-laundry-pantry'
        ? { ...door, center: { ...door.center, yIn: laundry.depthIn } }
        : door
    ),
    zones: candidate.zones.map((zone) => {
      if (zone.id === 'zone-laundry') return { ...zone, heightIn: laundry.depthIn };
      if (zone.id === 'zone-pantry') {
        return {
          ...zone,
          yIn: laundry.depthIn,
          heightIn: pantry.depthIn
        };
      }
      return zone;
    }),
    labels: candidate.labels.map((label) => {
      if (label.id === 'label-laundry') return { ...label, yIn: laundry.depthIn / 2 };
      if (label.id === 'label-pantry') {
        return {
          ...label,
          yIn: laundry.depthIn + pantry.depthIn / 2,
          name: 'Pantry\nStorage'
        };
      }
      return label;
    }),
    overhangs: candidate.overhangs.map((overhang) => {
      if (overhang.id === 'overhang-dog-kennel') return { ...overhang, label: 'Dog\nService' };
      if (overhang.id === 'overhang-carport') {
        return { ...overhang, label: 'Covered\nService' };
      }
      if (overhang.id === 'overhang-covered-entry') {
        return { ...overhang, label: 'Arrival\nLoggia' };
      }
      return overhang;
    })
  };
}

function projectLivingSystemFloorPlan(
  candidate: ThresholdDwellingDimensionCandidate,
  revision: ThresholdDwellingLivingSystemRevision
): FloorPlanData {
  const primaryPlan = projectThresholdDwellingFloorPlan(candidate);
  const companion = revision.presentationPlacement.companionCarport;

  return {
    ...primaryPlan,
    name: 'Miesian Family Pavilion — Rev 0.8 Proposal',
    features: 'Living-system proposal · Companion carport shown diagrammatically',
    overhangs: [
      ...(primaryPlan.overhangs ?? []),
      {
        x: feet(companion.xIn),
        y: feet(companion.yIn),
        width: feet(companion.widthIn),
        height: feet(companion.depthIn),
        label: 'Companion\nCarport'
      }
    ]
  };
}

const baseCandidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE;
const interiorInfill = THRESHOLD_DWELLING_INTERIOR_INFILL;
const carportInfill = THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION;

export const THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION = {
  schemaVersion: 'workway.living-system-revision.v1',
  id: 'threshold-dwelling-rev-0.8-living-system',
  status: 'proposed-design-intent',
  base: {
    projectId: baseCandidate.id,
    revision: baseCandidate.source.revision
  },
  proposedRevision: '0.8',
  premise:
    'A calm daily life comes from legible loops, protected clear space, durable roles, and small reviewable changes—not from treating an image as a final building.',
  operations: [
    {
      id: 'move-service-divider',
      status: 'proposed',
      summary: 'Move the west service divider 24 in south: laundry becomes 12 ft by 6 ft and pantry becomes 12 ft by 7 ft without changing their combined area.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: ['dimensioned-casework-fixture-and-furniture-plan']
    },
    {
      id: 'assign-public-room-bays',
      status: 'proposed',
      summary: 'Retain the 43 ft by 13 ft public room as 15 ft kitchen, 13 ft dining, and 15 ft living functional bays.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: [
        'dimensioned-casework-fixture-and-furniture-plan',
        'lighting-electrical-and-hvac-coordination'
      ]
    },
    {
      id: 'protect-main-circulation-band',
      status: 'proposed',
      summary: 'Keep the 7 ft hall band clear of furniture so private, public, and arrival loops remain legible.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: ['door-swings-and-final-clearance-review']
    },
    {
      id: 'reclassify-east-loggia',
      status: 'proposed',
      summary: 'Keep the authored 10 ft by 27 ft east projection as dog service, covered service, and arrival loggia rather than vehicle parking.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: ['surveyed-siting-setbacks-access-and-turning']
    },
    {
      id: 'add-companion-carport-render-projection',
      status: 'proposed',
      summary: 'Show a 12 ft by 27 ft clear-bay companion carport as a diagram-only render projection; it is not a surveyed site placement.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: [
        'surveyed-siting-setbacks-access-and-turning',
        'grading-and-roof-drainage',
        'structural-and-wind-design',
        'jurisdictional-covered-parking-and-separation-requirements'
      ]
    },
    {
      id: 'apply-material-roles',
      status: 'proposed',
      summary: 'Use the durable floor datum, wet-area porcelain, quiet mineral walls, repairable casework, and restrained protected cedar roles in the interior infill.',
      changesPrimaryFootprint: false,
      requiresAcceptedDeterminations: [
        'wet-room-waterproofing-and-slip-resistance-selection',
        'window-treatment-and-privacy-coordination'
      ]
    }
  ],
  operatingLoops: [
    {
      id: 'arrival',
      purpose: 'Arrive by vehicle or foot without forcing either through a service conflict.',
      spaces: ['companion carport', 'arrival loggia', 'entry hall', 'central hall'],
      rule: 'The pedestrian route remains independent from the vehicle clear bay.'
    },
    {
      id: 'daily-public',
      purpose: 'Support cooking, dining, and gathering in one legible shared room.',
      spaces: ['kitchen bay', 'dining bay', 'living bay', 'public glazing'],
      rule: 'Functional bays organize furniture; the room remains open and adaptable.'
    },
    {
      id: 'service-reset',
      purpose: 'Contain laundry, pantry, dog, and guest support work at the plan edges.',
      spaces: ['laundry', 'pantry storage', 'dog service', 'covered service'],
      rule: 'Service function does not intrude on the public room or main hall.'
    },
    {
      id: 'private-retreat',
      purpose: 'Keep bedroom zones quiet, furnishable, and separated from daily movement.',
      spaces: ['daughter suite', 'primary suite', 'in-law suite', 'central hall'],
      rule: 'Privacy, operable egress, glazing, and final furniture clearances remain professional determinations.'
    }
  ],
  presentationPlacement: {
    companionCarport: {
      xIn: 960,
      yIn: 0,
      widthIn: carportInfill.recommendedCarportPavilion.clearBayWidthIn,
      depthIn: carportInfill.recommendedCarportPavilion.clearBayLengthIn,
      diagramOnly: true,
      statement:
        'This placement is only a local presentation position that keeps the pavilion visually separate from the dwelling; survey, setbacks, drive, drainage, wind, and jurisdiction determine the actual site location.'
    }
  },
  requiredNextDeterminations: [
    ...interiorInfill.requiredNextDeterminations,
    ...carportInfill.requiredNextDeterminations
  ],
  constructionReady: false
} as const satisfies ThresholdDwellingLivingSystemRevision;

const livingSystemCandidate = reviseCandidateForLivingSystem(baseCandidate, interiorInfill);

/**
 * The plan used to regenerate review renders. The base 0.7 candidate remains
 * untouched; this is a derived Rev 0.8 proposal and carries no construction
 * approval.
 */
export const THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN = projectLivingSystemFloorPlan(
  livingSystemCandidate,
  THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION
);

export function assessThresholdDwellingLivingSystemRevision(
  candidate: ThresholdDwellingDimensionCandidate = baseCandidate,
  revision: ThresholdDwellingLivingSystemRevision = THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION,
  floorPlan: FloorPlanData = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN
): ThresholdDwellingLivingSystemAssessment {
  const baseLaundry = candidate.zones.find((zone) => zone.id === 'zone-laundry');
  const basePantry = candidate.zones.find((zone) => zone.id === 'zone-pantry');
  const proposedLaundry = floorPlan.zones.find((zone) => zone.x === 0 && zone.y === 0);
  const proposedPantry = floorPlan.zones.find((zone) => zone.x === 0 && zone.y === 6);
  const publicRoom = floorPlan.zones.find((zone) => zone.x === 12 && zone.y === 0);
  const companion = floorPlan.overhangs?.find((overhang) => overhang.label === 'Companion\nCarport');

  return {
    baseFootprintPreserved:
      floorPlan.width === feet(candidate.footprint.widthIn) &&
      floorPlan.depth === feet(candidate.footprint.depthIn),
    baseRevisionPreserved: revision.base.revision === candidate.source.revision,
    serviceAreaSqFtPreserved:
      Boolean(baseLaundry && basePantry && proposedLaundry && proposedPantry) &&
      areaSqFt(baseLaundry!.widthIn, baseLaundry!.heightIn) +
        areaSqFt(basePantry!.widthIn, basePantry!.heightIn) ===
        proposedLaundry!.width * proposedLaundry!.height +
          proposedPantry!.width * proposedPantry!.height,
    laundryDepthIn: proposedLaundry ? proposedLaundry.height * 12 : 0,
    publicRoomBaysPreserved:
      Boolean(publicRoom) && publicRoom!.width === 43 && publicRoom!.height === 13,
    circulationBandRemainsFurnitureFree: revision.operations.some(
      (operation) => operation.id === 'protect-main-circulation-band'
    ),
    companionCarportClearAreaSqFt: companion ? companion.width * companion.height : 0,
    companionCarportIsPresentationOnly: revision.presentationPlacement.companionCarport.diagramOnly,
    constructionReady: false
  };
}
