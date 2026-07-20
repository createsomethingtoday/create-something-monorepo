export type CourtPoint = [number, number];
export type ImagePoint = [number, number];

export type CourtCalibrationPoint = {
  id: string;
  image: ImagePoint;
  court: CourtPoint;
};

export type CourtCalibration = {
  profile: string;
  method: 'homography-held-out-v1';
  matrix: [number, number, number, number, number, number, number, number, number];
  keypointCount: number;
  validation: {
    heldOutCount: number;
    medianErrorFeet: number;
    p95ErrorFeet: number;
    passed: boolean;
  };
};

const length = 94;
const width = 50;
const laneDepth = 19;
const laneWidth = 16;

export const FULL_COURT_94X50 = Object.freeze({
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

const distance = (a: CourtPoint, b: CourtPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function courtZone(point: CourtPoint) {
  const [x, y] = point;
  const court = FULL_COURT_94X50;
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

export function courtToSvg(point: CourtPoint, scale = 10): CourtPoint {
  return [point[0] * scale, (FULL_COURT_94X50.width - point[1]) * scale];
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

export function projectCourtPoint(calibration: Pick<CourtCalibration, 'matrix'>, image: ImagePoint) {
  const [u, v] = image;
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = calibration.matrix;
  const scale = h31 * u + h32 * v + h33;
  if (Math.abs(scale) < 1e-10) throw new Error('Court calibration cannot project this image point.');
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const court: CourtPoint = [round((h11 * u + h12 * v + h13) / scale), round((h21 * u + h22 * v + h23) / scale)];
  const insideCourt = court[0] >= 0 && court[0] <= FULL_COURT_94X50.length && court[1] >= 0 && court[1] <= FULL_COURT_94X50.width;
  return { court, insideCourt };
}

export function calibrateCourt(input: { profile: string; keypoints: CourtCalibrationPoint[]; heldOut: CourtCalibrationPoint[] }): CourtCalibration {
  if (input.profile !== FULL_COURT_94X50.profile) throw new Error(`Unsupported court profile: ${input.profile}.`);
  if (input.keypoints.length < 4) throw new Error('Court calibration requires at least four keypoints.');
  if (input.heldOut.length < 2) throw new Error('Court calibration requires independent held-out line evidence.');
  const matrix = homography(input.keypoints);
  const errors = input.heldOut.map((point) => {
    const projected = projectCourtPoint({ matrix }, point.image).court;
    return distance(projected, point.court);
  }).sort((a, b) => a - b);
  const middle = Math.floor(errors.length / 2);
  const median = errors.length % 2 ? errors[middle]! : (errors[middle - 1]! + errors[middle]!) / 2;
  const p95 = errors[Math.max(0, Math.ceil(errors.length * 0.95) - 1)]!;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const validation = { heldOutCount: errors.length, medianErrorFeet: round(median), p95ErrorFeet: round(p95), passed: median <= 2 && p95 <= 4 };
  return { profile: input.profile, method: 'homography-held-out-v1', matrix, keypointCount: input.keypoints.length, validation };
}
