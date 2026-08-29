import { describe, expect, it } from 'vitest';
import { createDocument, parse, serialize, withObjects, type CanvasObject, type Stroke } from './document';
import { DEFAULT_DRAWING_COLOR, DRAWING_PALETTE, isColorableObject, isDrawingColor, recolorObjects } from './palette';

const createdAt = '2026-08-28T00:00:00Z';
const objects: CanvasObject[] = [
  { id: 'stroke', kind: 'stroke', createdAt, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: DEFAULT_DRAWING_COLOR, width: 3 },
  { id: 'shape', kind: 'rectangle', createdAt, from: { x: 20, y: 20 }, to: { x: 60, y: 60 }, color: DEFAULT_DRAWING_COLOR },
  { id: 'note', kind: 'note', createdAt, x: 80, y: 80, width: 240, height: 120, text: 'Keep me neutral' },
  { id: 'group', kind: 'group', createdAt, x: 0, y: 0, width: 360, height: 240, label: 'Structure', childIds: ['stroke', 'shape'] },
  { id: 'connector', kind: 'connector', createdAt, fromId: 'stroke', toId: 'shape', label: '' }
];

describe('mapping canvas drawing palette', () => {
  it('uses the five approved Performance and Meridian-aligned tokens', () => {
    expect(DRAWING_PALETTE).toEqual([
      { id: 'chalk', label: 'Chalk', token: '--color-performance-editorial-light', value: '#f3ebe4' },
      { id: 'amber', label: 'Amber', token: '--color-performance-editorial-brand', value: '#fcaa2d' },
      { id: 'signal', label: 'Signal', token: '--color-performance-signal', value: '#0057b8' },
      { id: 'growth', label: 'Growth', token: '--color-performance-growth', value: '#007a4d' },
      { id: 'risk', label: 'Risk', token: '--color-performance-risk', value: '#c62026' }
    ]);
    expect(DEFAULT_DRAWING_COLOR).toBe('#f3ebe4');
    expect(DRAWING_PALETTE.every(({ value }) => isDrawingColor(value))).toBe(true);
    expect(isDrawingColor('#ffffff')).toBe(false);
  });

  it('limits recoloring to strokes and authored shapes', () => {
    expect(objects.map((object) => [object.kind, isColorableObject(object)])).toEqual([
      ['stroke', true], ['rectangle', true], ['note', false], ['group', false], ['connector', false]
    ]);
    const source = withObjects(createDocument(), objects);
    const recolored = recolorObjects(source, objects.map(({ id }) => id), '#007a4d');
    expect(recolored.objects.find(({ id }) => id === 'stroke')).toMatchObject({ color: '#007a4d' });
    expect(recolored.objects.find(({ id }) => id === 'shape')).toMatchObject({ color: '#007a4d' });
    expect(recolored.objects.find(({ id }) => id === 'note')).toEqual(objects[2]);
    expect(recolored.objects.find(({ id }) => id === 'group')).toEqual(objects[3]);
    expect(recolored.objects.find(({ id }) => id === 'connector')).toEqual(objects[4]);
  });

  it('is a no-op without an eligible color change and remains portable', () => {
    const source = withObjects(createDocument(), objects);
    expect(recolorObjects(source, ['note', 'group'], '#c62026')).toBe(source);
    expect(recolorObjects(source, ['stroke'], DEFAULT_DRAWING_COLOR)).toBe(source);
    const recolored = recolorObjects(source, ['stroke', 'shape'], '#0057b8');
    expect(parse(serialize(recolored))).toEqual(recolored);
  });

  it('accepts legacy documents with colors outside the current palette', () => {
    const legacy = withObjects(createDocument(), [{ ...(objects[0] as Stroke), color: '#f7f4ee' }]);
    expect(parse(serialize(legacy))).toEqual(legacy);
  });
});
