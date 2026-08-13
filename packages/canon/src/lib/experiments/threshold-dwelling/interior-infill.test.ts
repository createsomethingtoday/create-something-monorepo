import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_INTERIOR_INFILL,
  assessThresholdDwellingInteriorInfill
} from './index.js';

describe('Threshold Dwelling interior infill', () => {
  it('resolves the shallow laundry without enlarging the service program', () => {
    const assessment = assessThresholdDwellingInteriorInfill();

    expect(assessment).toMatchObject({
      currentLaundryDepthIn: 48,
      proposedLaundryDepthIn: 72,
      combinedServiceAreaSqFtPreserved: true,
      constructionReady: false
    });
    expect(THRESHOLD_DWELLING_INTERIOR_INFILL.serviceRevision.proposed).toMatchObject({
      laundry: { widthIn: 144, depthIn: 72 },
      pantry: { widthIn: 144, depthIn: 84 },
      dividerMoveIn: 24
    });
  });

  it('gives the open room legible, complete kitchen, dining, and living bays', () => {
    const assessment = assessThresholdDwellingInteriorInfill();
    const interior = THRESHOLD_DWELLING_INTERIOR_INFILL;

    expect(assessment.publicRoomBaysFillOpenRoom).toBe(true);
    expect(assessment.hallIsSevenFeetDeep).toBe(true);
    expect(interior.publicRoom.functionalBays).toEqual([
      { id: 'kitchen', widthIn: 180, depthIn: 156 },
      { id: 'dining', widthIn: 156, depthIn: 156 },
      { id: 'living', widthIn: 180, depthIn: 156 }
    ]);
    expect(interior.publicRoom.kitchenConcept).toMatchObject({
      islandWidthIn: 108,
      islandDepthIn: 36,
      selectedWorkingAisleTargetIn: 42,
      selectedFrontClearTargetIn: 48
    });
  });

  it('keeps materials durable and glazing/lighting decisions review-gated', () => {
    const interior = THRESHOLD_DWELLING_INTERIOR_INFILL;

    expect(interior.materialRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ material: 'low-sheen-polished-concrete' }),
        expect.objectContaining({ material: 'large-format-porcelain' }),
        expect.objectContaining({ material: 'protected-cedar' })
      ])
    );
    expect(interior.glazingAndLighting).toMatchObject({
      publicGlazing: 'retain-floor-to-ceiling-intent-with-recessed-shade-provisions',
      bedroomGlazing: 'layered-privacy-and-operable-egress-determination-required'
    });
    expect(interior.requiredNextDeterminations).toContain(
      'dimensioned-casework-fixture-and-furniture-plan'
    );
  });
});
