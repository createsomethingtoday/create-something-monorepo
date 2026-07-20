import { describe, expect, it } from 'vitest';
import { FULL_COURT_94X50, calibrateCourt, courtZone, projectCourtPoint } from './court.js';

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
