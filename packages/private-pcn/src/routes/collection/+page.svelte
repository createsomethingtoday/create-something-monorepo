<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { assetKinds } from '$lib/assets';
  import { filterCollection } from '$lib/collection';
  let { data } = $props();
  let query = $state('');
  let kind = $state('');
  const items = $derived(filterCollection(data.collection, query, kind));
  function clearFilters() {
    query = '';
    kind = '';
  }
</script>

<svelte:head
  ><title>Your collection | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="member-workspace">
  <header class="member-heading">
    <div>
      <p class="eyebrow">PRIVATE / YOUR COLLECTION</p>
      <h1>Your collection.</h1>
      <p class="member-intro">
        The MCP servers, plugins and skills you’ve acquired. Return to the exact release, its
        license and installation guide.
      </p>
    </div>
    <a href="/library">Explore sessions <Icon name="arrow-right" /></a>
  </header>
  {#if data.collection.length}
    <div class="collection-tools">
      <label
        >Search your collection<input
          type="search"
          bind:value={query}
          placeholder="Title, creator network or version"
        /></label
      >
      <label
        >Asset type<select bind:value={kind}
          ><option value="">All types</option
          >{#each Object.entries(assetKinds) as [value, label]}<option {value}>{label}</option
            >{/each}</select
        ></label
      >
      <p role="status">{items.length} of {data.collection.length} releases</p>
    </div>
    {#if items.length}<div class="collection-grid">
        {#each items as item (item.release_id)}<article class="release-card">
            <div class="release-meta">
              <span><Icon name={item.kind} size={20} /> {assetKinds[item.kind]}</span><span
                class="release-status"
                >{item.status === 'active' ? 'Acquired' : 'Access revoked'}</span
              >
            </div>
            <h2>{item.title}</h2>
            <p class="release-source">{item.network_name} <span>· v{item.version}</span></p>
            {#if item.status === 'active'}<p class="release-help">
                Review permissions and installation checks before using this release.
              </p>
              <a
                class="button secondary"
                href={`/n/${item.slug}/assets/${item.id}?release=${item.release_id}`}
                >Open release <Icon name="arrow-right" /></a
              >
            {:else}<p class="release-help">
                This release is no longer available to your account. Contact the creator who shared
                it for help with access.
              </p>{/if}
          </article>{/each}
      </div>{:else}<section class="collection-empty">
        <h2>No releases match.</h2>
        <p>Try a different title, network or asset type.</p>
        <button class="button secondary" onclick={clearFilters}>Clear filters</button>
      </section>{/if}
  {:else}<section class="collection-empty" aria-labelledby="first-asset-title">
      <Icon name="package" size={32} />
      <p class="eyebrow">YOUR FIRST ASSET</p>
      <h2 id="first-asset-title">Start with a builder you trust.</h2>
      <ol class="collection-steps">
        <li>
          <strong>Open their asset link.</strong><span
            >Creators share packages from their own networks.</span
          >
        </li>
        <li>
          <strong>Check what it needs.</strong><span
            >Review the runtime, permissions, license and any price.</span
          >
        </li>
        <li>
          <strong>Add the release.</strong><span
            >Claim a free asset or complete an available checkout. Your release will appear here.</span
          >
        </li>
      </ol>
      <p class="member-intro">
        You don’t need to create a network to collect assets. Private listings may require an
        invitation.
      </p>
      <a class="button secondary" href="/library">Explore the library <Icon name="arrow-right" /></a
      >
    </section>{/if}
  <p class="collection-footer">
    Have a technique to teach? <a href="/apply">Apply as a creator <Icon name="arrow-right" /></a>
  </p>
</main>

<style>
  .member-workspace {
    max-width: 1280px;
    margin: auto;
    padding: var(--space-performance-lg) 4.5vw var(--space-performance-xl);
  }
  .member-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-performance-md);
    padding-bottom: var(--space-performance-lg);
    border-bottom: 1px solid var(--line);
  }
  .member-heading .eyebrow {
    margin-bottom: var(--space-performance-sm);
  }
  h1 {
    font-size: clamp(36px, 4vw, 56px);
    letter-spacing: -0.04em;
    margin-bottom: var(--space-performance-sm);
  }
  .member-intro {
    max-width: 62ch;
    color: var(--muted);
    margin-bottom: 0;
  }
  .member-heading > a {
    flex-shrink: 0;
    display: inline-flex;
    gap: var(--space-performance-xs);
    align-items: center;
    min-height: 44px;
    font-size: 14px;
  }
  .collection-tools {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-performance-sm);
    margin-block: var(--space-performance-md);
  }
  .collection-tools label:first-child {
    flex: 2;
  }
  .collection-tools label {
    min-width: min(100%, 180px);
    flex: 1;
  }
  .collection-tools p {
    font: 12px var(--font-performance-mono);
    color: var(--muted);
  }
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: var(--space-performance-md);
    margin-top: var(--space-performance-md);
  }
  .release-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    padding: var(--space-performance-md);
    min-width: 0;
  }
  .release-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
    justify-content: space-between;
    font: 11px var(--font-performance-mono);
    color: var(--muted);
    margin-bottom: var(--space-performance-md);
  }
  .release-meta > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
  }
  .release-status {
    border: 1px solid var(--line);
    padding: 4px 8px;
    color: var(--paper);
  }
  h2 {
    font-size: 26px;
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }
  .release-source {
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .release-source span {
    color: var(--muted);
  }
  .release-help {
    color: var(--muted);
    font-size: 14px;
  }
  .release-card .button {
    margin-top: auto;
  }
  .collection-empty {
    border: 1px solid var(--line);
    padding: var(--space-performance-lg);
    margin-top: var(--space-performance-lg);
  }
  .collection-empty .eyebrow {
    margin-block: var(--space-performance-sm);
  }
  .collection-steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-left: var(--space-performance-md);
    gap: var(--space-performance-lg);
    margin-block: var(--space-performance-lg);
  }
  .collection-steps strong,
  .collection-steps span {
    display: block;
  }
  .collection-steps span {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
    margin-top: var(--space-performance-xs);
  }
  .collection-empty .button {
    margin-top: var(--space-performance-md);
  }
  .collection-footer {
    margin-top: var(--space-performance-lg);
    font-size: 14px;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .member-heading {
      flex-direction: column;
      align-items: flex-start;
    }
    .collection-steps {
      grid-template-columns: 1fr;
      gap: var(--space-performance-md);
    }
    .collection-empty {
      padding: var(--space-performance-md);
    }
    .member-workspace {
      padding-top: var(--space-performance-md);
    }
  }
</style>
