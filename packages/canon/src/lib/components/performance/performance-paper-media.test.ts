import { describe, expect, it } from 'vitest';

import { performancePaperStudies } from './media';

describe('Performance Paper material canon', () => {
  it('publishes the approved Paper media treatment for every public property role', () => {
    const expected = {
      ltd: 'source',
      io: 'trace',
      space: 'score',
      agency: 'pressure',
      learn: 'sequence'
    } as const;

    expect(Object.keys(performancePaperStudies)).toEqual(Object.keys(expected));

    for (const [property, condition] of Object.entries(expected)) {
      const study = performancePaperStudies[property as keyof typeof expected];

      expect(study.material).toBe('paper');
      expect(study.condition).toBe(condition);
      expect(study.mobileSrc).not.toBe(study.src);
      expect(study.alt).toMatch(/paper/i);
      expect(study.alt.length).toBeGreaterThan(40);
      expect(decodeURIComponent(study.src)).not.toMatch(/water|wake|flow/i);

      if (property === 'agency') {
        expect(study.src).toMatch(/^data:image\/svg\+xml/);
        expect(study.mobileSrc).toMatch(/^data:image\/svg\+xml/);
        expect('studioShot' in study ? study.studioShot : undefined).toBe('agency');
        continue;
      }

      expect(study.src).toMatch(/\.webp(?:\?.*)?$/);
      expect(study.mobileSrc).toMatch(/\.webp(?:\?.*)?$/);
      expect(study.width).toBe(1536);
      expect(study.height).toBe(1024);
      expect('studioShot' in study ? study.studioShot : undefined).toBeUndefined();
      expect('paperObjectVisible' in study ? study.paperObjectVisible : undefined).toBe(true);
    }
  });
});
