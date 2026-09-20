<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/client';
  let { id, title }: { id: string; title: string } = $props();
  let element: HTMLVideoElement;
  let message = $state('Preparing playback…');
  onMount(() => {
    let hls: import('hls.js').default | undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load(renew = false) {
      try {
        const grant = await api('playback', { id });
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
            if (data.fatal) message = 'Playback was interrupted. Close the video and try again.';
          });
        }
        message = '';
        if (playing) await element.play().catch(() => {});
        timer = setTimeout(() => load(true), 45000);
      } catch (e) {
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
  >{#if message}<p role="status">{message}</p>{/if}
</div>
