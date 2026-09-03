import type { Point, Viewport } from './document';

export const MIN_VIEWPORT_ZOOM = 0.25;
export const MAX_VIEWPORT_ZOOM = 3;
const FOLLOW_PADDING = 72;
const MAX_FOLLOW_ZOOM = 1.25;

export type Bounds = { x: number; y: number; width: number; height: number };
export type ViewportSize = { width: number; height: number };

export function normalizeWheelDelta(delta: number, mode: number, pageSize: number): number {
  if (mode === 1) return delta * 16;
  if (mode === 2) return delta * pageSize;
  return delta;
}

function clampZoom(value: number) {
  return Math.max(MIN_VIEWPORT_ZOOM, Math.min(MAX_VIEWPORT_ZOOM, value));
}

export function panViewport(viewport: Viewport, deltaX: number, deltaY: number): Viewport {
  return { ...viewport, x: viewport.x - deltaX, y: viewport.y - deltaY };
}

export function zoomViewportAt(viewport: Viewport, pointer: Point, scale: number): Viewport {
  const zoom = clampZoom(viewport.zoom * scale);
  const world = { x: (pointer.x - viewport.x) / viewport.zoom, y: (pointer.y - viewport.y) / viewport.zoom };
  return { x: pointer.x - world.x * zoom, y: pointer.y - world.y * zoom, zoom };
}

export function fitViewportToBounds(viewport: Viewport, bounds: Bounds, surface: ViewportSize): Viewport {
  if (![...Object.values(bounds), ...Object.values(surface)].every(Number.isFinite) || bounds.width < 0 || bounds.height < 0 || surface.width <= 0 || surface.height <= 0) return viewport;
  const left = bounds.x * viewport.zoom + viewport.x;
  const top = bounds.y * viewport.zoom + viewport.y;
  const right = (bounds.x + bounds.width) * viewport.zoom + viewport.x;
  const bottom = (bounds.y + bounds.height) * viewport.zoom + viewport.y;
  if (left >= FOLLOW_PADDING && top >= FOLLOW_PADDING && right <= surface.width - FOLLOW_PADDING && bottom <= surface.height - FOLLOW_PADDING) return viewport;

  const availableWidth = Math.max(1, surface.width - FOLLOW_PADDING * 2);
  const availableHeight = Math.max(1, surface.height - FOLLOW_PADDING * 2);
  const zoom = clampZoom(Math.min(MAX_FOLLOW_ZOOM, availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)));
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const next = { x: surface.width / 2 - center.x * zoom, y: surface.height / 2 - center.y * zoom, zoom };
  return Object.values(next).every(Number.isFinite) ? next : viewport;
}
