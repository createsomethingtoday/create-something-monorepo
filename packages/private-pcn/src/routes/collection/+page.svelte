<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { assetKinds } from '$lib/assets';
  let { data } = $props();
</script>

<svelte:head
  ><title>Your collection | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / YOUR COLLECTION</p>
  <h1>Your tools.<br /><em>Ready to build.</em></h1>
  <p class="lede">
    Your acquired releases live here. Open an asset to review its license, download the package and
    follow the builder’s installation checks.
  </p>
  <div class="builder-grid">
    {#each data.collection as item}<article class="asset-card">
        <p class="eyebrow">
          <Icon name={item.kind} size={20} />
          {assetKinds[item.kind]} / v{item.version}
        </p>
        <h2>{item.title}</h2>
        <p>{item.network_name}</p>
        {#if item.status === 'active'}<a
            href={`/n/${item.slug}/assets/${item.id}?release=${item.release_id}`}
            >Open package and installation guide <Icon name="arrow-right" /></a
          >{:else}<p class="availability">
            Access to this release has been revoked. Contact the builder for payment support.
          </p>{/if}
      </article>{:else}<section class="builder-panel">
        <p class="eyebrow">YOUR FIRST ASSET</p>
        <h2>Start with a builder you trust.</h2>
        <ol class="install-steps">
          <li>Open the asset link shared by your builder.</li>
          <li>Check its runtime, access requirements, license and price.</li>
          <li>Complete the purchase, then return here for your package.</li>
        </ol>
        <p class="muted">
          You don’t need to create or subscribe to a network to collect assets. Private listings may
          require an invitation.
        </p>
        <a href="/library">Browse available sessions <Icon name="arrow-right" /></a>
      </section>{/each}
  </div>
  <p class="workspace-trail">
    Have a technique to share? <a href="/apply">Apply as a creator <Icon name="arrow-right" /></a>
  </p>
</main>
