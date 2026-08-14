import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  THRESHOLD_DWELLING_FLOOR_PLAN,
  THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN,
  THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION,
  assessThresholdDwellingLivingSystemRevision
} from './index.js';

describe('Threshold Dwelling living-system revision', () => {
  it('keeps the 0.7 baseline intact while deriving a reviewable 0.8 proposal', () => {
    expect(THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision).toBe('0.7');
    expect(THRESHOLD_DWELLING_FLOOR_PLAN.name).toBe('Miesian Family Pavilion');
    expect(THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION).toMatchObject({
      proposedRevision: '0.8',
      status: 'proposed-design-intent',
      constructionReady: false
    });
    expect(THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN).toMatchObject({
      name: 'Miesian Family Pavilion — Rev 0.8 Proposal',
      width: 65,
      depth: 42
    });
  });

  it('makes only the proposed service adjustment inside the primary footprint', () => {
    expect(THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 0, y: 0, width: 12, height: 6 }),
        expect.objectContaining({ x: 0, y: 6, width: 12, height: 7 }),
        expect.objectContaining({ x: 12, y: 0, width: 43, height: 13 })
      ])
    );
    expect(THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.rooms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Pantry\nStorage' }),
        expect.objectContaining({ name: 'Laundry', y: 3 })
      ])
    );
    expect(
      THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.overhangs?.find(
        (overhang) => overhang.label === 'Covered\nService'
      )
    ).toMatchObject({ x: 65, y: 6, width: 10, height: 7 });
  });

  it('separates the companion carport from the plan baseline and keeps construction gated', () => {
    const assessment = assessThresholdDwellingLivingSystemRevision();
    const companion = THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.overhangs?.find(
      (overhang) => overhang.label === 'Companion\nCarport'
    );

    expect(companion).toEqual({
      x: 80,
      y: 0,
      width: 12,
      height: 27,
      label: 'Companion\nCarport'
    });
    expect(assessment).toMatchObject({
      baseFootprintPreserved: true,
      baseRevisionPreserved: true,
      serviceAreaSqFtPreserved: true,
      laundryDepthIn: 72,
      publicRoomBaysPreserved: true,
      circulationBandRemainsFurnitureFree: true,
      companionCarportClearAreaSqFt: 324,
      companionCarportIsPresentationOnly: true,
      constructionReady: false
    });
  });
});
