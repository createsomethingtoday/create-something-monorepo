<script lang="ts">
  import StateBadge from '$lib/components/StateBadge.svelte';
  import StatusNotice from '$lib/components/StatusNotice.svelte';

  import Icon from '$lib/components/Icon.svelte';
  import { assetKinds, assetPrice } from '$lib/assets';
  import { api } from '$lib/client';
  let { data } = $props();
  let title = $state(''),
    summary = $state(''),
    kind = $state('mcp'),
    price = $state('0'),
    audience = $state('members');
  let query = $state(''),
    filter = $state(''),
    busy = $state(false),
    message = $state('');
  const matches = $derived(
    data.assets.filter(
      (a) =>
        (!filter || a.kind === filter) &&
        `${a.title} ${a.summary}`.toLowerCase().includes(query.trim().toLowerCase())
    )
  );
  async function create(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      const result = await api(
        'assets',
        { title, summary, kind, price, audience },
        data.network!.slug
      );
      window.location.assign(`/n/${data.network!.slug}/assets/${result.id}`);
    } catch (e) {
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>{data.network?.name} · Assets | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <div class="workspace-trail">
    <a href={`/n/${data.network?.slug}`}>{data.network?.name}</a><span>/</span><span>Assets</span>
  </div>
  <p class="eyebrow">MCP SERVERS / PLUGINS / SKILLS / WORKFLOWS</p>
  <h1>Build on<br /><em>working practice.</em></h1>
  <p class="lede">
    Reusable engineering assets, with the context to understand them. Check the runtime, permissions
    and license before adding anything to your setup.
  </p>
  {#if data.memberAccessRequired}
    <section class="builder-panel">
      <h2>This network is private.</h2>
      <p>Use the email your builder invited. Creating an account does not grant membership.</p>
      <a
        class="button"
        href={`/login?next=${encodeURIComponent(`/n/${data.network!.slug}/assets`)}`}
        >Sign in to this network <Icon name="arrow-right" /></a
      >
    </section>
  {:else}
    <div class="catalog-tools">
      <label
        >Find an asset<input
          type="search"
          bind:value={query}
          placeholder="Search by name or technique"
        /></label
      ><label
        >Asset type<select bind:value={filter}
          ><option value="">All types</option
          >{#each Object.entries(assetKinds) as [value, label]}<option {value}>{label}</option
            >{/each}</select
        ></label
      >
    </div>
    <div class="builder-grid">
      {#each matches as asset}<a
          class="asset-card"
          href={`/n/${data.network!.slug}/assets/${asset.id}`}
          ><p class="eyebrow">
            <Icon name={asset.kind} size={20} />
            {assetKinds[asset.kind]}
          </p>
          {#if data.owner}<StateBadge
              label={asset.visibility === 'published'
                ? 'Published'
                : asset.visibility === 'archived'
                  ? 'Archived'
                  : 'Draft'}
              tone={asset.visibility === 'published' ? 'success' : 'neutral'}
              icon={asset.visibility === 'published'
                ? 'check'
                : asset.visibility === 'archived'
                  ? 'archive'
                  : 'document'}
            />{/if}
          <h2>{asset.title}</h2>
          <p>{asset.summary}</p>
          <div class="card-foot">
            <span>{assetPrice(asset.price_cents)}{asset.price_cents ? ' USD' : ''}</span><span
              >Inspect asset <Icon name="arrow-right" /></span
            >
          </div></a
        >
      {:else}<div class="builder-panel">
          <h2>
            {query || filter
              ? 'No matching assets.'
              : 'The next useful building block starts here.'}
          </h2>
          <p>
            {data.owner
              ? 'Create a draft, attach a versioned package, then review the buyer experience before publishing.'
              : 'There are no published assets available to you yet. Your builder will share releases here.'}
          </p>
          {#if query || filter}<button
              class="button secondary"
              onclick={() => {
                query = '';
                filter = '';
              }}>Clear filters</button
            >{/if}
        </div>{/each}
    </div>
  {/if}
  {#if data.owner}<section class="builder-split">
      <div>
        <p class="eyebrow">01 / PACKAGE YOUR PRACTICE</p>
        <h2>Make something<br /><em>others can use.</em></h2>
        <p>
          Start with one focused capability. Your draft stays private while you add a ZIP package,
          release notes and installation guidance.
        </p>
        <p class="muted">
          Paid publishing opens after seller payments are configured. Saving a price does not enable
          checkout.
        </p>
      </div>
      <form onsubmit={create} class="builder-form">
        <label
          >Asset name<input
            bind:value={title}
            maxlength="100"
            required
            placeholder="Repository review skill"
          /></label
        ><label
          >What does it help a builder do?<textarea
            bind:value={summary}
            maxlength="1000"
            required
            placeholder="Review a pull request against your team's engineering practices."
          ></textarea></label
        ><label
          >Package type<select bind:value={kind}
            >{#each Object.entries(assetKinds) as [value, label]}<option {value}>{label}</option
              >{/each}</select
          ></label
        ><label
          >Price in USD<input
            bind:value={price}
            inputmode="decimal"
            required
            aria-describedby="price-help"
          /></label
        >
        <p id="price-help" class="muted">
          Enter 0 for a free release, or $1–$9,999 for a one-time purchase. Network hosting is
          billed separately.
        </p>
        <label
          >Who can discover it?<select bind:value={audience}
            ><option value="members">Invited network members</option><option value="public"
              >Public, when this network allows previews</option
            ></select
          ></label
        >
        <p class="muted">
          A purchase grants the selected release. It does not include private sessions, future
          versions, or permission to redistribute.
        </p>
        {#if message}<StatusNotice tone="error" {message} />{/if}<button
          class="button"
          disabled={busy}>{busy ? 'Saving…' : 'Create asset draft'} <Icon name="plus" /></button
        >
      </form>
    </section>{/if}
</main>
