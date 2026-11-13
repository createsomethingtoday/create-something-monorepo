import { describe, expect, it } from 'vitest';
import { getAccentColor, getDataColor, propertyAccents } from './theme.js';

describe('diagram palette ownership', () => {
 it('keeps the LTD first series visible on its owning work surface', () => {
  expect(getDataColor(0, 'ltd')).toContain('--color-performance-fg-primary');
  expect(getAccentColor('ltd')).not.toBe('#ffffff');
 });
 it('retains distinct property hues while blending with the owning foreground', () => {
  expect(new Set(Object.values(propertyAccents)).size).toBe(5);
  for (const property of ['io','space','agency','lms'] as const) {
   expect(getAccentColor(property)).toContain('color-mix');
   expect(getAccentColor(property)).toContain('--color-performance-fg-primary');
  }
 });
 it('retains the cycling series API', () => {
  expect(getDataColor(1)).toBe(getDataColor(7));
 });
});
