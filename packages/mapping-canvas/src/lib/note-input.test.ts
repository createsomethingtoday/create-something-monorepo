import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNoteInputBuffer } from './note-input';

describe('note input buffer', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps keystrokes local and coalesces background document updates', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string]> = [];
    const buffer = createNoteInputBuffer((id, text) => commits.push([id, text]), 80);

    buffer.schedule('note-1', 'B');
    buffer.schedule('note-1', 'Bu');
    buffer.schedule('note-1', 'But');

    expect(buffer.hasPending()).toBe(true);
    expect(commits).toEqual([]);
    vi.advanceTimersByTime(79);
    expect(commits).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(commits).toEqual([['note-1', 'But']]);
    expect(buffer.hasPending()).toBe(false);
  });

  it('flushes the latest text immediately when editing ends', () => {
    vi.useFakeTimers();
    const commits: Array<[string, string]> = [];
    const buffer = createNoteInputBuffer((id, text) => commits.push([id, text]), 80);

    buffer.schedule('note-1', 'Instant note');
    buffer.flush('note-1');
    vi.runAllTimers();

    expect(commits).toEqual([['note-1', 'Instant note']]);
    expect(buffer.hasPending()).toBe(false);
  });
});
