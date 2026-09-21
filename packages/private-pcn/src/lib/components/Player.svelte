<script lang="ts">
  import StatusNotice from './StatusNotice.svelte';
  import { onMount } from 'svelte';
  import { trackImpact } from '$lib/impact';
  import { timestamp } from '$lib/learning';
  import { api, supportHeaders } from '$lib/client';
  let {
    id,
    title,
    networkSlug,
    initialPosition = 0,
    saveProgress = false,
    duration = 0
  }: {
    id: string;
    title: string;
    networkSlug?: string;
    initialPosition?: number;
    saveProgress?: boolean;
    duration?: number;
  } = $props();
  let element: HTMLVideoElement;
  let message = $state('Preparing playback…');
  let failed = $state(false);
  let progressError = $state(false);
  onMount(() => {
    let hls: import('hls.js').default | undefined;
    let stopped = false;
    let renewing = false;
    let started = false;
    let lastPosition = initialPosition;
    let pending: number | undefined;
    let writing = false;
    const resume = initialPosition > 0 && initialPosition < duration - 2 ? initialPosition : 0;
    async function flush() {
      if (!saveProgress || !started || renewing || !duration || failed) return;
      const position = Math.min(duration, Math.max(0, element.currentTime));
      if (!Number.isFinite(position) || Math.abs(position - lastPosition) < 1) return;
      pending = position;
      if (writing) return;
      writing = true;
      while (pending !== undefined) {
        const value = pending;
        pending = undefined;
        try {
          const prefix = networkSlug ? `/api/networks/${encodeURIComponent(networkSlug)}` : '/api';
          const response = await fetch(`${prefix}/learning/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...supportHeaders() },
            body: JSON.stringify({ id, action: 'position', position: value }),
            keepalive: true
          });
          if (!response.ok) throw new Error('Save failed');
          lastPosition = value;
          progressError = false;
        } catch {
          progressError = true;
          pending = undefined;
          break;
        }
      }
      writing = false;
    }
    function played() {
      if (!started) {
        started = true;
        trackImpact('lesson_start', location.pathname);
        if (resume) trackImpact('lesson_resume', location.pathname);
      }
    }
    function metadata() {
      renewing = false;
    }
    element.addEventListener('play', played);
    element.addEventListener('loadedmetadata', metadata);
    element.addEventListener('pause', flush);
    element.addEventListener('ended', flush);
    window.addEventListener('pagehide', flush);
    const progressTimer = setInterval(flush, 15000);
    let timer: ReturnType<typeof setTimeout>;
    async function load(renew = false) {
      try {
        const grant = await api('playback', { id }, networkSlug);
        if (stopped) return;
        const position = renew ? element.currentTime : resume;
        renewing = true;
        const playing = renew && !element.paused;
        if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.addEventListener(
            'loadedmetadata',
            () => {
              element.currentTime = position;
            },
            { once: true }
          );
          element.src = grant.hlsUrl;
        } else {
          const { default: Hls } = await import('hls.js');
          if (stopped) return;
          if (!Hls.isSupported())
            throw new Error('This browser cannot play this video. Try a current browser.');
          hls?.destroy();
          hls = new Hls({ startPosition: position });
          hls.loadSource(grant.hlsUrl);
          hls.attachMedia(element);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              failed = true;
              message = 'Playback was interrupted. Reload this page to try again.';
            }
          });
        }
        failed = false;
        message = '';
        if (playing) await element.play().catch(() => {});
        timer = setTimeout(() => load(true), 45000);
      } catch (e) {
        failed = true;
        message = (e as Error).message;
        element.pause();
        element.removeAttribute('src');
        hls?.destroy();
      }
    }
    load();
    return () => {
      void flush();
      clearInterval(progressTimer);
      element.removeEventListener('play', played);
      element.removeEventListener('loadedmetadata', metadata);
      element.removeEventListener('pause', flush);
      element.removeEventListener('ended', flush);
      window.removeEventListener('pagehide', flush);
      stopped = true;
      clearTimeout(timer);
      hls?.destroy();
    };
  });
</script>

<div class="player">
  {#if saveProgress && initialPosition > 0 && initialPosition < duration - 2}<p class="resume-note">
      Resume from {timestamp(initialPosition)}. Your position is saved as you watch.
    </p>{/if}
  <video bind:this={element} controls playsinline aria-label={title}
    ><track kind="captions" /></video
  >{#if message}<StatusNotice tone={failed ? 'error' : 'info'} busy={!failed} {message} />{/if}
  {#if progressError}<StatusNotice
      tone="warning"
      message="Your latest position could not be saved. Playback can continue; saving will retry."
    />{/if}
</div>

<style>
  .resume-note {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 12px;
  }
</style>
