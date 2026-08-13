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
    expect(validation.unclassifiedEnclosedAreaSqFt).toBe(70);
  });

  it('refuses to present the concept as finalized while its sources or safety evidence conflict', () => {
    const validation = validateThresholdDwellingDimensions(
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE
    );

    expect(validation.canFinalize).toBe(false);
    expect(validation.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'entry-projection-width-conflict' }),
        expect.objectContaining({ id: 'unclassified-enclosed-area' }),
        expect.objectContaining({ id: 'construction-evidence-not-supplied' })
      ])
    );
  });
});
