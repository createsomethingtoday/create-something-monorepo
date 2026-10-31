/** Scene time ranges are half-open; the exact ending holds the last scene. */
export function activeScene(scenes, time) {
  if (!scenes.length) return -1;
  const safeTime = Number.isFinite(time) ? time : 0;
  const match = scenes.findIndex(scene => safeTime >= scene.start && safeTime < scene.end);
  if (match >= 0) return match;
  return safeTime < scenes[0].start ? 0 : scenes.length - 1;
}

export function validateManifest(manifest) {
  if (!manifest || typeof manifest.title !== 'string' || !manifest.title.trim()) throw new Error('The walkthrough needs a title.');
  if (!manifest.source || typeof manifest.source.file !== 'string' || !manifest.source.file.trim()) throw new Error('The screen recording is missing from the manifest.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.mp4$/.test(manifest.source.file)) throw new Error('The recording must be a local MP4 filename, without paths, URLs, or query parameters.');
  if (!Number.isFinite(manifest.source.duration) || manifest.source.duration <= 0) throw new Error('The recording duration must be positive.');
  if (!Array.isArray(manifest.scenes) || !manifest.scenes.length) throw new Error('The walkthrough has no chapters.');
  let end = 0;
  const ids = new Set();
  for (const scene of manifest.scenes) {
    if (!scene || !Number.isFinite(scene.start) || !Number.isFinite(scene.end) || Math.abs(scene.start - end) > .001 || scene.end <= scene.start) throw new Error('Chapter times must cover the recording without gaps or overlaps.');
    for (const key of ['id', 'label', 'title', 'prompt', 'evidence']) {
      if (typeof scene[key] !== 'string' || !scene[key].trim()) throw new Error(`Each chapter needs ${key}.`);
    }
    if (ids.has(scene.id)) throw new Error('Chapter IDs must be unique.');
    ids.add(scene.id);
    end = scene.end;
  }
  if (Math.abs(end - manifest.source.duration) > .05) throw new Error('The final chapter must reach the recording’s end.');
  if (manifest.mobile !== undefined) {
    const mobile = manifest.mobile;
    if (!mobile || mobile.file !== 'screen-mobile.mp4' || mobile.poster !== 'poster-mobile.jpg') throw new Error('Mobile assets must use the local screen-mobile.mp4 and poster-mobile.jpg filenames.');
    for (const key of ['width', 'height']) if (!Number.isSafeInteger(mobile[key]) || mobile[key] <= 0 || mobile[key] % 2) throw new Error('Mobile dimensions must be positive even integers.');
    if (!Array.isArray(mobile.shots) || !mobile.shots.length) throw new Error('Mobile framing needs at least one shot.');
    let shotEnd = 0;
    for (const shot of mobile.shots) {
      if (!shot || !Number.isFinite(shot.start) || !Number.isFinite(shot.end) || Math.abs(shot.start - shotEnd) > .001 || shot.end <= shot.start) throw new Error('Mobile shot times must cover the recording without gaps or overlaps.');
      if (!Array.isArray(shot.crop) || shot.crop.length !== 4 || shot.crop.some((value, index) => !Number.isSafeInteger(value) || value < (index < 2 ? 2 : 0) || value % 2)) throw new Error('Mobile crops need even pixel dimensions and offsets.');
      if (typeof shot.label !== 'string' || !shot.label.trim()) throw new Error('Mobile shots need descriptive labels.');
      shotEnd = shot.end;
    }
    if (Math.abs(shotEnd - manifest.source.duration) > .001) throw new Error('Mobile shots must match the recording duration.');
  }
  return manifest;
}

export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Explicit viewer choice wins over the responsive default. */
export function chooseMedia(manifest, narrow, preference = 'auto') {
  const focused = Boolean(manifest.mobile) && (preference === 'focused' || (preference === 'auto' && narrow));
  return focused ? { mode: 'focused', file: manifest.mobile.file, poster: manifest.mobile.poster } : { mode: 'full', file: manifest.source.file, poster: 'poster.jpg' };
}

/** Keeps one timeline while loading another view; rapid switches cancel old listeners. */
export function createMediaSwitcher(video, onChange = () => {}, onPlaybackBlocked = () => {}) {
  let selection;
  let pending;
  let loading = false;
  let metadataReady = false;
  let cancel = () => {};
  let generation = 0;
  const time = () => pending ? pending.time : video.currentTime;
  function switchTo(next, force = false) {
    if (selection?.file === next.file && !force) return;
    const state = pending ? { ...pending } : { time: Number.isFinite(video.currentTime) ? video.currentTime : 0, paused: video.paused || video.ended, rate: video.playbackRate };
    cancel();
    const token = ++generation;
    pending = state;
    loading = true;
    metadataReady = false;
    selection = next;
    video.pause();
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', loaded);
      video.removeEventListener('seeked', restored);
      video.removeEventListener('error', failed);
    };
    const restored = () => {
      if (token !== generation || !pending) return;
      const target = Math.min(pending.time, Number.isFinite(video.duration) ? video.duration : pending.time);
      // A chapter click can replace the in-flight seek after metadata has loaded.
      // Ignore stale seeked events until the newest requested position is settled.
      if (video.seeking || Math.abs(video.currentTime - target) >= .001) return;
      const resume = !pending.paused && video.currentTime < video.duration;
      pending = null;
      loading = false;
      cleanup();
      onChange(next, false);
      if (resume) Promise.resolve(video.play()).catch(() => { if (token === generation) onPlaybackBlocked(); });
    };
    const loaded = () => {
      if (token !== generation || !pending) return;
      metadataReady = true;
      video.playbackRate = pending.rate;
      const target = Math.min(pending.time, Number.isFinite(video.duration) ? video.duration : pending.time);
      if (Math.abs(video.currentTime - target) < .001) restored();
      else { video.addEventListener('seeked', restored); video.currentTime = target; }
    };
    const failed = () => {
      if (token !== generation) return;
      cleanup();
      loading = false;
      metadataReady = false;
      // Retain the last known timeline position for switching back to a working view.
      onChange(next, false);
    };
    cancel = cleanup;
    video.addEventListener('loadedmetadata', loaded);
    video.addEventListener('error', failed);
    video.poster = next.poster;
    video.src = next.file;
    video.load();
    onChange(next, true);
  }
  return {
    switchTo,
    time,
    retry() { if (selection && !loading) switchTo(selection, true); },
    seek(value) {
      if (pending) {
        pending.time = value;
        if (metadataReady) video.currentTime = Math.min(value, Number.isFinite(video.duration) ? video.duration : value);
      } else video.currentTime = value;
    },
    get mode() { return selection?.mode || 'full'; },
    get switching() { return loading; },
    destroy() { generation++; cancel(); }
  };
}

async function boot() {
  const get = id => document.getElementById(id);
  const loadStatus = get('load-status');
  try {
    const response = await fetch('./manifest.json');
    if (!response.ok) throw new Error(`The scene manifest could not load (${response.status}).`);
    const manifest = validateManifest(await response.json());
    const video = get('video');
    document.querySelector('.recording-note').textContent = 'Recording · guidance follows the screen';
    let current = -1;
    let copyTimer;
    let switcher;
    let retryHadFocus = false;
    const narrow = matchMedia('(max-width: 680px)');
    let preference = 'auto';
    const buttons = [];
    get('walkthrough-title').textContent = manifest.title;
    get('description').textContent = manifest.description || '';
    get('duration').textContent = `${formatTime(manifest.source.duration)} / ${manifest.scenes.length} steps`;
    get('attribution').textContent = manifest.source.attribution || 'Screen recording supplied for this walkthrough.';
    document.title = `${manifest.title} — CREATE SOMETHING`;
    function update() {
      const clock = switcher ? switcher.time() : video.currentTime;
      const next = activeScene(manifest.scenes, clock);
      if (manifest.mobile) {
        const shot = manifest.mobile.shots[activeScene(manifest.mobile.shots, clock)];
        get('focus-label').textContent = switcher?.mode === 'focused' ? `Focused view · ${shot.label}` : 'Full recording · full screen view';
      }
      get('playback-state').textContent = video.error ? 'Recording unavailable' : switcher?.switching ? 'Loading view…' : video.ended ? 'Walkthrough complete' : video.paused ? 'Paused / your pace' : 'Playing / follow along';
      if (next === current) return;
      current = next;
      const scene = manifest.scenes[current];
      buttons.forEach((button, index) => {
        if (index === current) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      get('scene-step').textContent = `Step ${String(current + 1).padStart(2, '0')} / ${String(manifest.scenes.length).padStart(2, '0')}`;
      get('scene-title').textContent = scene.title;
      get('scene-prompt').textContent = scene.prompt;
      get('scene-evidence').textContent = scene.evidence;
      get('previous').disabled = current === 0;
      get('next').disabled = current === manifest.scenes.length - 1;
      get('copy-status').textContent = '';
      clearTimeout(copyTimer);
    }
    function seek(index) {
      if (index < 0 || index >= manifest.scenes.length) return;
      switcher.seek(manifest.scenes[index].start);
      update();
    }
    manifest.scenes.forEach((scene, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'chapter';
      button.type = 'button';
      button.setAttribute('aria-label', `Step ${index + 1}: ${scene.label}, ${formatTime(scene.start)}`);
      for (const [className, value] of [['number', String(index + 1).padStart(2, '0')], ['label', scene.label], ['time', formatTime(scene.start)]]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = value;
        button.append(span);
      }
      button.addEventListener('click', () => seek(index));
      buttons.push(button);
      li.append(button);
      get('chapters').append(li);
      const note = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = `${formatTime(scene.start)} — ${scene.title}`;
      const prompt = document.createElement('p');
      prompt.textContent = scene.prompt;
      const evidence = document.createElement('p');
      evidence.textContent = `Look for: ${scene.evidence}`;
      note.append(title, prompt, evidence);
      get('scene-notes').append(note);
    });
    get('previous').addEventListener('click', () => seek(current - 1));
    get('next').addEventListener('click', () => seek(current + 1));
    get('retry-recording').addEventListener('click', () => switcher.retry());
    get('copy-prompt').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(manifest.scenes[current].prompt);
        get('copy-status').textContent = 'Prompt copied.';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(get('scene-prompt'));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        get('scene-prompt').focus();
        get('copy-status').textContent = 'Prompt selected. Press ⌘C or Ctrl+C to copy.';
      }
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { get('copy-status').textContent = ''; }, 7000);
    });
    for (const event of ['timeupdate', 'seeked', 'play', 'pause', 'ended']) video.addEventListener(event, update);
    video.addEventListener('loadedmetadata', () => {
      get('video-error').hidden = true;
      if (video.videoWidth > 0 && video.videoHeight > 0) video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
      if (!Number.isFinite(video.duration) || Math.abs(video.duration - manifest.source.duration) > .2) {
        get('video-error').textContent = 'This recording’s timing differs from the scene manifest. Rebuild the walkthrough before sharing it.';
        get('video-error').hidden = false;
      }
      update();
    });
    video.addEventListener('error', () => {
      get('video-error').textContent = switcher?.mode === 'focused' ? 'The focused recording could not load. Choose Full recording to continue at the same point. You can still read the walkthrough below.' : 'The recording could not load. Retry the recording. If it still cannot load, check that the media file is included beside this player. You can still read the walkthrough below.';
      get('video-error').hidden = false;
      get('playback-state').textContent = 'Recording unavailable';
      get('retry-recording').hidden = false;
      get('retry-recording').disabled = false;
      get('retry-recording').textContent = 'Retry recording';
    });
    switcher = createMediaSwitcher(video, (selection, loading) => {
      const retry = get('retry-recording');
      get('watch').setAttribute('aria-busy', String(loading));
      if (loading) {
        retryHadFocus = document.activeElement === retry;
        get('video-error').hidden = true;
        retry.disabled = true;
        retry.textContent = 'Retrying recording…';
      } else if (!video.error) {
        if (document.activeElement === retry || (retryHadFocus && document.activeElement === document.body)) video.focus();
        retryHadFocus = false;
        retry.hidden = true;
        retry.disabled = false;
        retry.textContent = 'Retry recording';
      } else if (retryHadFocus) {
        if (document.activeElement === document.body) retry.focus();
        retryHadFocus = false;
      }
      get('view-select').value = selection.mode;
      get('watch').dataset.view = selection.mode;
      update();
    }, () => { get('playback-state').textContent = 'Paused / press play to continue'; });
    if (manifest.mobile) {
      get('view-controls').hidden = false;
      get('focus-label').hidden = false;
      get('view-select').addEventListener('change', event => {
        preference = event.target.value;
        switcher.switchTo(chooseMedia(manifest, narrow.matches, preference));
      });
      narrow.addEventListener('change', () => switcher.switchTo(chooseMedia(manifest, narrow.matches, preference)));
    }
    switcher.switchTo(chooseMedia(manifest, narrow.matches, preference));
    update();
    get('walkthrough').hidden = false;
    loadStatus.hidden = true;
  } catch (error) {
    loadStatus.textContent = `Could not open the walkthrough. ${error.message} Serve this folder with a local web server rather than opening the HTML file directly.`;
    loadStatus.setAttribute('role', 'alert');
  }
}

if (typeof document !== 'undefined') boot();
