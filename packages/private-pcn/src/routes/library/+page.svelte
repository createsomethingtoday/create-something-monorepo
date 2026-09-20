<script lang="ts">
  import { onMount } from 'svelte';
  import { api as requestApi, type CatalogVideo } from '$lib/client';
  import Player from '$lib/components/Player.svelte';
  import { filterCatalog } from '$lib/catalog';
  let { data } = $props();
  const slug = $derived(data.network?.slug === 'create-something' ? undefined : data.network?.slug);
  const api = (path: string, body?: unknown) => requestApi(path, body, slug);
  const libraryPath = $derived(slug ? `/n/${slug}` : '/library');
  let videos = $state<CatalogVideo[]>([]);
  let selected = $state<CatalogVideo | null>(null);
  let error = $state('');
  let loading = $state(true);
  let query = $state('');
  let series = $state('');
  const seriesOptions = $derived([...new Set(videos.map((video) => video.series))].sort());
  const visibleVideos = $derived(filterCatalog(videos, query, series));
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
    window.location.assign(libraryPath);
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
      <p class="eyebrow">PRIVATE / AGENTIC ENGINEERING</p>
      <h1>
        {#if slug}{data.network?.name}{:else}The knowledge <em>library.</em>{/if}
      </h1>
      <p>
        Technical walkthroughs, agent builds, and lessons from implementation. Explore public
        sessions or sign in to access your member library.
      </p>
    </div>
    <div class="workspace-actions">
      {#if data.identity?.role === 'admin'}<a
          class="button secondary"
          href={slug ? `/n/${slug}/studio` : '/admin'}>Creator workspace ↗</a
        >{/if}{#if data.identity}<button class="text-button" onclick={logout}>Sign out</button
        >{:else}<a class="button secondary" href={`/login?next=${encodeURIComponent(libraryPath)}`}
          >Member sign in ↗</a
        >{/if}
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
      {#key selected.id}<Player id={selected.id} title={selected.title} networkSlug={slug} />{/key}
      <p>{selected.description}</p>
    </section>{/if}
  {#if videos.length}<div class="library-tools">
      <label
        >Search the library<input
          type="search"
          bind:value={query}
          placeholder="Search topics, titles, or methods"
        /></label
      ><label
        >Series<select bind:value={series}
          ><option value="">All series</option>{#each seriesOptions as option}<option value={option}
              >{option}</option
            >{/each}</select
        ></label
      >
      <p aria-live="polite">
        {visibleVideos.length}
        {visibleVideos.length === 1 ? 'session' : 'sessions'}
      </p>
    </div>{/if}
  {#if loading}<p role="status">Loading the library…</p>{:else if error}<div
      class="notice"
      role="alert"
    >
      <p>{error}</p>
      <button class="button secondary" onclick={load}>Try again</button>
    </div>{:else if !videos.length}<div class="empty-state">
      <p class="eyebrow">THE LIBRARY</p>
      <h2>No published sessions yet.</h2>
      <p>
        Published sessions will appear here. Invited members can sign in to see their private
        series.
      </p>
    </div>{:else if !visibleVideos.length}<div class="empty-state">
      <h2>No sessions match this search.</h2>
      <p>Try another topic or view the full library.</p>
      <button
        class="button secondary"
        onclick={() => {
          query = '';
          series = '';
        }}>Clear filters</button
      >
    </div>{:else}<div class="catalog">
      {#each visibleVideos as video, index}<button
          class="video-card"
          onclick={() => (selected = video)}
          ><div class="video-cover">
            <span>{video.series}</span><strong>{String(index + 1).padStart(2, '0')}</strong><span
              class="video-play"
              aria-hidden="true">↗</span
            >
          </div>
          <div class="video-caption">
            <span class="eyebrow"
              >{video.access === 'public' ? 'PUBLIC PREVIEW' : 'MEMBER SESSION'}{video.duration
                ? ` / ${Math.ceil(video.duration / 60)} MIN`
                : ''}</span
            >
            <h2>{video.title}</h2>
            <p>{video.description}</p>
          </div></button
        >{/each}
    </div>{/if}
</main>
