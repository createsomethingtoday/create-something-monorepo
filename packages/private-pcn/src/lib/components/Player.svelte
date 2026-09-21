<script lang="ts">
  import StatusNotice from './StatusNotice.svelte';
  import { onMount } from 'svelte';
  import { api } from '$lib/client';
  let { id, title, networkSlug }: { id: string; title: string; networkSlug?: string } = $props();
  let element: HTMLVideoElement;
  let message = $state('Preparing playback…');
  let failed = $state(false);
  onMount(() => {
    let hls: import('hls.js').default | undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load(renew = false) {
      try {
        const grant = await api('playback', { id }, networkSlug);
        if (stopped) return;
        const position = renew ? element.currentTime : 0;
        const playing = renew && !element.paused;
        if (element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = grant.hlsUrl;
          element.currentTime = position;
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
      stopped = true;
      clearTimeout(timer);
      hls?.destroy();
    };
  });
</script>

<div class="player">
  <video bind:this={element} controls playsinline aria-label={title}
    ><track kind="captions" /></video
  >{#if message}<StatusNotice tone={failed ? 'error' : 'info'} busy={!failed} {message} />{/if}
</div>
