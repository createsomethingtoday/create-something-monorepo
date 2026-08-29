import { withObjects, type CanvasDocument, type CanvasObject } from './document';

export const DRAWING_COLOR_PREFERENCE = 'create-something-mapping-canvas:drawing-color';

export const DRAWING_PALETTE = [
  { id: 'chalk', label: 'Chalk', token: '--color-performance-editorial-light', value: '#f3ebe4' },
  { id: 'amber', label: 'Amber', token: '--color-performance-editorial-brand', value: '#fcaa2d' },
  { id: 'signal', label: 'Signal', token: '--color-performance-signal', value: '#0057b8' },
  { id: 'growth', label: 'Growth', token: '--color-performance-growth', value: '#007a4d' },
  { id: 'risk', label: 'Risk', token: '--color-performance-risk', value: '#c62026' }
] as const;

export type DrawingColor = (typeof DRAWING_PALETTE)[number]['value'];
export const DEFAULT_DRAWING_COLOR: DrawingColor = DRAWING_PALETTE[0].value;

export function isDrawingColor(value: unknown): value is DrawingColor {
  return typeof value === 'string' && DRAWING_PALETTE.some((entry) => entry.value === value.toLowerCase());
}

export function isColorableObject(object: CanvasObject): object is Extract<CanvasObject, { color: string }> {
  return object.kind === 'stroke' || object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow';
}

export function recolorObjects(document: CanvasDocument, selectedIds: string[], color: DrawingColor): CanvasDocument {
  const selected = new Set(selectedIds);
  let changed = false;
  const objects = document.objects.map((object) => {
    if (!selected.has(object.id) || !isColorableObject(object) || object.color.toLowerCase() === color) return object;
    changed = true;
    return { ...object, color };
  });
  return changed ? withObjects(document, objects) : document;
}

