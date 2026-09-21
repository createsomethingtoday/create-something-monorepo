import { describe, expect, it, vi } from 'vitest';
import { createHeroPlayback, type HeroPlaybackState } from './hero-playback';

class Media extends EventTarget {
  src = '';
  currentTime = 0;
  getAttribute() {
    return this.src || null;
  }
  load = vi.fn();
  pause = vi.fn(() => this.dispatchEvent(new Event('pause')));
  play = vi.fn(() => {
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  });
}
function setup(reduced = false) {
  const media = new Media();
  let state: HeroPlaybackState;
  const player = createHeroPlayback(
    media as unknown as HTMLVideoElement,
    '/hero.mp4',
    (next) => (state = next)
  );
  player.setReducedMotion(reduced);
  player.setPageVisible(true);
  return { media, player, state: () => state! };
}

describe('hero playback policy', () => {
  it('defers media loading until visible, plays once, and only replays on request', async () => {
    const { media, player, state } = setup();
    expect(media.src).toBe('');
    player.setVisible(true);
    await Promise.resolve();
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(state().playing).toBe(true);
    media.dispatchEvent(new Event('ended'));
    player.setVisible(false);
    player.setVisible(true);
    expect(media.play).toHaveBeenCalledTimes(1);
    expect(state().ended).toBe(true);
    media.currentTime = 14;
    player.toggle();
    expect(media.currentTime).toBe(0);
    expect(media.play).toHaveBeenCalledTimes(2);
    player.destroy();
  });
  it('keeps reduced motion static without downloading video, with explicit opt-in', async () => {
    const { media, player, state } = setup(true);
    player.setVisible(true);
    expect(media.src).toBe('');
    expect(media.play).not.toHaveBeenCalled();
    player.toggle();
    await Promise.resolve();
    expect(state().playing).toBe(true);
    player.setReducedMotion(false);
    player.setReducedMotion(true);
    expect(state().playing).toBe(false);
    player.setVisible(false);
    player.setVisible(true);
    expect(media.play).toHaveBeenCalledTimes(1);
    player.destroy();
  });
  it('resumes environmental pauses but preserves an explicit pause', async () => {
    const { media, player, state } = setup();
    player.setVisible(true);
    await Promise.resolve();
    player.setPageVisible(false);
    expect(state().playing).toBe(false);
    player.setPageVisible(true);
    await Promise.resolve();
    expect(media.play).toHaveBeenCalledTimes(2);
    player.setVisible(false);
    expect(state().playing).toBe(false);
    player.setVisible(true);
    await Promise.resolve();
    expect(media.play).toHaveBeenCalledTimes(3);
    player.toggle();
    player.setPageVisible(false);
    player.setPageVisible(true);
    player.setVisible(false);
    player.setVisible(true);
    expect(media.play).toHaveBeenCalledTimes(3);
    expect(state().requested).toBe(false);
    player.destroy();
  });
  it('offers manual play after autoplay rejection without retrying on visibility changes', async () => {
    const { media, player, state } = setup();
    media.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    player.setVisible(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(state().requested).toBe(false);
    expect(state().started).toBe(false);
    player.setVisible(false);
    player.setVisible(true);
    expect(media.play).toHaveBeenCalledTimes(1);
    player.toggle();
    expect(media.play).toHaveBeenCalledTimes(2);
    player.destroy();
  });
  it('stops a late playing event after a pending request is paused', async () => {
    const { media, player, state } = setup();
    let resolve!: () => void;
    media.play.mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
    player.setVisible(true);
    player.toggle();
    media.dispatchEvent(new Event('playing'));
    resolve();
    await Promise.resolve();
    expect(state().playing).toBe(false);
    expect(state().requested).toBe(false);
    player.destroy();
  });
  it('returns to the poster on failure and removes listeners on disposal', async () => {
    const { media, player, state } = setup();
    player.setVisible(true);
    await Promise.resolve();
    media.dispatchEvent(new Event('error'));
    expect(state().failed).toBe(true);
    expect(state().playing).toBe(false);
    player.toggle();
    expect(media.play).toHaveBeenCalledTimes(1);
    player.destroy();
    media.dispatchEvent(new Event('playing'));
    expect(state().playing).toBe(false);
  });
});
