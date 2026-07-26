import { describe, expect, it } from 'vitest';
import {
  FULL_COURT_94X50,
  MANSFIELD_FIELDHOUSE_84X50,
  calibrateCourt,
  courtLineDistances,
  normalizeCourtPoint,
  courtZone,
  projectCourtPoint
} from './court.js';

describe('regulation full-court geometry', () => {
  it('uses one dimensioned court contract for lanes, hoops, and rendering', () => {
    expect(FULL_COURT_94X50).toMatchObject({
      length: 94,
      width: 50,
      hoopFromBaseline: 5.25,
      laneDepth: 19,
      laneWidth: 16,
      centerCircleRadius: 6,
      freeThrowCircleRadius: 6,
      restrictedAreaRadius: 4
    });
    expect(FULL_COURT_94X50.leftLane).toEqual({ x: 0, y: 17, width: 19, height: 16 });
    expect(FULL_COURT_94X50.rightLane).toEqual({ x: 75, y: 17, width: 19, height: 16 });
  });

  it('names basketball regions rather than coarse screen bands', () => {
    expect(courtZone([5.25, 25])).toBe('left-restricted-area');
    expect(courtZone([10, 25])).toBe('left-paint');
    expect(courtZone([47, 25])).toBe('center-circle');
    expect(courtZone([30, 25])).toBe('left-slot');
    expect(courtZone([64, 6])).toBe('right-wing');
    expect(courtZone([90, 3])).toBe('right-corner');
  });

  it('projects image footpoints through a held-out, error-scored court calibration', () => {
    const calibration = calibrateCourt({
      profile: FULL_COURT_94X50.profile,
      keypoints: [
        { id: 'left-near', image: [0.1, 0.8], court: [0, 0] },
        { id: 'left-far', image: [0.1, 0.2], court: [0, 50] },
        { id: 'right-near', image: [0.9, 0.8], court: [94, 0] },
        { id: 'right-far', image: [0.9, 0.2], court: [94, 50] }
      ],
      heldOut: [
        { id: 'half-court', image: [0.5, 0.5], court: [47, 25] },
        { id: 'left-free-throw', image: [0.2617, 0.5], court: [19, 25] }
      ]
    });
    expect(projectCourtPoint(calibration, [0.5, 0.5])).toMatchObject({ court: [47, 25], insideCourt: true });
    expect(calibration.validation).toMatchObject({ heldOutCount: 2, medianErrorFeet: 0, p95ErrorFeet: 0, passed: true });
  });

  it('rejects a calibration that has no independent held-out line evidence', () => {
    expect(() => calibrateCourt({
      profile: FULL_COURT_94X50.profile,
      keypoints: [
        { id: 'a', image: [0, 0], court: [0, 0] },
        { id: 'b', image: [1, 0], court: [94, 0] },
        { id: 'c', image: [1, 1], court: [94, 50] },
        { id: 'd', image: [0, 1], court: [0, 50] }
      ],
      heldOut: []
    })).toThrow(/held-out/i);
  });
});

describe('FieldhouseUSA Mansfield source court geometry', () => {
  it('uses the 84-by-50-foot high-school court and 12-foot lane without changing the legacy profile', () => {
    expect(MANSFIELD_FIELDHOUSE_84X50).toMatchObject({
      profile: 'fieldhouseusa-mansfield-high-school-84x50-v1',
      length: 84,
      width: 50,
      hoopFromBaseline: 5.25,
      laneDepth: 19,
      laneWidth: 12,
      centerCircleRadius: 6,
      freeThrowCircleRadius: 6,
      threePointRadius: 19.75
    });
    expect(MANSFIELD_FIELDHOUSE_84X50.leftLane).toEqual({ x: 0, y: 19, width: 19, height: 12 });
    expect(MANSFIELD_FIELDHOUSE_84X50.rightLane).toEqual({ x: 65, y: 19, width: 19, height: 12 });
    expect(FULL_COURT_94X50.leftLane).toEqual({ x: 0, y: 17, width: 19, height: 16 });
    expect(normalizeCourtPoint([47, 25], FULL_COURT_94X50, MANSFIELD_FIELDHOUSE_84X50)).toEqual([42, 25]);
  });

  it('measures a footpoint against named, finite court markings in feet', () => {
    const distances = courtLineDistances([20, 25], MANSFIELD_FIELDHOUSE_84X50);
    expect(distances.find((line) => line.id === 'left-free-throw-line')).toMatchObject({
      label: 'Left free-throw line',
      kind: 'line-segment',
      distanceFeet: 1
    });
    expect(distances.find((line) => line.id === 'half-court')).toMatchObject({ distanceFeet: 22 });
    expect(distances[0]).toMatchObject({ id: 'left-free-throw-line', distanceFeet: 1 });
    expect(courtLineDistances([0, 25], MANSFIELD_FIELDHOUSE_84X50).find((line) => line.id === 'left-three-point-arc')).toMatchObject({
      kind: 'arc',
      distanceFeet: 19.039
    });
  });

  it('enforces the one-foot p95 held-out requirement for Mansfield calibration', () => {
    const calibration = calibrateCourt({
      profile: MANSFIELD_FIELDHOUSE_84X50.profile,
      keypoints: [
        { id: 'left-near', image: [0, 1], court: [0, 0] },
        { id: 'left-far', image: [0, 0], court: [0, 50] },
        { id: 'right-near', image: [1, 1], court: [84, 0] },
        { id: 'right-far', image: [1, 0], court: [84, 50] }
      ],
      heldOut: [
        { id: 'half-court', image: [0.5, 0.5], court: [42, 25] },
        { id: 'left-free-throw', image: [0.25, 0.5], court: [19, 25] }
      ]
    });
    expect(calibration.method).toBe('homography-held-out-v2');
    expect(calibration.validation).toMatchObject({
      requiredP95ErrorFeet: 1,
      heldOutCount: 2,
      medianErrorFeet: 1,
      p95ErrorFeet: 2,
      passed: false
    });
  });
});
