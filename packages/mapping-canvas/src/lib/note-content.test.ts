import { describe, expect, it } from 'vitest';
import { noteContentText, normalizeNoteContent, type NoteContent } from './note-content';

describe('formatted note content', () => {
  const content: NoteContent = { blocks: [
    { type: 'heading1', runs: [{ text: 'Decision', bold: true }] },
    { type: 'paragraph', runs: [{ text: 'Read ' }, { text: 'the proof', italic: true, underline: true, link: 'https://example.com/proof' }] },
    { type: 'bullet', runs: [{ text: 'Ship safely', code: true }] },
    { type: 'quote', runs: [{ text: 'Policy is an artifact.' }] }
  ] };

  it('validates a bounded AST and produces its exact plain-text projection', () => {
    expect(normalizeNoteContent(content)).toEqual(content);
    expect(noteContentText(content)).toBe('Decision\nRead the proof\n• Ship safely\n“Policy is an artifact.”');
  });

  it('rejects unsafe links, unknown fields, empty runs, and oversized structures', () => {
    expect(normalizeNoteContent({ blocks: [{ type: 'paragraph', runs: [{ text: 'bad', link: 'javascript:alert(1)' }] }] })).toBeNull();
    expect(normalizeNoteContent({ blocks: [{ type: 'paragraph', runs: [{ text: 'x', color: 'red' }] }] })).toBeNull();
    expect(normalizeNoteContent({ blocks: [{ type: 'paragraph', runs: [] }] })).toBeNull();
    expect(normalizeNoteContent({ blocks: Array.from({ length: 101 }, () => ({ type: 'paragraph', runs: [{ text: 'x' }] })) })).toBeNull();
  });
});
