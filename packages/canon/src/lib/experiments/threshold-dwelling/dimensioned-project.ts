import type { FloorPlanData } from '../../types/architecture.js';

/**
 * A machine-readable, inch-precise snapshot of the Threshold Dwelling concept.
 *
 * This is deliberately a design-intent candidate, not a survey, permit, code,
 * or construction document. The validation surface below preserves known
 * conflicts instead of silently resolving them into false precision.
 */

export type ThresholdDwellingDimensionStatus = 'candidate-design-intent';
export type ThresholdDwellingOrientation = 'horizontal' | 'vertical';

export interface ThresholdDwellingPointIn {
  xIn: number;
  yIn: number;
}

export interface ThresholdDwellingRectIn extends ThresholdDwellingPointIn {
  widthIn: number;
  heightIn: number;
}

export interface ThresholdDwellingWallRun {
  id: string;
  start: ThresholdDwellingPointIn;
  end: ThresholdDwellingPointIn;
  exterior?: boolean;
}

export interface ThresholdDwellingPlanOpening {
  id: string;
  wallId: string;
  kind: 'door' | 'window';
  center: ThresholdDwellingPointIn;
  orientation: ThresholdDwellingOrientation;
  planOpeningWidthIn: number;
  /** Details such as sill, head, operation and manufacturer clear opening remain unsupplied. */
  verification: 'plan-only';
}

export interface ThresholdDwellingPlanZone extends ThresholdDwellingRectIn {
  id: string;
  type: 'service' | 'public' | 'private' | 'open';
}

export interface ThresholdDwellingRoomLabel extends ThresholdDwellingPointIn {
  id: string;
  name: string;
  small?: boolean;
}

export interface ThresholdDwellingDimensionBlocker {
  id: string;
  severity: 'critical' | 'high';
  title: string;
  evidence: string;
  requiredResolution: string;
}

export interface ThresholdDwellingDimensionCandidate {
  id: 'threshold-dwelling';
  status: ThresholdDwellingDimensionStatus;
  coordinateSystem: {
    unit: 'in';
    origin: 'northwest exterior plan datum';
    xAxis: 'east';
    yAxis: 'south';
  };
  source: {
    primary: 'packages/io/src/routes/papers/threshold-dwelling/+page.svelte';
    revision: '0.3';
    statement: string;
  };
  footprint: {
    widthIn: number;
    depthIn: number;
    areaSqFt: number;
    perimeterFt: number;
  };
  walls: ThresholdDwellingWallRun[];
  doors: ThresholdDwellingPlanOpening[];
  windows: ThresholdDwellingPlanOpening[];
  zones: ThresholdDwellingPlanZone[];
  labels: ThresholdDwellingRoomLabel[];
  columns: Array<ThresholdDwellingPointIn & { id: string }>;
  overhangs: Array<ThresholdDwellingRectIn & { id: string; label: string }>;
  blockers: ThresholdDwellingDimensionBlocker[];
}

export interface ThresholdDwellingDimensionValidation {
  canFinalize: false;
  nonIntegralCoordinateIds: string[];
  classifiedAreaSqFt: number;
  unclassifiedEnclosedAreaSqFt: number;
  blockers: ThresholdDwellingDimensionBlocker[];
}

const inches = (feet: number): number => feet * 12;
const feet = (valueIn: number): number => valueIn / 12;
const point = (xFt: number, yFt: number): ThresholdDwellingPointIn => ({
  xIn: inches(xFt),
  yIn: inches(yFt)
});
const rect = (xFt: number, yFt: number, widthFt: number, heightFt: number): ThresholdDwellingRectIn => ({
  ...point(xFt, yFt),
  widthIn: inches(widthFt),
  heightIn: inches(heightFt)
});

const wall = (
  id: string,
  x1Ft: number,
  y1Ft: number,
  x2Ft: number,
  y2Ft: number,
  exterior = false
): ThresholdDwellingWallRun => ({ id, start: point(x1Ft, y1Ft), end: point(x2Ft, y2Ft), exterior });

const opening = (
  id: string,
  wallId: string,
  kind: 'door' | 'window',
  xFt: number,
  yFt: number,
  widthFt: number,
  orientation: ThresholdDwellingOrientation
): ThresholdDwellingPlanOpening => ({
  id,
  wallId,
  kind,
  center: point(xFt, yFt),
  orientation,
  planOpeningWidthIn: inches(widthFt),
  verification: 'plan-only'
});

const zone = (
  id: string,
  xFt: number,
  yFt: number,
  widthFt: number,
  heightFt: number,
  type: ThresholdDwellingPlanZone['type']
): ThresholdDwellingPlanZone => ({ id, ...rect(xFt, yFt, widthFt, heightFt), type });

const label = (id: string, xFt: number, yFt: number, name: string, small = false): ThresholdDwellingRoomLabel => ({
  id,
  ...point(xFt, yFt),
  name,
  small
});

export const THRESHOLD_DWELLING_DIMENSION_CANDIDATE: ThresholdDwellingDimensionCandidate = {
  id: 'threshold-dwelling',
  status: 'candidate-design-intent',
  coordinateSystem: {
    unit: 'in',
    origin: 'northwest exterior plan datum',
    xAxis: 'east',
    yAxis: 'south'
  },
  source: {
    primary: 'packages/io/src/routes/papers/threshold-dwelling/+page.svelte',
    revision: '0.3',
    statement:
      'Exact only within the authored concept coordinate system. It is not a survey, permit, code-compliance, structural, MEP, or construction source.'
  },
  footprint: {
    widthIn: 780,
    depthIn: 504,
    areaSqFt: 2730,
    perimeterFt: 214
  },
  walls: [
    wall('wall-exterior-north', 0, 0, 65, 0, true),
    wall('wall-exterior-east', 65, 0, 65, 42, true),
    wall('wall-exterior-south', 65, 42, 0, 42, true),
    wall('wall-exterior-west', 0, 42, 0, 0, true),
    wall('wall-daughter-suite-north', 0, 20, 18, 20),
    wall('wall-daughter-bath-west', 10, 20, 10, 28),
    wall('wall-daughter-bath-south', 10, 28, 18, 28),
    wall('wall-primary-west', 18, 20, 18, 42),
    wall('wall-primary-suite-north', 18, 20, 39, 20),
    wall('wall-primary-suite-service', 18, 27, 39, 27),
    wall('wall-primary-bath-west', 26, 20, 26, 27),
    wall('wall-inlaw-west', 39, 20, 39, 42),
    wall('wall-inlaw-suite-north', 39, 20, 65, 20),
    wall('wall-inlaw-bath-west', 55, 20, 55, 28),
    wall('wall-inlaw-bath-south', 55, 28, 65, 28),
    wall('wall-service-west-divider', 0, 4, 12, 4),
    wall('wall-service-west-hall', 0, 13, 12, 13),
    wall('wall-open-west', 12, 0, 12, 13),
    wall('wall-service-east-vertical', 55, 0, 55, 13),
    wall('wall-service-east-divider', 55, 6, 65, 6),
    wall('wall-service-east-hall', 55, 13, 65, 13)
  ],
  doors: [
    opening('door-laundry-pantry', 'wall-service-west-divider', 'door', 9, 4, 3, 'horizontal'),
    opening('door-pantry-hall', 'wall-service-west-hall', 'door', 6, 13, 3, 'horizontal'),
    opening('door-daughter-suite', 'wall-daughter-suite-north', 'door', 5, 20, 3, 'horizontal'),
    opening('door-daughter-bath', 'wall-daughter-bath-west', 'door', 10, 25, 3, 'vertical'),
    opening('door-primary-closet', 'wall-primary-suite-service', 'door', 22, 27, 3, 'horizontal'),
    opening('door-primary-suite', 'wall-primary-suite-north', 'door', 22, 20, 3, 'horizontal'),
    opening('door-primary-bath', 'wall-primary-suite-service', 'door', 32, 27, 3, 'horizontal'),
    opening('door-inlaw-suite', 'wall-inlaw-suite-north', 'door', 47, 20, 3, 'horizontal'),
    opening('door-inlaw-bath', 'wall-inlaw-bath-west', 'door', 55, 24, 3, 'vertical'),
    opening('door-dog-utility', 'wall-service-east-divider', 'door', 58, 6, 3, 'horizontal'),
    opening('door-guest-bath', 'wall-service-east-vertical', 'door', 55, 10, 3, 'vertical'),
    opening('door-kennel-utility', 'wall-exterior-east', 'door', 65, 3, 3, 'vertical'),
    opening('door-main-entry', 'wall-exterior-east', 'door', 65, 16, 3, 'vertical')
  ],
  windows: [
    opening('window-west-hall', 'wall-exterior-west', 'window', 0, 16.5, 4, 'vertical'),
    opening('window-daughter-suite', 'wall-daughter-suite-north', 'window', 12, 20, 6, 'horizontal'),
    opening('window-primary-bedroom', 'wall-primary-suite-north', 'window', 28, 20, 8, 'horizontal'),
    opening('window-primary-bath', 'wall-primary-suite-north', 'window', 38, 20, 5, 'horizontal'),
    opening('window-inlaw-suite', 'wall-inlaw-suite-north', 'window', 54, 20, 6, 'horizontal'),
    opening('window-kitchen', 'wall-exterior-south', 'window', 20, 42, 8, 'horizontal'),
    opening('window-living-dining', 'wall-exterior-south', 'window', 35, 42, 10, 'horizontal'),
    opening('window-open-zone', 'wall-exterior-south', 'window', 50, 42, 5, 'horizontal'),
    opening('window-living-east', 'wall-exterior-east', 'window', 65, 30, 6, 'vertical')
  ],
  zones: [
    zone('zone-laundry', 0, 0, 12, 4, 'service'),
    zone('zone-pantry', 0, 4, 12, 9, 'service'),
    zone('zone-dog-utility', 55, 0, 10, 6, 'service'),
    zone('zone-guest-bath', 55, 6, 10, 7, 'public'),
    zone('zone-west-hall', 0, 13, 12, 7, 'public'),
    zone('zone-center-hall', 12, 13, 43, 7, 'public'),
    zone('zone-daughter-suite', 0, 20, 18, 22, 'private'),
    zone('zone-primary-suite', 18, 20, 21, 22, 'private'),
    zone('zone-inlaw-suite', 39, 20, 26, 22, 'private'),
    zone('zone-open-living', 12, 0, 43, 13, 'open')
  ],
  labels: [
    label('label-daughter-bedroom', 9, 35, "Daughter's\nBedroom"),
    label('label-daughter-bath', 14, 24, 'Bath', true),
    label('label-primary-bedroom', 28.5, 35, 'Primary\nBedroom'),
    label('label-primary-closet', 22, 23.5, 'Closet', true),
    label('label-primary-bath', 32.5, 23.5, 'Bath', true),
    label('label-inlaw-suite', 47, 32, 'In-Law\nSuite'),
    label('label-inlaw-bath', 60, 24, 'Bath', true),
    label('label-inlaw-sitting', 60, 35, 'Sitting', true),
    label('label-laundry', 6, 2, 'Laundry', true),
    label('label-pantry', 6, 8.5, 'Pantry\nSit-in'),
    label('label-dog-utility', 60, 3, 'Dog\nUtility', true),
    label('label-guest-bath', 60, 9.5, 'Guest\nBath', true),
    label('label-kitchen', 20, 6.5, 'Kitchen'),
    label('label-dining', 33, 6.5, 'Dining'),
    label('label-living', 46, 6.5, 'Living')
  ],
  columns: [
    { id: 'column-nw', ...point(10, 3) },
    { id: 'column-north-center', ...point(32.5, 3) },
    { id: 'column-ne', ...point(55, 3) },
    { id: 'column-sw', ...point(10, 39) },
    { id: 'column-south-center', ...point(32.5, 39) },
    { id: 'column-se', ...point(55, 39) }
  ],
  overhangs: [
    { id: 'overhang-dog-kennel', ...rect(65, 0, 10, 6), label: 'Dog\nKennel' },
    { id: 'overhang-carport', ...rect(65, 6, 10, 7), label: 'Carport' },
    { id: 'overhang-covered-entry', ...rect(65, 13, 8, 14), label: 'Covered\nEntry' }
  ],
  blockers: [
    {
      id: 'entry-projection-width-conflict',
      severity: 'critical',
      title: 'The east projection has conflicting authored widths',
      evidence:
        'The floor plan renders the covered entry as 8 ft wide, while the section, roof plan, site plan and 270 SF carport allowance use a 10 ft by 27 ft east projection.',
      requiredResolution:
        'Approve one measured east-projection envelope and regenerate every plan, section, roof, site, cost and render projection from it.'
    },
    {
      id: 'unclassified-enclosed-area',
      severity: 'high',
      title: '70 SF of the 2,730 SF footprint has no named zone',
      evidence:
        'The authored zones total 2,660 SF. The east 10 ft by 7 ft band between the guest-bath/service row and private-suite row is inside the footprint but has no semantic zone.',
      requiredResolution:
        'Name and bound this space, then determine its room, circulation, egress and MEP role.'
    },
    {
      id: 'construction-evidence-not-supplied',
      severity: 'critical',
      title: 'Construction and safety evidence is not modeled',
      evidence:
        'Wall thicknesses and assemblies, structural loads, door swings and clear widths, window sill/head/openability, fixtures, grading, drainage, electrical, mechanical and plumbing engineering are absent.',
      requiredResolution:
        'Complete the jurisdictional, survey, architectural and engineering review register before promoting this candidate beyond concept status.'
    }
  ]
};

function segmentWallAroundDoors(
  candidate: ThresholdDwellingDimensionCandidate,
  wallRun: ThresholdDwellingWallRun
): Array<{ x1: number; y1: number; x2: number; y2: number; exterior?: boolean }> {
  const horizontal = wallRun.start.yIn === wallRun.end.yIn;
  const start = horizontal ? wallRun.start.xIn : wallRun.start.yIn;
  const end = horizontal ? wallRun.end.xIn : wallRun.end.yIn;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const doorIntervals = candidate.doors
    .filter((door) => door.wallId === wallRun.id)
    .map((door) => {
      const center = horizontal ? door.center.xIn : door.center.yIn;
      return {
        start: center - door.planOpeningWidthIn / 2,
        end: center + door.planOpeningWidthIn / 2
      };
    })
    .sort((a, b) => a.start - b.start);

  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; exterior?: boolean }> = [];
  let cursor = low;
  for (const interval of doorIntervals) {
    const openingStart = Math.max(low, interval.start);
    const openingEnd = Math.min(high, interval.end);
    if (cursor < openingStart) {
      segments.push(
        horizontal
          ? {
              x1: feet(cursor),
              y1: feet(wallRun.start.yIn),
              x2: feet(openingStart),
              y2: feet(wallRun.end.yIn),
              exterior: wallRun.exterior
            }
          : {
              x1: feet(wallRun.start.xIn),
              y1: feet(cursor),
              x2: feet(wallRun.end.xIn),
              y2: feet(openingStart),
              exterior: wallRun.exterior
            }
      );
    }
    cursor = Math.max(cursor, openingEnd);
  }
  if (cursor < high) {
    segments.push(
      horizontal
        ? {
            x1: feet(cursor),
            y1: feet(wallRun.start.yIn),
            x2: feet(high),
            y2: feet(wallRun.end.yIn),
            exterior: wallRun.exterior
          }
        : {
            x1: feet(wallRun.start.xIn),
            y1: feet(cursor),
            x2: feet(wallRun.end.xIn),
            y2: feet(high),
            exterior: wallRun.exterior
          }
    );
  }
  return segments;
}

/** The existing SVG plan is a projection of the candidate—not a second geometry source. */
export const THRESHOLD_DWELLING_FLOOR_PLAN: FloorPlanData = {
  name: 'Miesian Family Pavilion',
  width: feet(THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint.widthIn),
  depth: feet(THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint.depthIn),
  bedrooms: 3,
  bathrooms: 4,
  features: 'In-Law Suite',
  zones: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.zones.map((zone) => ({
    x: feet(zone.xIn),
    y: feet(zone.yIn),
    width: feet(zone.widthIn),
    height: feet(zone.heightIn),
    type: zone.type
  })),
  walls: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.walls.flatMap((wallRun) =>
    segmentWallAroundDoors(THRESHOLD_DWELLING_DIMENSION_CANDIDATE, wallRun)
  ),
  rooms: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.labels.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn),
    name: item.name,
    small: item.small
  })),
  doors: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.doors.map((item) => ({
    x: feet(item.center.xIn),
    y: feet(item.center.yIn),
    width: feet(item.planOpeningWidthIn),
    orientation: item.orientation
  })),
  windows: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.windows.map((item) => ({
    x: feet(item.center.xIn),
    y: feet(item.center.yIn),
    width: feet(item.planOpeningWidthIn),
    orientation: item.orientation
  })),
  columns: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.columns.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn)
  })),
  overhangs: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.overhangs.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn),
    width: feet(item.widthIn),
    height: feet(item.heightIn),
    label: item.label
  })),
  entry: { x: 73, y: 16 }
};

function pointIsIntegral(pointIn: ThresholdDwellingPointIn): boolean {
  return Number.isInteger(pointIn.xIn) && Number.isInteger(pointIn.yIn);
}

/**
 * Performs only deterministic checks supported by the supplied concept data.
 * It never substitutes a geometric pass for an architectural or code-review pass.
 */
export function validateThresholdDwellingDimensions(
  candidate: ThresholdDwellingDimensionCandidate
): ThresholdDwellingDimensionValidation {
  const coordinateRecords = [
    ...candidate.walls.flatMap((wallRun) => [
      { id: `${wallRun.id}:start`, point: wallRun.start },
      { id: `${wallRun.id}:end`, point: wallRun.end }
    ]),
    ...candidate.doors.map((door) => ({ id: door.id, point: door.center })),
    ...candidate.windows.map((window) => ({ id: window.id, point: window.center })),
    ...candidate.zones.map((zone) => ({ id: zone.id, point: zone })),
    ...candidate.labels.map((item) => ({ id: item.id, point: item })),
    ...candidate.columns.map((column) => ({ id: column.id, point: column })),
    ...candidate.overhangs.map((item) => ({ id: item.id, point: item }))
  ];
  const nonIntegralCoordinateIds = coordinateRecords
    .filter(({ point }) => !pointIsIntegral(point))
    .map(({ id }) => id);
  const classifiedAreaSqFt = candidate.zones.reduce(
    (total, zone) => total + (zone.widthIn * zone.heightIn) / 144,
    0
  );
  const footprintAreaSqFt = (candidate.footprint.widthIn * candidate.footprint.depthIn) / 144;

  return {
    canFinalize: false,
    nonIntegralCoordinateIds,
    classifiedAreaSqFt,
    unclassifiedEnclosedAreaSqFt: footprintAreaSqFt - classifiedAreaSqFt,
    blockers: candidate.blockers
  };
}
