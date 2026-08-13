import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS,
  assessThresholdDwellingBuildLogic
} from './index.js';

describe('Threshold Dwelling build-logic review', () => {
  it('separates a coherent concept plan from construction readiness', () => {
    const assessment = assessThresholdDwellingBuildLogic();

    expect(assessment.schemaVersion).toBe('workway.design-logic-review.v1');
    expect(assessment.status).toBe('concept-logical-with-gates');
    expect(assessment.metrics).toMatchObject({
      footprintAreaSqFt: 2730,
      classifiedAreaSqFt: 2730,
      unclassifiedAreaSqFt: 0,
      overlappingZonePairIds: [],
      continuousCirculationBandDepthIn: 84,
      eastProjectionEnvelope: { widthIn: 120, depthIn: 324 },
      publicFacade: { openingWidthIn: 372, facadeWidthIn: 516 }
    });
    expect(assessment.metrics.publicFacade.linearOpeningRatio).toBeCloseTo(31 / 43, 8);
    expect(assessment.canFreezeArchitecturalPlan).toBe(false);
    expect(assessment.constructionReady).toBe(false);
  });

  it('does not let the 10 ft by 7 ft carport label resolve vehicle parking', () => {
    const assessment = assessThresholdDwellingBuildLogic();
    const carportFinding = assessment.findings.find(
      (finding) => finding.id === 'east-projection-vehicle-use'
    );

    expect(assessment.metrics.carportLabeledSegment).toEqual({
      widthIn: 120,
      depthIn: 84,
      areaSqFt: 70
    });
    expect(carportFinding).toMatchObject({
      status: 'owner-decision-required',
      severity: 'critical'
    });
    expect(assessment.ownerDecision.choices).toEqual([
      'reclassify-10-by-7-segment-as-non-vehicle-canopy',
      'select-a-separate-or-expanded-covered-parking-footprint'
    ]);
  });

  it('keeps glazing, egress, MEP, and jurisdiction behind their professional gates', () => {
    const assessment = assessThresholdDwellingBuildLogic();

    expect(assessment.missingProfessionalRequirementIds).toEqual(
      THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map((requirement) => requirement.id)
    );
    expect(assessment.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sleeping-suite-opening-intent',
          status: 'professional-determination-required'
        }),
        expect.objectContaining({
          id: 'mep-and-resilience-equipment-siting',
          status: 'professional-determination-required'
        }),
        expect.objectContaining({
          id: 'glazing-performance-and-structure',
          status: 'professional-determination-required'
        }),
        expect.objectContaining({
          id: 'professional-evidence-gates',
          severity: 'critical'
        })
      ])
    );
  });
});
