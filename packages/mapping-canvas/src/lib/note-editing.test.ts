import { describe, expect, it } from 'vitest';
import { replaceRunText, toggleRunMark, setRunLink } from './note-editing';

describe('note authoring without flattening existing marks', () => {
  const runs = [{ text: 'Read ' }, { text: 'proof', bold: true as const, link: 'https://example.com' }, { text: ' today', italic: true as const }];
  it('retains marks and links outside an edited range', () => {
    expect(replaceRunText(runs, 'Read proof tomorrow')).toEqual([{ text: 'Read ' }, { text: 'proof', bold: true, link: 'https://example.com' }, { text: ' tomorrow', italic: true }]);
  });
  it('toggles marks only within selected words and preserves links', () => {
    const next = toggleRunMark(runs, 5, 10, 'italic');
    expect(next[1]).toEqual({ text: 'proof', bold: true, italic: true, link: 'https://example.com' });
    expect(toggleRunMark(next, 5, 10, 'italic')).toEqual(runs);
  });
  it('adds or removes links without losing emphasis', () => {
    expect(setRunLink(runs, 5, 10, '')[1]).toEqual({ text: 'proof', bold: true });
  });
  it('allows full replacement and deletion while keeping a valid empty block', () => {
    expect(replaceRunText(runs, '')).toEqual([{ text: ' ' }]);
    expect(replaceRunText([{ text: 'old', bold: true }], 'new')).toEqual([{ text: 'new', bold: true }]);
  });
});
