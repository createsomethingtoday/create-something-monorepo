<script lang="ts">
  import StatusNotice from './StatusNotice.svelte';
  import { onMount } from 'svelte';
  import { createPlaybackSession, type PlaybackState } from '$lib/playback-session';
  import { trackImpact } from '$lib/impact';
  import { timestamp, playbackResumePosition } from '$lib/learning';
  import { api, supportHeaders } from '$lib/client';
  let {
    id,
    title,
    networkSlug,
    initialPosition = 0,
    saveProgress = false,
    pathId,
    duration = 0
  }: {
    id: string;
    title: string;
    networkSlug?: string;
    initialPosition?: number;
    saveProgress?: boolean;
    pathId?: string;
    duration?: number;
  } = $props();
  let element: HTMLVideoElement;
  const playback = $state<PlaybackState>({
    message: 'Preparing playback…',
    failed: false,
    progressError: false,
    captionLabels: null
  });
  let retry = $state<() => void>(() => {});
  onMount(() => {
    const session = createPlaybackSession(element, playback, {
      initialPosition,
      duration,
      saveProgress,
      pathId,
      fetchGrant: () => api('playback', { id }, networkSlug),
      savePosition: async (position, context) => {
        const prefix = networkSlug ? `/api/networks/${encodeURIComponent(networkSlug)}` : '/api';
        const response = await fetch(`${prefix}/learning/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...supportHeaders() },
          body: JSON.stringify({
            id,
            action: 'position',
            position,
            ...(context ? { path_id: context } : {})
          }),
          keepalive: true
        });
        if (!response.ok) throw new Error('Save failed');
      },
      onFirstPlay: (resumed) => {
        trackImpact('lesson_start', location.pathname);
        if (resumed) trackImpact('lesson_resume', location.pathname);
      },
      pageEvents: window
    });
    retry = session.retry;
    return session.dispose;
  });
</script>

<div class="player">
  {#if saveProgress && playbackResumePosition(initialPosition, duration)}<p class="resume-note">
      Resume from {timestamp(initialPosition)}. Your position is saved as you watch.
    </p>{/if}
  <!-- Captions arrive as signed HLS text tracks; an empty HTML track would falsely imply a caption source. -->
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={element} controls playsinline aria-label={title}
  ></video>{#if playback.message}<StatusNotice
      tone={playback.failed ? 'error' : 'info'}
      busy={!playback.failed}
      message={playback.message}
    />{/if}
  {#if playback.failed}<button class="button secondary" onclick={retry}>Retry playback</button>{/if}
  <p class="caption-status" role="status">
    {#if playback.captionLabels === null}Caption availability will be checked when the video loads.
    {:else if playback.captionLabels.length}Caption tracks available: {playback.captionLabels.join(
        ', '
      )}. Use the video’s caption control.
    {:else}No caption tracks detected in this playback. A transcript, when provided, is available
      below.{/if}
  </p>
  {#if playback.progressError}<StatusNotice
      tone="warning"
      message="Your latest position could not be saved. Playback can continue; saving will retry."
    />{/if}
</div>

<style>
  .caption-status {
    color: var(--muted);
    font-size: 14px;
    margin-block: 12px;
  }
  .resume-note {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 12px;
  }
</style>
