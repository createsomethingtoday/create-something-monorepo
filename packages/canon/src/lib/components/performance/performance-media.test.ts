import { describe, expect, it } from 'vitest';

import {
  controlledFlowMedia,
  pressureBoundaryMedia,
  traceControlPlaneMedia
} from './media';

describe('Performance media canon', () => {
  it('publishes responsive photographic studies instead of property-specific placeholder art', () => {
    const studies = [controlledFlowMedia, pressureBoundaryMedia, traceControlPlaneMedia];

    for (const study of studies) {
      expect(study.src).toMatch(/\.webp$/);
      expect(study.mobileSrc).toMatch(/-mobile\.webp$/);
      expect(study.alt).toMatch(/water/i);
      expect(study.src).not.toMatch(/og-image/i);
    }
  });
});
