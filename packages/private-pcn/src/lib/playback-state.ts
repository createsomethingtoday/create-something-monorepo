/** Observe actual media readiness for native HLS and hls.js alike. No provider calls. */
export function observePlayback(
  media: HTMLVideoElement,
  notify: {
    ready: () => void;
    waiting: () => void;
    failed: () => void;
    captions: (labels: string[]) => void;
  }
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const captions = () => {
    const labels = Array.from(media.textTracks)
      .filter((track) => track.kind === 'captions' || track.kind === 'subtitles')
      .map((track) => track.label || track.language || 'Unlabelled track');
    notify.captions(labels);
  };
  const failed = () => {
    clearTimeout(timer);
    notify.failed();
  };
  const waiting = () => {
    clearTimeout(timer);
    // Native HLS can emit waiting at the end of the final segment.
    if (media.ended) return ready();
    notify.waiting();
    timer = setTimeout(failed, 15000);
  };
  const ready = () => {
    clearTimeout(timer);
    captions();
    notify.ready();
  };
  const events = {
    canplay: ready,
    playing: ready,
    ended: ready,
    waiting,
    stalled: waiting,
    error: failed
  };
  for (const [event, handler] of Object.entries(events)) media.addEventListener(event, handler);
  media.addEventListener('loadedmetadata', captions);
  for (const event of ['addtrack', 'removetrack', 'change'])
    media.textTracks.addEventListener(event, captions);
  return {
    cancelWaiting() {
      clearTimeout(timer);
    },
    prepare() {
      if (!disposed) waiting();
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      for (const [event, handler] of Object.entries(events))
        media.removeEventListener(event, handler);
      media.removeEventListener('loadedmetadata', captions);
      for (const event of ['addtrack', 'removetrack', 'change'])
        media.textTracks.removeEventListener(event, captions);
    }
  };
}
