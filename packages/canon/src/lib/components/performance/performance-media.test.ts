import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
    expect(controlledFlowMedia.alt).toContain('concrete performance boundary');
    expect(pressureBoundaryMedia.alt).toContain('concrete boundary');
    expect(traceControlPlaneMedia.alt).toContain('directional wake');
    expect(controlledFlowMedia.condition).toBe('flow');
    expect(pressureBoundaryMedia.condition).toBe('pressure');
    expect(traceControlPlaneMedia.condition).toBe('trace');
  });

  it('publishes the controlled-flow hero as static-first progressive video media', () => {
    expect(controlledFlowMedia.video?.mp4).toMatch(/controlled-flow-motion\.mp4$/);
    expect(controlledFlowMedia.video?.webm).toMatch(/controlled-flow-motion\.webm$/);
    expect(controlledFlowMedia.video?.poster).toMatch(/controlled-flow-motion-poster\.webp$/);
    expect(controlledFlowMedia.src).toMatch(/controlled-flow-natural\.webp$/);
  });

  it('binds the controlled-flow assets to a measured seamless-loop receipt', () => {
    const receipt = JSON.parse(
      readFileSync(new URL('./media/controlled-flow-loop-receipt.json', import.meta.url), 'utf8')
    ) as {
      assets: Record<string, { sha256: string; seamToP95: number }>;
    };

    for (const fileName of ['controlled-flow-motion.mp4', 'controlled-flow-motion.webm']) {
      const bytes = readFileSync(new URL(`./media/${fileName}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.assets[fileName].sha256);
      expect(receipt.assets[fileName].seamToP95).toBeLessThanOrEqual(1);
    }
  });
});
