import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_OUTFITTING_SYSTEM,
  validateThresholdDwellingOutfittingSystem
} from './outfitting-system.js';

describe('Threshold Dwelling design-intent outfitting system', () => {
  it('keeps every plan opening and daughter-suite window visible while completing the occupied systems study', () => {
    const system = THRESHOLD_DWELLING_OUTFITTING_SYSTEM;
    const openingItems = system.items.filter((item) => item.category === 'opening');

    expect(openingItems).toHaveLength(22);
    expect(system.items.find((item) => item.id === 'opening-window-daughter-suite')).toMatchObject({
      category: 'opening',
      sourceOpeningId: 'window-daughter-suite',
      chapterId: 'daughter-sleep-zone',
      rendering: 'plan-opening-marker'
    });
    expect(system.items.find((item) => item.id === 'furnishing-daughter-bed')).toMatchObject({
      category: 'furnishing',
      chapterId: 'daughter-sleep-zone',
      rendering: 'design-intent-volume'
    });
    expect(
      ['hvac', 'electrical', 'plumbing', 'life-safety'].every((category) =>
        system.items.some((item) => item.category === category)
      )
    ).toBe(true);
    expect(system.items.every((item) => item.constructionReady === false)).toBe(true);
    expect(validateThresholdDwellingOutfittingSystem(system)).toEqual({
      issueIds: [],
      isSafeForExperienceReview: true,
      constructionReady: false
    });
  });
});
