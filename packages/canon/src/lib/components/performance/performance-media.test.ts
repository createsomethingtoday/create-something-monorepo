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

  it('uses the natural water series for every shared operating condition', () => {
    expect(controlledFlowMedia.src).toMatch(/controlled-flow-natural\.webp$/);
    expect(pressureBoundaryMedia.src).toMatch(/pressure-boundary-natural\.webp$/);
    expect(traceControlPlaneMedia.src).toMatch(/trace-wake-natural\.webp$/);
    expect(controlledFlowMedia.alt).toContain('concrete sluice');
    expect(pressureBoundaryMedia.alt).toContain('concrete boundary');
    expect(traceControlPlaneMedia.alt).toContain('directional wake');
  });
});
