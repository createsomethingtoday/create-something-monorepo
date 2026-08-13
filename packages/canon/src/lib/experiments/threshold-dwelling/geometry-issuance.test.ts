import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
  assessThresholdDwellingPhysicalSceneIssuance
} from './geometry-issuance.js';

describe('Threshold Dwelling physical scene issuance', () => {
  it('blocks a physical 1:1 scene until vertical geometry has accepted, traceable evidence', () => {
    const issuance = THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE;
    const assessment = assessThresholdDwellingPhysicalSceneIssuance(issuance);

    expect(issuance.schemaVersion).toBe('workway.physical-scene-issuance.v1');
    expect(issuance.id).toBe('threshold-dwelling-rev-0.8-physical-scene-gate');
    expect(assessment.physicalSceneStatus).toBe('blocked-vertical-geometry-unissued');
    expect(assessment.canGeneratePhysicalOneToOneScene).toBe(false);
    expect(assessment.constructionReady).toBe(false);
    expect(assessment.unissuedFactIds).toEqual(issuance.facts.map((fact) => fact.id));
  });

  it('requires source, verifier, and value even after a fact is marked accepted', () => {
    const issuance = {
      ...THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
      facts: THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE.facts.map((fact) => ({
        ...fact,
        evidenceStatus: 'accepted' as const,
        sourceDocumentId: 'architectural-set-r1',
        verifiedBy: 'Licensed design professional',
        value: 'issued'
      }))
    };

    const invalid = {
      ...issuance,
      facts: issuance.facts.map((fact) =>
        fact.id === 'window-and-glass-opening-geometry'
          ? { ...fact, sourceDocumentId: null }
          : fact
      )
    };

    expect(assessThresholdDwellingPhysicalSceneIssuance(issuance).canGeneratePhysicalOneToOneScene).toBe(true);
    expect(assessThresholdDwellingPhysicalSceneIssuance(invalid).unissuedFactIds).toEqual([
      'window-and-glass-opening-geometry'
    ]);
  });
});
