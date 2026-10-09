<script lang="ts">
  let {
    network,
    canManage = false,
    showName = true
  }: {
    network?: { slug: string; name: string; status?: string } | null;
    canManage?: boolean;
    showName?: boolean;
  } = $props();
</script>

{#if network}
  <aside class="network-context" aria-label="Current network">
    {#if showName}<a
        class="network-name"
        href={network.slug === 'create-something' ? '/library' : `/n/${network.slug}`}
        >{network.name}</a
      >{/if}
    {#if network.status === 'suspended'}
      <div class="network-status">
        <strong>Member access paused</strong>
        <p>
          This network is suspended. {canManage
            ? 'Uploads and playback are paused. Review network settings.'
            : 'Contact the creator if you expected member access.'}
        </p>
        {#if canManage && network.slug !== 'create-something'}<a
            href={`/n/${network.slug}/settings`}>Review network settings</a
          >{/if}
      </div>
    {:else if network.status === 'draft'}
      <p class="draft-status">Draft network · member access is not active.</p>
    {/if}
  </aside>
{/if}

<style>
  .network-context {
    margin-bottom: var(--space-performance-md);
  }
  .network-name {
    display: inline-flex;
    align-items: center;
    min-height: var(--pcn-control-height);
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .network-status {
    border-left: 2px solid var(--state-warning);
    padding: var(--space-performance-sm) var(--space-performance-md);
    margin-top: var(--space-performance-xs);
  }
  .network-status strong {
    color: var(--state-warning);
  }
  .network-status p,
  .draft-status {
    color: var(--muted);
    font-size: 14px;
    margin: var(--space-performance-xs) 0 0;
    max-width: 65ch;
  }
  .network-status a {
    display: inline-flex;
    align-items: center;
    min-height: var(--pcn-control-height);
    font-size: 14px;
  }
</style>
