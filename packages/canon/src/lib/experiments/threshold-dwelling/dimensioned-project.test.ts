import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  THRESHOLD_DWELLING_FLOOR_PLAN,
  validateThresholdDwellingDimensions
} from './index.js';

describe('Threshold Dwelling dimension candidate', () => {
  it('preserves the known plan as an inch-precise design-intent baseline', () => {
    const candidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE;
    const validation = validateThresholdDwellingDimensions(candidate);

    expect(candidate.status).toBe('candidate-design-intent');
    expect(candidate.coordinateSystem.unit).toBe('in');
    expect(candidate.footprint.widthIn).toBe(780);
    expect(candidate.footprint.depthIn).toBe(504);
    expect(candidate.footprint.areaSqFt).toBe(2730);
    expect(candidate.footprint.perimeterFt).toBe(214);
    expect(candidate.doors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'door-main-entry', planOpeningWidthIn: 36 })
      ])
    );
    expect(THRESHOLD_DWELLING_FLOOR_PLAN).toMatchObject({ width: 65, depth: 42 });
    expect(THRESHOLD_DWELLING_FLOOR_PLAN.doors).toHaveLength(13);
    expect(THRESHOLD_DWELLING_FLOOR_PLAN.windows).toHaveLength(9);
    expect(
      [...candidate.doors, ...candidate.windows].every((opening) =>
        candidate.walls.some((wall) => wall.id === opening.wallId)
      )
    ).toBe(true);
    expect(validation.nonIntegralCoordinateIds).toEqual([]);
    expect(validation.unclassifiedEnclosedAreaSqFt).toBe(0);
    expect(candidate.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'zone-entry-hall',
          xIn: 660,
          yIn: 156,
          widthIn: 120,
          heightIn: 84,
          type: 'public'
        })
      ])
    );
    expect(candidate.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'entry-hall-program',
          status: 'approved',
          decision: expect.stringContaining('Entry Hall')
        })
      ])
    );
  });

  it('uses the approved east projection and entry hall while retaining construction-evidence blockers', () => {
    const validation = validateThresholdDwellingDimensions(
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE
    );
    const coveredEntry = THRESHOLD_DWELLING_DIMENSION_CANDIDATE.overhangs.find(
      (overhang) => overhang.id === 'overhang-covered-entry'
    );

    expect(validation.canFinalize).toBe(false);
    expect(coveredEntry).toMatchObject({ widthIn: 120, heightIn: 168 });
    expect(THRESHOLD_DWELLING_FLOOR_PLAN.entry).toEqual({ x: 75, y: 16 });
    expect(THRESHOLD_DWELLING_DIMENSION_CANDIDATE.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'east-projection-envelope',
          status: 'approved',
          decision: expect.stringContaining('10 ft by 27 ft')
        })
      ])
    );
    expect(validation.blockers).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'entry-projection-width-conflict' })])
    );
    expect(validation.blockers).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'unclassified-enclosed-area' })])
    );
    expect(validation.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'construction-evidence-not-supplied' })
      ])
    );
  });
});
