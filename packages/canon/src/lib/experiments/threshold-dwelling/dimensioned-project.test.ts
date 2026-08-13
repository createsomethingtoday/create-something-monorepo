import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  THRESHOLD_DWELLING_FLOOR_PLAN,
  THRESHOLD_DWELLING_PROFESSIONAL_DETERMINATION_REGISTER,
  THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS,
  assessThresholdDwellingProfessionalReview,
  validateThresholdDwellingDimensions
} from './index.js';

describe('Threshold Dwelling dimension candidate', () => {
  it('preserves the known plan as an inch-precise design-intent baseline', () => {
    const candidate = THRESHOLD_DWELLING_DIMENSION_CANDIDATE;
    const validation = validateThresholdDwellingDimensions(candidate);

    expect(candidate.status).toBe('candidate-design-intent');
    expect(candidate.source.revision).toBe('0.6');
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
    expect(
      ['window-daughter-suite', 'window-primary-bedroom', 'window-inlaw-suite'].every(
        (windowId) => {
          const window = candidate.windows.find((item) => item.id === windowId);
          return window && candidate.walls.find((wall) => wall.id === window.wallId)?.exterior;
        }
      )
    ).toBe(true);
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
        expect.objectContaining({ id: 'construction-evidence-not-supplied' }),
        expect.objectContaining({ id: 'sleeping-room-egress-not-specified' })
      ])
    );
  });

  it('creates a complete professional-review intake without claiming construction readiness', () => {
    const assessment = assessThresholdDwellingProfessionalReview(
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE
    );

    expect(assessment.constructionReady).toBe(false);
    expect(assessment.canRequestProfessionalDetermination).toBe(false);
    expect(assessment.missingRequirementIds).toEqual(
      THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map((requirement) => requirement.id)
    );
    expect(assessment.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'licensed-site-survey', status: 'missing' }),
        expect.objectContaining({ id: 'coordinated-architectural-package', status: 'missing' }),
        expect.objectContaining({ id: 'structural-and-wind-design', status: 'missing' }),
        expect.objectContaining({ id: 'mechanical-electrical-plumbing-design', status: 'missing' }),
        expect.objectContaining({ id: 'energy-compliance-package', status: 'missing' }),
        expect.objectContaining({ id: 'jurisdictional-determination', status: 'missing' })
      ])
    );
  });

  it('exposes a versioned register of unissued professional determinations', () => {
    const register = THRESHOLD_DWELLING_PROFESSIONAL_DETERMINATION_REGISTER;

    expect(register.schemaVersion).toBe('workway.professional-review-packet.v1');
    expect(register.projectId).toBe(THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id);
    expect(register.projectRevision).toBe('0.6');
    expect(register.constructionReady).toBe(false);
    expect(register.determinations).toHaveLength(
      THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.length
    );
    expect(
      register.determinations.every((determination) => determination.status === 'notRequested')
    ).toBe(true);
  });

  it('permits a human determination request only after every review artifact is accepted', () => {
    const acceptedEvidence = THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map(
      (requirement) => ({
        requirementId: requirement.id,
        status: 'accepted' as const,
        documentId: `${requirement.id}-revision-01`,
        submittedBy: 'qualified professional',
        reviewedBy: 'project reviewer'
      })
    );
    const assessment = assessThresholdDwellingProfessionalReview(
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
      acceptedEvidence
    );

    expect(assessment.missingRequirementIds).toEqual([]);
    expect(assessment.canRequestProfessionalDetermination).toBe(true);
    expect(assessment.constructionReady).toBe(false);
  });

  it('does not treat an unreviewed document as accepted evidence', () => {
    const unreviewedEvidence = THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map(
      (requirement) => ({
        requirementId: requirement.id,
        status: 'accepted' as const,
        documentId: `${requirement.id}-revision-01`,
        submittedBy: 'unreviewed submitter'
      })
    );
    const assessment = assessThresholdDwellingProfessionalReview(
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
      unreviewedEvidence
    );

    expect(assessment.canRequestProfessionalDetermination).toBe(false);
    expect(assessment.missingRequirementIds).toHaveLength(
      THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.length
    );
    expect(assessment.requirements.every((requirement) => requirement.status === 'submitted')).toBe(
      true
    );
  });
});
