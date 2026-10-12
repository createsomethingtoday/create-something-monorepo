import { playbackResumePosition } from './learning';
import { observePlayback } from './playback-state';
import type Hls from 'hls.js';
export interface PlaybackState {
  failed: boolean;
  message: string;
  progressError: boolean;
  captionLabels: string[] | null;
}
export function createPlaybackSession(
  element: HTMLVideoElement,
  state: PlaybackState,
  options: {
    initialPosition: number;
    duration: number;
    saveProgress: boolean;
    pathId?: string;
    fetchGrant: () => Promise<{ hlsUrl: string }>;
    savePosition: (position: number, pathId?: string) => Promise<void>;
    onFirstPlay: (resumed: boolean) => void;
    pageEvents: EventTarget;
    loadHls?: () => Promise<typeof Hls>;
  }
) {
  const {
    initialPosition,
    duration,
    saveProgress,
    pathId,
    fetchGrant,
    savePosition,
    onFirstPlay,
    pageEvents
  } = options;
  const loadHls = options.loadHls ?? (async () => (await import('hls.js')).default);

  let hls: import('hls.js').default | undefined;
  let stopped = false;
  let renewing = false;
  let requestNumber = 0;
  let seekOnMetadata: (() => void) | undefined;
  let started = false;
  let recoveryPosition = playbackResumePosition(initialPosition, duration);
  let lastPosition = initialPosition;
  let pending: number | undefined;
  let writing = false;
  const resume = playbackResumePosition(initialPosition, duration);
  async function flush() {
    if (!saveProgress || !started || renewing || !duration || state.failed) return;
    const position = Math.min(duration, Math.max(0, element.currentTime));
    if (!Number.isFinite(position) || Math.abs(position - lastPosition) < 1) return;
    pending = position;
    if (writing) return;
    writing = true;
    while (pending !== undefined) {
      const value = pending;
      pending = undefined;
      try {
        await savePosition(value, pathId);
        lastPosition = value;
        state.progressError = false;
      } catch {
        state.progressError = true;
        pending = undefined;
        break;
      }
    }
    writing = false;
  }
  function played() {
    if (!started) {
      started = true;
      onFirstPlay(!!resume);
    }
  }
  function rememberPosition() {
    if (started && !renewing && !state.failed && Number.isFinite(element.currentTime))
      recoveryPosition = element.currentTime;
  }
  function metadata() {
    renewing = false;
  }
  element.addEventListener('play', played);
  element.addEventListener('timeupdate', rememberPosition);
  element.addEventListener('loadedmetadata', metadata);
  element.addEventListener('pause', flush);
  element.addEventListener('ended', flush);
  pageEvents.addEventListener('pagehide', flush);
  const progressTimer = setInterval(flush, 15000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observation = observePlayback(element, {
    ready: () => {
      state.failed = false;
      state.message = '';
      if (!timer && !stopped) timer = setTimeout(() => load(true), 45000);
    },
    waiting: () => {
      if (!state.failed) state.message = 'Preparing playback…';
    },
    failed: () => {
      state.failed = true;
      state.message = 'Playback was interrupted. Retry playback to check access and continue.';
      clearTimeout(timer);
      timer = undefined;
    },
    captions: (labels) => {
      state.captionLabels = labels;
    }
  });
  async function load(renew = false) {
    const request = ++requestNumber;
    clearTimeout(timer);
    timer = undefined;
    const position = renew ? recoveryPosition : resume;
    const playing = renew && !element.paused;
    if (!renew || state.failed) {
      state.failed = false;
      state.captionLabels = null;
      observation.prepare();
    }
    try {
      const grant = await fetchGrant();
      if (stopped || request !== requestNumber) return;
      renewing = true;
      if (element.canPlayType('application/vnd.apple.mpegurl')) {
        if (seekOnMetadata) element.removeEventListener('loadedmetadata', seekOnMetadata);
        seekOnMetadata = () => {
          if (!stopped && request === requestNumber) element.currentTime = position;
        };
        element.addEventListener('loadedmetadata', seekOnMetadata, { once: true });
        element.src = grant.hlsUrl;
      } else {
        const Hls = await loadHls();
        if (stopped || request !== requestNumber) return;
        if (!Hls.isSupported())
          throw new Error('This browser cannot play this video. Try a current browser.');
        hls?.destroy();
        hls = new Hls({ startPosition: position });
        hls.loadSource(grant.hlsUrl);
        hls.attachMedia(element);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (stopped || request !== requestNumber) return;
          if (data.fatal) {
            observation.cancelWaiting();
            state.failed = true;
            state.message =
              'Playback was interrupted. Retry playback to check access and continue.';
            clearTimeout(timer);
            timer = undefined;
          }
        });
      }
      // canplay/playing, not grant receipt, confirms media readiness.
      if (playing) await element.play().catch(() => {});
      if (stopped || request !== requestNumber || state.failed) return;
      if (!timer) timer = setTimeout(() => load(true), 45000);
    } catch (e) {
      if (stopped || request !== requestNumber) return;
      observation.cancelWaiting();
      state.failed = true;
      state.message = (e as Error).message;
      element.pause();
      element.removeAttribute('src');
      hls?.destroy();
    }
  }
  void load();
  return {
    retry: () => {
      void load(true);
    },
    dispose: () => {
      void flush();
      clearInterval(progressTimer);
      element.removeEventListener('play', played);
      element.removeEventListener('timeupdate', rememberPosition);
      element.removeEventListener('loadedmetadata', metadata);
      element.removeEventListener('pause', flush);
      element.removeEventListener('ended', flush);
      pageEvents.removeEventListener('pagehide', flush);
      stopped = true;
      requestNumber++;
      observation.dispose();
      if (seekOnMetadata) element.removeEventListener('loadedmetadata', seekOnMetadata);
      clearTimeout(timer);
      timer = undefined;
      hls?.destroy();
    }
  };
}
