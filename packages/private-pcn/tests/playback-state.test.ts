import { describe, expect, it, vi } from 'vitest';
import { observePlayback } from '../src/lib/playback-state';
function fixture() {
  const media = new EventTarget();
  const tracks = Object.assign([], { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  Object.assign(media, { textTracks: tracks });
  const notify = { ready: vi.fn(), waiting: vi.fn(), failed: vi.fn(), captions: vi.fn() };
  return { media, tracks, notify, observe: observePlayback(media as HTMLVideoElement, notify) };
}
describe('native and HLS media readiness', () => {
  it('keeps preparation pending until playable and reports native failure', () => {
    const { media, notify, observe } = fixture();
    observe.prepare();
    expect(notify.waiting).toHaveBeenCalledOnce();
    expect(notify.ready).not.toHaveBeenCalled();
    media.dispatchEvent(new Event('canplay'));
    expect(notify.ready).toHaveBeenCalledOnce();
    media.dispatchEvent(new Event('error'));
    expect(notify.failed).toHaveBeenCalledOnce();
    observe.dispose();
  });
  it('offers recovery after stalled loading, cancels timers on readiness and disposal', () => {
    vi.useFakeTimers();
    const { media, notify, observe } = fixture();
    observe.prepare();
    vi.advanceTimersByTime(15000);
    expect(notify.failed).toHaveBeenCalledOnce();
    observe.prepare();
    media.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(15000);
    expect(notify.failed).toHaveBeenCalledOnce();
    observe.prepare();
    observe.dispose();
    vi.advanceTimersByTime(15000);
    expect(notify.failed).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it('reports only actual caption/subtitle tracks, never transcript or metadata as captions', () => {
    const { media, tracks, notify, observe } = fixture();
    media.dispatchEvent(new Event('loadedmetadata'));
    expect(notify.captions).toHaveBeenLastCalledWith([]);
    (tracks as any[]).push(
      { kind: 'metadata', label: 'Metadata' },
      { kind: 'subtitles', language: 'en', label: 'English' }
    );
    media.dispatchEvent(new Event('canplay'));
    expect(notify.captions).toHaveBeenLastCalledWith(['English']);
    observe.dispose();
  });
});
