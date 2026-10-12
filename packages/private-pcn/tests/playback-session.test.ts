import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSession, type PlaybackState } from '../src/lib/playback-session';
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function fixture(fetchGrant = vi.fn().mockResolvedValue({ hlsUrl: 'synthetic-hls' })) {
  vi.useFakeTimers();
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    paused: true,
    src: '',
    textTracks: Object.assign([], { addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    canPlayType: () => 'probably',
    play: async () => {
      video.paused = false;
      video.dispatchEvent(new Event('play'));
    },
    pause: () => {
      video.paused = true;
      video.dispatchEvent(new Event('pause'));
    },
    removeAttribute: () => {
      video.src = '';
      video.currentTime = 0;
      video.dispatchEvent(new Event('timeupdate'));
    }
  });
  const state: PlaybackState = {
    failed: false,
    message: 'Preparing playback…',
    progressError: false,
    captionLabels: null
  };
  const savePosition = vi.fn().mockResolvedValue(undefined);
  const session = createPlaybackSession(video as unknown as HTMLVideoElement, state, {
    initialPosition: 42,
    duration: 120,
    saveProgress: true,
    pathId: 'chosen',
    fetchGrant,
    savePosition,
    onFirstPlay: vi.fn(),
    pageEvents: new EventTarget()
  });
  const ready = () => {
    video.dispatchEvent(new Event('loadedmetadata'));
    video.dispatchEvent(new Event('canplay'));
  };
  return { video, state, session, fetchGrant, savePosition, ready };
}
afterEach(() => vi.useRealTimers());
describe('player session recovery without provider calls', () => {
  it('retains the saved resume position when initial grant fails then retries', async () => {
    const grants = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue({ hlsUrl: 'synthetic' });
    const f = fixture(grants);
    await settle();
    expect(f.state.failed).toBe(true);
    f.session.retry();
    await settle();
    f.ready();
    expect(f.video.currentTime).toBe(42);
    expect(f.state.failed).toBe(false);
    f.session.dispose();
  });
  it('retains current position when failed renewal tears down the source', async () => {
    const grants = vi
      .fn()
      .mockResolvedValueOnce({ hlsUrl: 'synthetic' })
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValue({ hlsUrl: 'retry' });
    const f = fixture(grants);
    await settle();
    f.ready();
    await f.video.play();
    f.video.currentTime = 73;
    f.video.dispatchEvent(new Event('timeupdate'));
    await vi.advanceTimersByTimeAsync(45000);
    expect(f.state.failed).toBe(true);
    expect(f.video.currentTime).toBe(0);
    f.session.retry();
    await settle();
    f.ready();
    expect(f.video.currentTime).toBe(73);
    f.session.dispose();
  });
  it('restores saving and renewal when media recovers from a long stall', async () => {
    const f = fixture();
    await settle();
    f.ready();
    await f.video.play();
    f.video.dispatchEvent(new Event('waiting'));
    await vi.advanceTimersByTimeAsync(15000);
    expect(f.state.failed).toBe(true);
    f.video.dispatchEvent(new Event('playing'));
    expect(f.state.failed).toBe(false);
    expect(f.state.message).toBe('');
    f.video.currentTime = 60;
    f.video.dispatchEvent(new Event('timeupdate'));
    f.video.pause();
    await settle();
    expect(f.savePosition).toHaveBeenCalledWith(60, 'chosen');
    await vi.advanceTimersByTimeAsync(45000);
    expect(f.fetchGrant).toHaveBeenCalledTimes(2);
    f.session.dispose();
  });
  it('ignores a grant arriving after disposal', async () => {
    let resolve!: (grant: { hlsUrl: string }) => void;
    const f = fixture(
      vi.fn().mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      )
    );
    f.session.dispose();
    resolve({ hlsUrl: 'late' });
    await settle();
    expect(f.video.src).toBe('');
  });
});
