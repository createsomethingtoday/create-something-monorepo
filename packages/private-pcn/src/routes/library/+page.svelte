<script lang="ts">
  import FoundationEntry from '$lib/components/FoundationEntry.svelte';
  import LearningOverview from '$lib/components/LearningOverview.svelte';
  import NetworkContext from '$lib/components/NetworkContext.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import { lessonPath, libraryReturnPath } from '$lib/lessons';
  import { api as requestApi, type CatalogVideo } from '$lib/client';
  import { filterCatalog } from '$lib/catalog';
  let { data } = $props();
  const slug = $derived(data.network?.slug === 'create-something' ? undefined : data.network?.slug);
  const api = (path: string, body?: unknown) => requestApi(path, body, slug);
  const inactiveNetwork = $derived(!!data.network && data.network.status !== 'active');
  const libraryPath = $derived(slug ? `/n/${slug}` : '/library');
  let videos = $state<CatalogVideo[]>([]);
  let error = $state('');
  let loading = $state(true);
  let query = $state('');
  let series = $state('');
  let filterTimer: ReturnType<typeof setTimeout>;
  onDestroy(() => clearTimeout(filterTimer));
  function scheduleFilters() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(rememberFilters, 250);
  }
  function rememberFilters() {
    clearTimeout(filterTimer);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (series) params.set('series', series);
    replaceState(libraryReturnPath(slug, params), {
      ...page.state,
      libraryFilters: { path: libraryPath, query, series }
    });
  }
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
  $effect(() => {
    const saved = page.state.libraryFilters;
    query = saved?.path === libraryPath ? saved.query : page.url.searchParams.get('q') || '';
    series = saved?.path === libraryPath ? saved.series : page.url.searchParams.get('series') || '';
  });
  onMount(load);
</script>

<svelte:head
  ><title>The library | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" tabindex="-1" class="workspace member-library">
  <div class="workspace-title">
    <div>
      <p class="eyebrow">Private / Agentic engineering</p>
      <h1>
        {#if slug}{data.network?.name}{:else}The library.{/if}
      </h1>
      <p>
        {#if data.identity}Technical walkthroughs, agent builds and lessons from implementation.
          This library shows the sessions available to your account.{:else}Explore public
          walkthroughs of agentic engineering. Sign in with your invited email to see member
          sessions.{/if}
      </p>
    </div>
    <div class="workspace-actions">
      {#if data.identity}<a class="collection-link" href="/collection"
          >Your acquired assets <Icon name="arrow-right" /></a
        >{/if}
      {#if data.identity?.role === 'admin'}<a
          class="button secondary"
          href={slug ? `/n/${slug}/studio` : '/admin'}
          >Creator workspace <Icon name="arrow-right" /></a
        >{/if}{#if data.identity}<button class="text-button" onclick={logout}>Sign out</button
        >{:else}<a class="button secondary" href={`/login?next=${encodeURIComponent(libraryPath)}`}
          >Member sign in <Icon name="arrow-right" /></a
        >{/if}
    </div>
  </div>
  {#if data.network?.status !== 'active'}<NetworkContext
      network={data.network}
      showName={false}
      canManage={data.identity?.role === 'admin'}
    />{/if}
  {#if data.foundation}<FoundationEntry foundation={data.foundation} />{/if}
  {#if data.identity?.role === 'blocked'}<aside class="notice">
      <strong>Public previews only</strong>
      <p>
        This account doesn’t currently have member access to this network. If you expected access,
        ask the creator to check the email on your invitation.
      </p>
    </aside>{/if}
  {#if !loading && !error && videos.length && data.identity && data.identity.role !== 'blocked'}{#key slug}<LearningOverview
        {slug}
      />{/key}{/if}
  {#if videos.length}<div class="library-tools">
      <label
        >Search the library<input
          type="search"
          maxlength="200"
          bind:value={query}
          oninput={(event) => {
            query = event.currentTarget.value;
            scheduleFilters();
          }}
          placeholder="Search topics, titles, or methods"
        /></label
      ><label
        >Series<select
          bind:value={series}
          onchange={(event) => {
            series = event.currentTarget.value;
            rememberFilters();
          }}
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
      <p class="eyebrow">The library</p>
      <h2>No sessions available here yet.</h2>
      <p>
        {#if !data.identity}There are no public sessions in this library. If you have an invitation,
          sign in with the invited email.{:else if data.identity.role === 'blocked'}Private sessions
          require member access. Your acquired assets are kept separately in your collection.{:else if data.identity.role === 'admin' && inactiveNetwork}Member
          access is paused. Resolve the network status before inviting members to watch.{:else if data.identity.role === 'admin'}Prepare
          a private lesson in your creator workspace. Review it before choosing who can watch.{:else}When
          the creator publishes a session for your access level, it will appear here.{/if}
      </p>
      {#if data.identity?.role === 'admin'}<a
          class="button secondary"
          href={inactiveNetwork && slug
            ? `/n/${slug}/settings`
            : slug
              ? `/n/${slug}/studio`
              : '/admin'}
          >{inactiveNetwork && slug ? 'Review network settings' : 'Prepare your first lesson'}
          <Icon name="arrow-right" /></a
        >
      {:else if data.identity}<a class="button secondary" href="/collection"
          >Open your collection <Icon name="arrow-right" /></a
        >{:else}<a class="button secondary" href={`/login?next=${encodeURIComponent(libraryPath)}`}
          >Member sign in <Icon name="arrow-right" /></a
        >{/if}
    </div>{:else if !visibleVideos.length}<div class="empty-state">
      <h2>No sessions match this search.</h2>
      <p>Try another topic or view the full library.</p>
      <button
        class="button secondary"
        onclick={() => {
          query = '';
          series = '';
          rememberFilters();
        }}>Clear filters</button
      >
    </div>{:else}<div class="catalog">
      {#each visibleVideos as video, index}<a
          class="video-card"
          href={lessonPath(video.id, slug, query, series)}
          onclick={rememberFilters}
          ><div class="video-cover">
            <span>{video.series}</span><strong>{String(index + 1).padStart(2, '0')}</strong><span
              class="video-play"
              aria-hidden="true"><Icon name="arrow-right" /></span
            >
          </div>
          <div class="video-caption">
            <span class="eyebrow"
              >{video.access === 'public' ? 'Public preview' : 'Member session'}{video.duration
                ? ` / ${Math.ceil(video.duration / 60)} MIN`
                : ''}</span
            >
            <h2>{video.title}</h2>
            <p>{video.description}</p>
          </div></a
        >{/each}
    </div>{/if}
</main>

<style>
  .member-library {
    max-width: 1280px;
    margin: auto;
    padding: var(--space-performance-lg) var(--pcn-page-gutter) var(--space-performance-xl);
  }
  .workspace-title {
    align-items: flex-start;
    padding-bottom: var(--space-performance-lg);
    margin-bottom: var(--space-performance-md);
    border-bottom: 1px solid var(--line);
  }
  .workspace-title .eyebrow {
    margin-bottom: var(--space-performance-sm);
  }
  .member-library h1 {
    font-size: clamp(36px, 4vw, 56px);
    line-height: var(--pcn-leading-heading);
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
  .workspace-title p:last-child {
    margin-bottom: 0;
  }
  .workspace-actions {
    flex-shrink: 0;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-performance-xs);
  }
  .collection-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    min-height: 44px;
    font-size: 14px;
  }
  .notice strong {
    display: block;
    margin-bottom: var(--space-performance-xs);
  }
  .notice p {
    margin: 0;
    max-width: 70ch;
    color: var(--muted);
  }
  .empty-state {
    padding: var(--pcn-empty-space);
  }
  .empty-state p {
    max-width: 65ch;
    color: var(--muted);
  }
  .empty-state h2 {
    font-size: 26px;
    letter-spacing: -0.03em;
  }
  .video-card {
    text-decoration: none;
  }
  @media (max-width: 760px) {
    .workspace-title {
      flex-direction: column;
    }
    .workspace-actions {
      align-items: flex-start;
      flex-direction: row;
    }
    .member-library {
      padding-top: var(--space-performance-md);
    }
    .empty-state {
      padding: var(--pcn-empty-space-compact);
    }
  }

  .workspace-title {
    background: var(--enlightr-ai);
    padding: clamp(24px, 4vw, 56px);
    border: 0;
    margin-bottom: 0;
    gap: 32px;
  }
  .member-library h1 {
    font-family: var(--font-serif);
    font-size: clamp(48px, 7vw, 88px);
    font-weight: 400;
  }
  .workspace-title p {
    color: #111;
  }
  .workspace-actions {
    min-width: 0;
  }
  .catalog {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
  }
  .video-card {
    min-width: 0;
    background: var(--enlightr-code);
    color: #111;
  }
  .video-card:nth-child(4n + 2) {
    background: var(--enlightr-design);
  }
  .video-card:nth-child(4n + 3) {
    background: var(--enlightr-data);
  }
  .video-card:nth-child(4n + 4) {
    background: var(--enlightr-ai);
  }
  .video-cover {
    position: relative;
    min-height: 190px;
    padding: 24px;
    background: transparent;
    color: #111;
    overflow: hidden;
  }
  .video-cover strong {
    font-size: 100px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.08em;
    font-family: var(--font-serif);
  }
  .video-cover::after {
    content: '';
    width: 110px;
    height: 110px;
    background: currentColor;
    position: absolute;
    right: 28px;
    top: 44px;
    clip-path: polygon(
      50% 0%,
      61% 31%,
      85% 15%,
      69% 40%,
      100% 50%,
      69% 60%,
      85% 85%,
      60% 69%,
      50% 100%,
      40% 69%,
      15% 85%,
      31% 60%,
      0% 50%,
      31% 40%,
      15% 15%,
      40% 31%
    );
    transition: transform 200ms;
  }
  .video-card:hover .video-cover::after {
    transform: rotate(18deg);
  }
  .video-caption {
    padding: 24px;
  }
  .video-caption h2 {
    font-family: var(--font-serif);
    font-size: 34px;
    font-weight: 400;
  }
  .video-caption p,
  .video-caption .eyebrow {
    color: #111;
  }
  .empty-state {
    background: var(--enlightr-muted);
    margin-top: 24px;
    border: 0;
  }
  @media (max-width: 900px) {
    .catalog {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 560px) {
    .catalog {
      grid-template-columns: 1fr;
    }
    .workspace-title {
      padding: 24px;
    }
    .workspace-actions {
      flex-wrap: wrap;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .video-cover::after {
      transition: none;
    }
  }
</style>
