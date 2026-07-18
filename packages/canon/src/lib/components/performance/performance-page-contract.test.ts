import { describe, expect, it } from 'vitest';

import { validatePerformancePageContract, type PerformancePageContract } from './index';

const landingContract: PerformancePageContract = {
  id: 'agency-home',
  archetype: 'landing',
  decision: 'Decide whether one workflow is ready to map.',
  chapters: [
    {
      id: 'opening',
      role: 'opening',
      purpose: 'Create the workflow-control question.'
    },
    {
      id: 'operating-stage',
      role: 'proof',
      purpose: 'Resolve the question with mapped operating evidence.'
    },
    {
      id: 'handoff',
      role: 'handoff',
      purpose: 'Offer the earned mapping action.'
    }
  ],
  primaryProof: {
    chapterId: 'operating-stage',
    description: 'A selectable Signal, Decision, and Proof artifact.'
  },
  handoff: {
    chapterId: 'handoff',
    action: 'Map one workflow'
  }
};

describe('validatePerformancePageContract', () => {
  it('accepts a sharp landing page with one decision, adjacent proof, and an earned handoff', () => {
    expect(validatePerformancePageContract(landingContract)).toEqual({
      ok: true,
      errors: [],
      budget: { minimum: 3, maximum: 5, actual: 3 }
    });
  });

  it('rejects duplicated introductions, proof detached from the declared spine, and excess chapters', () => {
    const result = validatePerformancePageContract({
      ...landingContract,
      chapters: [
        ...landingContract.chapters,
        {
          id: 'second-opening',
          role: 'orientation',
          purpose: 'Explain the same offer again.'
        },
        {
          id: 'extra-proof',
          role: 'proof',
          purpose: 'Repeat evidence in another presentation layer.'
        },
        {
          id: 'extra-section',
          role: 'body',
          purpose: 'Add another standalone chapter.'
        }
      ],
      primaryProof: {
        chapterId: 'missing-proof',
        description: 'An artifact outside the registered page spine.'
      }
    });

    expect(result.ok).toBe(false);
    expect(result.budget).toEqual({ minimum: 3, maximum: 5, actual: 6 });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'agency-home exceeds the landing chapter budget of 5 with 6 chapters.',
        'agency-home has 2 introduction chapters; combine them into one opening or orientation.',
        'agency-home primary proof references unknown chapter "missing-proof".'
      ])
    );
  });
});
