import { describe, expect, it } from 'vitest';
import { fitViewportToBounds, normalizeWheelDelta, panViewport, zoomViewportAt } from './viewport';

describe('trackpad viewport navigation', () => {
  it('pans opposite the two-finger scroll delta without changing zoom', () => {
    expect(panViewport({ x: 80, y: -20, zoom: 1.5 }, 30, -12)).toEqual({ x: 50, y: -8, zoom: 1.5 });
  });

  it('normalizes pixel, line, and page wheel units to CSS pixels', () => {
    expect(normalizeWheelDelta(3, 0, 800)).toBe(3);
    expect(normalizeWheelDelta(3, 1, 800)).toBe(48);
    expect(normalizeWheelDelta(1, 2, 800)).toBe(800);
  });

  it('keeps the world point beneath the pointer fixed while zooming', () => {
    const pointer = { x: 420, y: 260 };
    const before = { x: 100, y: 20, zoom: 1 };
    const after = zoomViewportAt(before, pointer, 1.5);
    expect(after).toEqual({ x: -60, y: -100, zoom: 1.5 });
    expect((pointer.x - after.x) / after.zoom).toBe((pointer.x - before.x) / before.zoom);
    expect((pointer.y - after.y) / after.zoom).toBe((pointer.y - before.y) / before.zoom);
  });

  it('clamps cursor zoom to the supported 25–300% range', () => {
    expect(zoomViewportAt({ x: 0, y: 0, zoom: 2.9 }, { x: 0, y: 0 }, 2).zoom).toBe(3);
    expect(zoomViewportAt({ x: 0, y: 0, zoom: 0.3 }, { x: 0, y: 0 }, 0.1).zoom).toBe(0.25);
  });
});

describe('agent follow camera', () => {
  it('fits an offscreen artifact into the padded viewport without over-zooming', () => {
    const next = fitViewportToBounds(
      { x: 0, y: 0, zoom: 1 },
      { x: 2400, y: 1600, width: 320, height: 180 },
      { width: 1200, height: 800 }
    );
    expect(next).not.toEqual({ x: 0, y: 0, zoom: 1 });
    expect(next.zoom).toBeLessThanOrEqual(1.25);
    expect(2400 * next.zoom + next.x).toBeGreaterThanOrEqual(72);
    expect((2400 + 320) * next.zoom + next.x).toBeLessThanOrEqual(1128);
    expect(1600 * next.zoom + next.y).toBeGreaterThanOrEqual(72);
    expect((1600 + 180) * next.zoom + next.y).toBeLessThanOrEqual(728);
  });

  it('does not move when affected bounds are already comfortably visible', () => {
    const current = { x: 20, y: 10, zoom: 1 };
    expect(fitViewportToBounds(current, { x: 200, y: 160, width: 300, height: 180 }, { width: 1200, height: 800 })).toBe(current);
  });

  it('keeps the current viewport when extreme finite coordinates overflow derived bounds', () => {
    const current = { x: 20, y: 10, zoom: 1 };
    expect(fitViewportToBounds(current, { x: -Number.MAX_VALUE, y: 0, width: Infinity, height: 10 }, { width: 1200, height: 800 })).toBe(current);
  });
});
