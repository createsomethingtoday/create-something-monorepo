import { afterEach, expect, it, vi } from 'vitest';
import type Hls from 'hls.js';
import { createPlaybackSession, type PlaybackState } from '../src/lib/playback-session';

const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
afterEach(() => vi.useRealTimers());

function fixture(mse = true, native = 'maybe') {
  vi.useFakeTimers();
  const track = { kind: 'subtitles', language: 'en', label: 'English', mode: 'disabled' };
  const video = Object.assign(new EventTarget(), {
    currentTime: 0,
    paused: true,
    ended: false,
    src: '',
    canPlayType: () => native,
    textTracks: Object.assign([track], { addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    removeAttribute: vi.fn()
  });
  const attachMedia = vi.fn();
  const loadSource = vi.fn();
  class TestHls {
    static isSupported = () => mse;
    static Events = { ERROR: 'error' };
    constructor(private config: { subtitlePreference?: { lang?: string } }) {}
    attachMedia = (media: unknown) => {
      attachMedia(media);
      track.mode = this.config.subtitlePreference?.lang === 'en' ? 'showing' : 'disabled';
    };
    loadSource = loadSource;
    on = vi.fn();
    destroy = vi.fn();
  }
  const loadHls = vi.fn().mockResolvedValue(TestHls as unknown as typeof Hls);
  const state: PlaybackState = {
    failed: false,
    message: '',
    progressError: false,
    captionLabels: null
  };
  const session = createPlaybackSession(video as unknown as HTMLVideoElement, state, {
    initialPosition: 0,
    duration: 100,
    saveProgress: false,
    fetchGrant: vi.fn().mockResolvedValue({ hlsUrl: 'signed-manifest' }),
    savePosition: vi.fn(),
    onFirstPlay: vi.fn(),
    pageEvents: new EventTarget(),
    loadHls
  });
  return { video, track, state, session, loadHls, attachMedia, loadSource };
}

it('exposes the caption-capable Hls.js path when native HLS is also advertised', async () => {
  const f = fixture();
  await settle();
  expect(f.loadHls).toHaveBeenCalledOnce();
  expect(f.attachMedia).toHaveBeenCalledWith(f.video);
  expect(f.loadSource).toHaveBeenCalledWith('signed-manifest');
  expect(f.video.src).toBe('');
  f.session.dispose();
});

it('keeps the selected caption language through a signed-source renewal', async () => {
  const f = fixture();
  await settle();
  f.track.mode = 'showing';
  f.video.dispatchEvent(new Event('loadedmetadata'));
  f.video.dispatchEvent(new Event('canplay'));
  await vi.advanceTimersByTimeAsync(45000);
  expect(f.attachMedia).toHaveBeenCalledTimes(2);
  expect(f.track.mode).toBe('showing');
  f.session.dispose();
});

it('retains native HLS when MSE is unavailable', async () => {
  const f = fixture(false);
  await settle();
  expect(f.video.src).toBe('signed-manifest');
  expect(f.attachMedia).not.toHaveBeenCalled();
  f.session.dispose();
});

it('reports an unsupported browser when neither playback path is available', async () => {
  const f = fixture(false, '');
  await settle();
  expect(f.state.failed).toBe(true);
  expect(f.state.message).toContain('This browser cannot play');
  expect(f.attachMedia).not.toHaveBeenCalled();
  f.session.dispose();
});
