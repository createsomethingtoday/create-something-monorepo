import { describe, expect, it } from 'vitest';
import { playbackProgressLabel, playbackResumePosition } from '../src/lib/learning';

describe('saved playback action matches the player destination', () => {
  it.each([
    [0, 130, 'Play', 0],
    [42, 130, 'Resume at 0:42', 42],
    [127.9, 130, 'Resume at 2:07', 127.9],
    [128, 130, 'Replay', 0],
    [130, 130, 'Replay', 0],
    [140, 130, 'Replay', 0],
    [0, 1, 'Play', 0],
    [1, 1, 'Replay', 0],
    [42, null, 'Play', 0]
  ])('position %s, duration %s offers %s', (position, duration, label, resume) => {
    expect(playbackProgressLabel(position as number, duration as number | null)).toBe(label);
    expect(playbackResumePosition(position as number, (duration as number | null) ?? 0)).toBe(
      resume
    );
  });
});
