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

export interface ThresholdDwellingProjectDecision {
  id: string;
  status: 'approved';
  authority: 'project owner';
  title: string;
  decision: string;
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
    revision: '0.5' | '0.6' | '0.7';
    statement: string;
  };
  decisions: ThresholdDwellingProjectDecision[];
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
const rect = (
  xFt: number,
  yFt: number,
  widthFt: number,
  heightFt: number
): ThresholdDwellingRectIn => ({
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

const label = (
  id: string,
  xFt: number,
  yFt: number,
  name: string,
  small = false
): ThresholdDwellingRoomLabel => ({
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
    revision: '0.7',
    statement:
      'Exact only within the authored concept coordinate system. It is not a survey, permit, code-compliance, structural, MEP, or construction source.'
  },
  decisions: [
    {
      id: 'east-projection-envelope',
      status: 'approved',
      authority: 'project owner',
      title: 'Use the 10 ft by 27 ft east projection',
      decision:
        'The dog kennel, carport, and covered entry form one 10 ft by 27 ft east projection; the covered-entry segment is 10 ft by 14 ft.'
    },
    {
      id: 'entry-hall-program',
      status: 'approved',
      authority: 'project owner',
      title: 'Classify the east arrival band as the Entry Hall',
      decision:
        'The 10 ft by 7 ft enclosed band at x=55–65 ft and y=13–20 ft is the Entry Hall / arrival zone connecting the main entry to the central hall.'
    },
    {
      id: 'ground-up-replacement-scope',
      status: 'approved',
      authority: 'project owner',
      title: 'Use a ground-up replacement-home scope',
      decision:
        'The candidate is a new ground-up replacement home at the existing homesite, not a renovation or addition.'
    },
    {
      id: 'replacement-removal-sequence',
      status: 'approved',
      authority: 'project owner',
      title: 'Remove and decommission the existing home before construction',
      decision:
        'The existing home is to be removed and decommissioned before new-home construction, subject to authority, utility, environmental, and contractor requirements.'
    },
    {
      id: 'all-electric-resilience-basis',
      status: 'approved',
      authority: 'project owner',
      title: 'Use an all-electric, solar/battery-ready basis of design',
      decision:
        'The project reserves an all-electric basis of design with solar and battery readiness; equipment, service, load, and interconnection design remain professional determinations.'
    },
    {
      id: 'sleeping-suite-exterior-egress-intent',
      status: 'approved',
      authority: 'project owner',
      title: 'Place sleeping-suite window candidates on exterior walls',
      decision:
        'Each sleeping suite now carries an exterior-window candidate. Sill, head, net clear opening, operation, glazing, and adopted-code compliance remain unsupplied and must be scheduled by the design professional.'
    },
    {
      id: 'maximum-useful-glazing-intent',
      status: 'approved',
      authority: 'project owner',
      title: 'Prioritize maximum useful floor-to-ceiling glazing',
      decision:
        'Prioritize a floor-to-ceiling visual connection to the landscape, especially across the public open-room facade, while retaining intentional opaque/service/structural bays and resolving privacy, egress, safety glazing, solar control, water management, and lateral design through qualified review.'
    }
  ],
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
    opening('window-daughter-suite', 'wall-exterior-south', 'window', 12, 42, 6, 'horizontal'),
    opening('window-primary-bedroom', 'wall-exterior-south', 'window', 28, 42, 8, 'horizontal'),
    opening('window-primary-bath', 'wall-exterior-south', 'window', 38, 42, 5, 'horizontal'),
    opening('window-inlaw-suite', 'wall-exterior-south', 'window', 54, 42, 6, 'horizontal'),
    opening('window-kitchen', 'wall-exterior-north', 'window', 22, 0, 12, 'horizontal'),
    opening('window-living-dining', 'wall-exterior-north', 'window', 37, 0, 12, 'horizontal'),
    opening('window-open-zone', 'wall-exterior-north', 'window', 49.5, 0, 7, 'horizontal'),
    opening('window-living-east', 'wall-exterior-east', 'window', 65, 30, 6, 'vertical')
  ],
  zones: [
    zone('zone-laundry', 0, 0, 12, 4, 'service'),
    zone('zone-pantry', 0, 4, 12, 9, 'service'),
    zone('zone-dog-utility', 55, 0, 10, 6, 'service'),
    zone('zone-guest-bath', 55, 6, 10, 7, 'public'),
    zone('zone-west-hall', 0, 13, 12, 7, 'public'),
    zone('zone-center-hall', 12, 13, 43, 7, 'public'),
    zone('zone-entry-hall', 55, 13, 10, 7, 'public'),
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
    label('label-entry-hall', 60, 16.5, 'Entry\nHall', true),
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
    { id: 'overhang-covered-entry', ...rect(65, 13, 10, 14), label: 'Covered\nEntry' }
  ],
  blockers: [
    {
      id: 'construction-evidence-not-supplied',
      severity: 'critical',
      title: 'Construction and safety evidence is not modeled',
      evidence:
        'Wall thicknesses and assemblies, structural loads, door swings and clear widths, window sill/head/openability, fixtures, grading, drainage, electrical, mechanical and plumbing engineering are absent.',
      requiredResolution:
        'Complete the jurisdictional, survey, architectural and engineering review register before promoting this candidate beyond concept status.'
    },
    {
      id: 'sleeping-room-egress-not-specified',
      severity: 'critical',
      title: 'Sleeping-room exterior opening compliance is not specified',
      evidence:
        'The candidate now places an exterior window at each sleeping suite, but it does not contain sill heights, head heights, net clear opening, operation, glazing, window-well conditions, or an adopted-code determination.',
      requiredResolution:
        'The architectural professional must issue a coordinated door and window schedule and verify required exterior escape/rescue or alternate egress provisions under the confirmed adopted code.'
    },
    {
      id: 'site-orientation-and-glazing-performance-not-specified',
      severity: 'high',
      title: 'Site orientation, shade, and glazing performance are not specified',
      evidence:
        'The plan north datum is an authored drawing coordinate, not a surveyed compass orientation. The candidate has no site azimuth, horizon or obstruction survey, shade study, glazing U-factor/SHGC selection, room-by-room load calculation, or energy-compliance determination.',
      requiredResolution:
        'Tie the design to the surveyed site, issue a facade-specific solar/shade study, select verified glazing performance, and coordinate the final enclosure with the energy and HVAC design professionals.'
    },
    {
      id: 'glazing-structure-and-water-management-not-specified',
      severity: 'high',
      title: 'Glazing support, safety, and water management are not specified',
      evidence:
        'The enlarged public-facade openings are plan widths only. They contain no elevation, sill/head, mullion, structural support, lateral system, safety-glazing, drainage-plane, flashing, sill-pan, manufacturer, installation, or warranty information.',
      requiredResolution:
        'Coordinate facade elevations, engineered support and lateral design, hazardous-glazing determinations, tested window/wall systems, and weather-protection details before pricing or construction use.'
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

  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; exterior?: boolean }> =
    [];
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

/**
 * Projects a dimension candidate into the shared render shape. The renderer is
 * intentionally downstream of this function so derived, reviewable revisions
 * do not need to recreate a second set of walls, labels, and opening geometry.
 */
export function projectThresholdDwellingFloorPlan(
  candidate: ThresholdDwellingDimensionCandidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE
): FloorPlanData {
  return {
  name: 'Miesian Family Pavilion',
  width: feet(candidate.footprint.widthIn),
  depth: feet(candidate.footprint.depthIn),
  bedrooms: 3,
  bathrooms: 4,
  features: 'In-Law Suite',
  zones: candidate.zones.map((zone) => ({
    x: feet(zone.xIn),
    y: feet(zone.yIn),
    width: feet(zone.widthIn),
    height: feet(zone.heightIn),
    type: zone.type
  })),
  walls: candidate.walls.flatMap((wallRun) =>
    segmentWallAroundDoors(candidate, wallRun)
  ),
  rooms: candidate.labels.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn),
    name: item.name,
    small: item.small
  })),
  doors: candidate.doors.map((item) => ({
    x: feet(item.center.xIn),
    y: feet(item.center.yIn),
    width: feet(item.planOpeningWidthIn),
    orientation: item.orientation
  })),
  windows: candidate.windows.map((item) => ({
    x: feet(item.center.xIn),
    y: feet(item.center.yIn),
    width: feet(item.planOpeningWidthIn),
    orientation: item.orientation
  })),
  columns: candidate.columns.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn)
  })),
  overhangs: candidate.overhangs.map((item) => ({
    x: feet(item.xIn),
    y: feet(item.yIn),
    width: feet(item.widthIn),
    height: feet(item.heightIn),
    label: item.label
  })),
  entry: { x: 75, y: 16 }
  };
}

/** The existing SVG plan is a projection of the candidate—not a second geometry source. */
export const THRESHOLD_DWELLING_FLOOR_PLAN: FloorPlanData =
  projectThresholdDwellingFloorPlan();

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
