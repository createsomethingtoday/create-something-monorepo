export interface HeroPlaybackState {
  playing: boolean;
  requested: boolean;
  started: boolean;
  ended: boolean;
  failed: boolean;
}

/** One automatic play per mounted hero; explicit pause and reduced motion always win. */
export function createHeroPlayback(
  video: HTMLVideoElement,
  source: string,
  change: (state: HeroPlaybackState) => void
) {
  let visible = false;
  let pageVisible = false;
  let reduced = true;
  let optedIn = false;
  let attempted = false;
  let requested = false;
  let started = false;
  let playing = false;
  let ended = false;
  let failed = false;
  let pending = false;
  let disposed = false;
  let generation = 0;

  const publish = () => change({ playing, requested, started, ended, failed });
  const permitted = () =>
    !disposed && !failed && requested && visible && pageVisible && (!reduced || optedIn);
  function pause() {
    generation++;
    pending = false;
    playing = false;
    video.pause();
  }
  function sync() {
    if (disposed) return;
    if (visible && pageVisible && !reduced && !attempted && !failed) {
      attempted = true;
      requested = true;
    }
    if (!permitted()) {
      pause();
      publish();
      return;
    }
    if (pending || playing) return;
    if (!video.getAttribute('src')) {
      video.src = source;
      video.load();
    }
    pending = true;
    const request = ++generation;
    publish();
    // A rejected autoplay leaves a usable Play control; never retry automatically.
    void video
      .play()
      .then(() => {
        if (disposed || request !== generation) return;
        pending = false;
        if (!permitted()) pause();
        publish();
      })
      .catch(() => {
        if (disposed || request !== generation) return;
        pending = false;
        requested = false;
        playing = false;
        publish();
      });
  }
  function onPlaying() {
    if (!permitted()) {
      pause();
    } else {
      started = true;
      playing = true;
    }
    publish();
  }
  function onPause() {
    playing = false;
    publish();
  }
  function onEnded() {
    ended = true;
    requested = false;
    playing = false;
    pending = false;
    generation++;
    publish();
  }
  function onError() {
    failed = true;
    requested = false;
    pause();
    publish();
  }
  video.addEventListener('playing', onPlaying);
  video.addEventListener('pause', onPause);
  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onError);
  publish();

  return {
    setVisible(value: boolean) {
      visible = value;
      sync();
    },
    setPageVisible(value: boolean) {
      pageVisible = value;
      sync();
    },
    setReducedMotion(value: boolean) {
      if (value && !reduced) {
        // A newly enabled preference stops even an earlier manual play.
        requested = false;
        optedIn = false;
        attempted = true;
      }
      reduced = value;
      sync();
    },
    toggle() {
      if (disposed || failed) return;
      attempted = true;
      if (requested || playing) {
        requested = false;
      } else {
        if (ended) {
          video.currentTime = 0;
          ended = false;
          started = false;
        }
        optedIn = true;
        requested = true;
      }
      sync();
    },
    destroy() {
      disposed = true;
      requested = false;
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      pause();
    }
  };
}
