import { describe, expect, it } from 'vitest';
import { replaceRunText, toggleRunMark, setRunLink } from './note-editing';
import { normalizeNoteContent, type NoteRun } from './note-content';

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
  it('keeps sequential typing bounded without crossing emphasis or link boundaries', () => {
    let current: NoteRun[] = [...runs];
    let text = 'Read proof today';
    for (const character of ' with additional detail'.repeat(12)) {
      text += character;
      current = replaceRunText(current, text);
      expect(current).toHaveLength(3);
      expect(current[1]).toEqual(runs[1]);
      expect(normalizeNoteContent({ blocks: [{ type: 'paragraph', runs: current }] })).not.toBeNull();
    }
    expect(current[2]).toEqual({ text: ' today' + ' with additional detail'.repeat(12), italic: true });
  });
  it('rejoins compatible runs when a selected mark or link is removed', () => {
    const plain = [{ text: 'A complete sentence' }];
    expect(toggleRunMark(toggleRunMark(plain, 2, 10, 'bold'), 2, 10, 'bold')).toEqual(plain);
    expect(setRunLink(setRunLink(plain, 2, 10, 'https://example.com'), 2, 10, '')).toEqual(plain);
  });
});
