export type CourtPoint = [number, number];
export type ImagePoint = [number, number];

export type CourtCalibrationPoint = {
  id: string;
  image: ImagePoint;
  court: CourtPoint;
};

export type CourtCalibration = {
  profile: string;
  method: 'homography-held-out-v1' | 'homography-held-out-v2';
  matrix: [number, number, number, number, number, number, number, number, number];
  keypointCount: number;
  validation: {
    heldOutCount: number;
    medianErrorFeet: number;
    p95ErrorFeet: number;
    requiredP95ErrorFeet?: number;
    passed: boolean;
  };
};

export type CourtDefinition = Readonly<{
  profile: string;
  length: number;
  width: number;
  hoopFromBaseline: number;
  laneDepth: number;
  laneWidth: number;
  centerCircleRadius: number;
  freeThrowCircleRadius: number;
  restrictedAreaRadius: number;
  threePointRadius: number;
  leftLane: Readonly<{ x: number; y: number; width: number; height: number }>;
  rightLane: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

export type CourtGeometryDistance = {
  id: string;
  label: string;
  kind: 'line-segment' | 'circle' | 'arc';
  distanceFeet: number;
};

const length = 94;
const width = 50;
const laneDepth = 19;
const laneWidth = 16;

export const FULL_COURT_94X50: CourtDefinition = Object.freeze({
  profile: 'full-court-94x50-v1',
  length,
  width,
  hoopFromBaseline: 5.25,
  laneDepth,
  laneWidth,
  centerCircleRadius: 6,
  freeThrowCircleRadius: 6,
  restrictedAreaRadius: 4,
  threePointRadius: 19.75,
  leftLane: Object.freeze({ x: 0, y: (width - laneWidth) / 2, width: laneDepth, height: laneWidth }),
  rightLane: Object.freeze({ x: length - laneDepth, y: (width - laneWidth) / 2, width: laneDepth, height: laneWidth })
});

const mansfieldLength = 84;
const mansfieldWidth = 50;
const mansfieldLaneDepth = 19;
const mansfieldLaneWidth = 12;

/**
 * Source-bound profile for FieldhouseUSA Mansfield's 84-by-50-foot
 * high-school basketball courts. The black basketball markings in the source
 * video are authoritative; overlapping volleyball markings are distractors.
 */
export const MANSFIELD_FIELDHOUSE_84X50: CourtDefinition = Object.freeze({
  profile: 'fieldhouseusa-mansfield-high-school-84x50-v1',
  length: mansfieldLength,
  width: mansfieldWidth,
  hoopFromBaseline: 5.25,
  laneDepth: mansfieldLaneDepth,
  laneWidth: mansfieldLaneWidth,
  centerCircleRadius: 6,
  freeThrowCircleRadius: 6,
  restrictedAreaRadius: 4,
  threePointRadius: 19.75,
  leftLane: Object.freeze({
    x: 0,
    y: (mansfieldWidth - mansfieldLaneWidth) / 2,
    width: mansfieldLaneDepth,
    height: mansfieldLaneWidth
  }),
  rightLane: Object.freeze({
    x: mansfieldLength - mansfieldLaneDepth,
    y: (mansfieldWidth - mansfieldLaneWidth) / 2,
    width: mansfieldLaneDepth,
    height: mansfieldLaneWidth
  })
});

export const MANSFIELD_FIELDHOUSE_SOURCE_SHA256 = '94cb743b7ffe129ec30f8614ea48196245402adc6bf560b96a91ba5d388e95c0';

export const COURT_PROFILES = Object.freeze({
  [FULL_COURT_94X50.profile]: FULL_COURT_94X50,
  [MANSFIELD_FIELDHOUSE_84X50.profile]: MANSFIELD_FIELDHOUSE_84X50
});

export function courtDefinition(profile: string): CourtDefinition {
  const court = COURT_PROFILES[profile as keyof typeof COURT_PROFILES];
  if (!court) throw new Error(`Unsupported court profile: ${profile}.`);
  return court;
}

const distance = (a: CourtPoint, b: CourtPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function courtZone(point: CourtPoint, court: CourtDefinition = FULL_COURT_94X50) {
  const [x, y] = point;
  const side = x < court.length / 2 ? 'left' : 'right';
  const hoop: CourtPoint = [side === 'left' ? court.hoopFromBaseline : court.length - court.hoopFromBaseline, court.width / 2];
  if (distance(point, [court.length / 2, court.width / 2]) <= court.centerCircleRadius) return 'center-circle';
  if (distance(point, hoop) <= court.restrictedAreaRadius) return `${side}-restricted-area`;
  const lane = side === 'left' ? court.leftLane : court.rightLane;
  if (x >= lane.x && x <= lane.x + lane.width && y >= lane.y && y <= lane.y + lane.height) return `${side}-paint`;
  const baselineDistance = side === 'left' ? x : court.length - x;
  if (baselineDistance <= court.laneDepth && (y <= 8 || y >= court.width - 8)) return `${side}-corner`;
  if (y >= lane.y && y <= lane.y + lane.height) return `${side}-slot`;
  return `${side}-wing`;
}

export function courtToSvg(point: CourtPoint, scale = 10, court: CourtDefinition = FULL_COURT_94X50): CourtPoint {
  return [point[0] * scale, (court.width - point[1]) * scale];
}

export function normalizeCourtPoint(point: CourtPoint, from: CourtDefinition, to: CourtDefinition): CourtPoint {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return [round(point[0] / from.length * to.length), round(point[1] / from.width * to.width)];
}

function pointToSegmentDistance(point: CourtPoint, start: CourtPoint, end: CourtPoint) {
  const [px, py] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const magnitude = dx * dx + dy * dy;
  const amount = magnitude === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / magnitude));
  return Math.hypot(px - (x1 + amount * dx), py - (y1 + amount * dy));
}

const feet = (value: number) => Math.round(value * 1000) / 1000;

/** Distances from a floor-contact point to named, finite basketball markings. */
export function courtLineDistances(point: CourtPoint, court: CourtDefinition = FULL_COURT_94X50): CourtGeometryDistance[] {
  const laneNear = (court.width - court.laneWidth) / 2;
  const laneFar = laneNear + court.laneWidth;
  const rightFreeThrowX = court.length - court.laneDepth;
  const center: CourtPoint = [court.length / 2, court.width / 2];
  const segment = (id: string, label: string, start: CourtPoint, end: CourtPoint): CourtGeometryDistance => ({
    id,
    label,
    kind: 'line-segment',
    distanceFeet: feet(pointToSegmentDistance(point, start, end))
  });
  const circle = (id: string, label: string, origin: CourtPoint, radius: number): CourtGeometryDistance => ({
    id,
    label,
    kind: 'circle',
    distanceFeet: feet(Math.abs(distance(point, origin) - radius))
  });
  const threePointArc = (id: string, label: string, side: 'left' | 'right'): CourtGeometryDistance => {
    const localPoint: CourtPoint = side === 'left' ? point : [court.length - point[0], point[1]];
    const hoop: CourtPoint = [court.hoopFromBaseline, court.width / 2];
    const dx = localPoint[0] - hoop[0];
    const dy = localPoint[1] - hoop[1];
    const angle = Math.atan2(dy, dx);
    const endpointAngle = Math.acos(-court.hoopFromBaseline / court.threePointRadius);
    let arcDistance: number;
    if (angle >= -endpointAngle && angle <= endpointAngle) {
      arcDistance = Math.abs(Math.hypot(dx, dy) - court.threePointRadius);
    } else {
      const upper: CourtPoint = [0, court.width / 2 - Math.sqrt(court.threePointRadius ** 2 - court.hoopFromBaseline ** 2)];
      const lower: CourtPoint = [0, court.width / 2 + Math.sqrt(court.threePointRadius ** 2 - court.hoopFromBaseline ** 2)];
      arcDistance = Math.min(distance(localPoint, upper), distance(localPoint, lower));
    }
    return { id, label, kind: 'arc', distanceFeet: feet(arcDistance) };
  };
  return [
    segment('left-baseline', 'Left baseline', [0, 0], [0, court.width]),
    segment('right-baseline', 'Right baseline', [court.length, 0], [court.length, court.width]),
    segment('near-sideline', 'Near sideline', [0, 0], [court.length, 0]),
    segment('far-sideline', 'Far sideline', [0, court.width], [court.length, court.width]),
    segment('half-court', 'Half-court line', [court.length / 2, 0], [court.length / 2, court.width]),
    segment('left-free-throw-line', 'Left free-throw line', [court.laneDepth, laneNear], [court.laneDepth, laneFar]),
    segment('right-free-throw-line', 'Right free-throw line', [rightFreeThrowX, laneNear], [rightFreeThrowX, laneFar]),
    segment('left-lane-near', 'Left lane near edge', [0, laneNear], [court.laneDepth, laneNear]),
    segment('left-lane-far', 'Left lane far edge', [0, laneFar], [court.laneDepth, laneFar]),
    segment('right-lane-near', 'Right lane near edge', [rightFreeThrowX, laneNear], [court.length, laneNear]),
    segment('right-lane-far', 'Right lane far edge', [rightFreeThrowX, laneFar], [court.length, laneFar]),
    circle('center-circle', 'Center circle', center, court.centerCircleRadius),
    circle('left-free-throw-circle', 'Left free-throw circle', [court.laneDepth, court.width / 2], court.freeThrowCircleRadius),
    circle('right-free-throw-circle', 'Right free-throw circle', [rightFreeThrowX, court.width / 2], court.freeThrowCircleRadius),
    threePointArc('left-three-point-arc', 'Left three-point arc', 'left'),
    threePointArc('right-three-point-arc', 'Right three-point arc', 'right')
  ].sort((left, right) => left.distanceFeet - right.distanceFeet || left.id.localeCompare(right.id));
}

function solveLinear(matrix: number[][], values: number[]) {
  const augmented = matrix.map((row, index) => [...row, values[index]!]);
  for (let column = 0; column < matrix.length; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < augmented.length; row += 1) {
      if (Math.abs(augmented[row]![column]!) > Math.abs(augmented[pivot]![column]!)) pivot = row;
    }
    if (Math.abs(augmented[pivot]![column]!) < 1e-10) throw new Error('Court calibration keypoints are singular or collinear.');
    [augmented[column], augmented[pivot]] = [augmented[pivot]!, augmented[column]!];
    const divisor = augmented[column]![column]!;
    for (let index = column; index <= matrix.length; index += 1) augmented[column]![index] /= divisor;
    for (let row = 0; row < augmented.length; row += 1) {
      if (row === column) continue;
      const factor = augmented[row]![column]!;
      for (let index = column; index <= matrix.length; index += 1) augmented[row]![index] -= factor * augmented[column]![index]!;
    }
  }
  return augmented.map((row) => row.at(-1)!);
}

function homography(points: CourtCalibrationPoint[]): CourtCalibration['matrix'] {
  const rows: number[][] = [];
  const values: number[] = [];
  for (const point of points) {
    const [u, v] = point.image;
    const [x, y] = point.court;
    rows.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    values.push(x);
    rows.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    values.push(y);
  }
  const normal = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0));
  const target = Array.from({ length: 8 }, () => 0);
  for (let row = 0; row < rows.length; row += 1) {
    for (let left = 0; left < 8; left += 1) {
      target[left]! += rows[row]![left]! * values[row]!;
      for (let right = 0; right < 8; right += 1) normal[left]![right]! += rows[row]![left]! * rows[row]![right]!;
    }
  }
  const solved = solveLinear(normal, target);
  return [...solved, 1] as CourtCalibration['matrix'];
}

export function projectCourtPoint(calibration: Pick<CourtCalibration, 'matrix'> & Partial<Pick<CourtCalibration, 'profile'>>, image: ImagePoint) {
  const [u, v] = image;
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = calibration.matrix;
  const scale = h31 * u + h32 * v + h33;
  if (Math.abs(scale) < 1e-10) throw new Error('Court calibration cannot project this image point.');
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const court: CourtPoint = [round((h11 * u + h12 * v + h13) / scale), round((h21 * u + h22 * v + h23) / scale)];
  const definition = calibration.profile ? courtDefinition(calibration.profile) : FULL_COURT_94X50;
  const insideCourt = court[0] >= 0 && court[0] <= definition.length && court[1] >= 0 && court[1] <= definition.width;
  return { court, insideCourt };
}

export function calibrateCourt(input: { profile: string; keypoints: CourtCalibrationPoint[]; heldOut: CourtCalibrationPoint[] }): CourtCalibration {
  courtDefinition(input.profile);
  if (input.keypoints.length < 4) throw new Error('Court calibration requires at least four keypoints.');
  if (input.heldOut.length < 2) throw new Error('Court calibration requires independent held-out line evidence.');
  const matrix = homography(input.keypoints);
  const errors = input.heldOut.map((point) => {
    const projected = projectCourtPoint({ matrix, profile: input.profile }, point.image).court;
    return distance(projected, point.court);
  }).sort((a, b) => a - b);
  const middle = Math.floor(errors.length / 2);
  const median = errors.length % 2 ? errors[middle]! : (errors[middle - 1]! + errors[middle]!) / 2;
  const p95 = errors[Math.max(0, Math.ceil(errors.length * 0.95) - 1)]!;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const mansfield = input.profile === MANSFIELD_FIELDHOUSE_84X50.profile;
  const requiredP95ErrorFeet = mansfield ? 1 : 4;
  const validation = {
    heldOutCount: errors.length,
    medianErrorFeet: round(median),
    p95ErrorFeet: round(p95),
    ...(mansfield ? { requiredP95ErrorFeet } : {}),
    passed: mansfield ? p95 <= requiredP95ErrorFeet : median <= 2 && p95 <= requiredP95ErrorFeet
  };
  return {
    profile: input.profile,
    method: mansfield ? 'homography-held-out-v2' : 'homography-held-out-v1',
    matrix,
    keypointCount: input.keypoints.length,
    validation
  };
}
