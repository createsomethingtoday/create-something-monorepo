import { describe, expect, it } from 'vitest';
import {
  getPerformancePaperShot,
  performancePaperShots,
  performancePaperStudioTokens
} from './paper-studio';

describe('Performance Paper Studio', () => {
  it('authors one distinct shot for every public property', () => {
    expect(Object.keys(performancePaperShots)).toEqual(['agency', 'io', 'space', 'ltd', 'learn']);
    expect(new Set(Object.values(performancePaperShots).map((shot) => shot.composition)).size).toBe(
      5
    );
    expect(getPerformancePaperShot('agency').narrative).toContain('handoff');
    expect(getPerformancePaperShot('learn').narrative).toContain('workbook');
  });

  it('uses explicit studio cameras and protected copy zones', () => {
    for (const shot of Object.values(performancePaperShots)) {
      for (const frame of [shot.camera.desktop, shot.camera.mobile]) {
        expect(frame.focalLength).toBeGreaterThanOrEqual(40);
        expect(frame.focalLength).toBeLessThanOrEqual(60);
        expect(frame.position).toHaveLength(3);
        expect(frame.target).toHaveLength(3);
        expect(frame.safeZone).toMatchObject({ copy: 'left', object: 'right' });
      }
    }
  });

  it('maps material and instrumentation only to Performance tokens', () => {
    expect(performancePaperStudioTokens).toEqual({
      panel: '--color-performance-panel',
      paper: '--color-performance-paper',
      edge: '--color-performance-paper-edge',
      fold: '--color-performance-paper-fold',
      shadow: '--color-performance-paper-shadow',
      ink: '--color-performance-ink',
      signal: '--color-performance-signal',
      pressure: '--color-performance-pressure',
      growth: '--color-performance-growth',
      risk: '--color-performance-risk'
    });

    for (const shot of Object.values(performancePaperShots)) {
      expect(
        Object.values(shot.tokens).every((token) => token.startsWith('--color-performance-'))
      ).toBe(true);
      expect(shot.material.metalness).toBe(0);
      expect(shot.material.roughness).toBeGreaterThanOrEqual(0.78);
      expect(shot.material.thickness).toBeGreaterThan(0);
    }
  });

  it('keeps the shared renderer inside a declared production budget', () => {
    for (const shot of Object.values(performancePaperShots)) {
      expect(shot.budget.drawCalls).toBeLessThanOrEqual(18);
      expect(shot.budget.geometries).toBeLessThanOrEqual(20);
      expect(shot.budget.textures).toBeLessThanOrEqual(4);
      expect(shot.budget.perFrameNormalRecomputes).toBe(0);
    }
  });
});
