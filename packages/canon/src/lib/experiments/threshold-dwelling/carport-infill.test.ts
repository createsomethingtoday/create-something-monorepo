import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION,
  assessThresholdDwellingCarportInfill
} from './index.js';

describe('Threshold Dwelling carport infill', () => {
  it('preserves the 10 ft by 27 ft east projection as a loggia and separates vehicle use', () => {
    const assessment = assessThresholdDwellingCarportInfill();

    expect(THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION.retainedEastProjection).toEqual({
      widthIn: 120,
      depthIn: 324,
      roles: ['covered-entry', 'dog-service', 'weather-protected-arrival']
    });
    expect(assessment).toMatchObject({
      existingProjectionMatchesBaseline: true,
      companionCarportClearAreaSqFt: 324,
      canReplaceAmbiguousCarportLabel: true,
      constructionReady: false
    });
  });

  it('keeps the companion bay clear and gives pedestrians an independent route', () => {
    const recommendation = THRESHOLD_DWELLING_CARPORT_INFILL_RECOMMENDATION;

    expect(recommendation.recommendedCarportPavilion).toMatchObject({
      clearBayWidthIn: 144,
      clearBayLengthIn: 324,
      vehicleApproach: 'parallel-to-the-27-foot-axis',
      internalPartitions: 'not-permitted-within-clear-bay'
    });
    expect(recommendation.pedestrianArrival).toMatchObject({
      independentFromVehicleBay: true,
      conceptTargetClearWidthIn: 48,
      complianceStatus: 'professional-determination-required'
    });
    expect(recommendation.requiredNextDeterminations).toContain(
      'jurisdictional-covered-parking-and-separation-requirements'
    );
  });
});
