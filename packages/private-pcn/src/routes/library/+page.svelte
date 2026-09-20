<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CatalogVideo } from '$lib/client';
  import Player from '$lib/components/Player.svelte';
  let { data } = $props();
  let videos = $state<CatalogVideo[]>([]);
  let selected = $state<CatalogVideo | null>(null);
  let error = $state('');
  let loading = $state(true);
  async function load() {
    error = '';
    loading = true;
    try {
      videos = (await api('videos')).videos;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  async function logout() {
    await api('logout', {});
    window.location.assign('/library');
  }
  onMount(load);
</script>

<svelte:head
  ><title>The library | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="workspace">
  <div class="workspace-title">
    <div>
      <p class="eyebrow">CREATE SOMETHING / DEMONSTRATION NETWORK</p>
      <h1>Field <em>notes.</em></h1>
      <p>
        A look inside a private content network. This demonstration uses CREATE SOMETHING material.
      </p>
    </div>
    <div class="workspace-actions">
      {#if data.identity?.role === 'admin'}<a class="button secondary" href="/admin"
          >Manage network ↗</a
        >{/if}{#if data.identity}<button class="text-button" onclick={logout}>Sign out</button
        >{:else}<a class="button secondary" href="/login">Member sign in ↗</a>{/if}
    </div>
  </div>
  {#if data.identity?.role === 'blocked'}<aside class="notice">
      You’re signed in, but this account has not been invited. You can still watch public previews.
    </aside>{/if}
  {#if selected}<section class="watch-panel" aria-label="Video playback">
      <div class="panel-heading">
        <h2>{selected.title}</h2>
        <button class="text-button" onclick={() => (selected = null)}>Close video ×</button>
      </div>
      {#key selected.id}<Player id={selected.id} title={selected.title} />{/key}
      <p>{selected.description}</p>
    </section>{/if}
  {#if loading}<p role="status">Loading the library…</p>{:else if error}<div
      class="notice"
      role="alert"
    >
      <p>{error}</p>
      <button class="button secondary" onclick={load}>Try again</button>
    </div>{:else if !videos.length}<div class="empty-state">
      <p class="eyebrow">THE LIBRARY</p>
      <h2>No published films to show yet.</h2>
      <p>Members see the collections available to them. Sign in if you have an invitation.</p>
    </div>{:else}<div class="catalog">
      {#each videos as video, index}<button class="video-card" onclick={() => (selected = video)}
          ><div class="video-cover">
            <span>{video.series}</span><strong>{String(index + 1).padStart(2, '0')}</strong><span
              class="video-play"
              aria-hidden="true">↗</span
            >
          </div>
          <div class="video-caption">
            <span class="eyebrow"
              >{video.access === 'public' ? 'PUBLIC PREVIEW' : 'MEMBER FILM'}{video.duration
                ? ` / ${Math.ceil(video.duration / 60)} MIN`
                : ''}</span
            >
            <h2>{video.title}</h2>
            <p>{video.description}</p>
          </div></button
        >{/each}
    </div>{/if}
</main>
