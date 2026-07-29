<script lang="ts">
  import CatalogOpening from './CatalogOpening.svelte';

  type TrustCard = {
    slug: string;
    name: string;
    description: string;
    status: string;
    accessModel: string;
    toolCount: number;
    authModel: string;
    evalStatus: string;
  };

  let {
    kind,
    cards,
    statuses,
    description,
    summary
  }: {
    kind: 'agents' | 'mcp';
    cards: readonly TrustCard[];
    statuses: readonly string[];
    description: string;
    summary: Array<{ label: string; value: string }>;
  } = $props();

  let selectedStatus = $state<string | null>(null);
  const title = $derived(kind === 'agents' ? 'Agent Trust Catalog' : 'MCP Trust Catalog');
  const itemLabel = $derived(kind === 'agents' ? 'agents' : 'servers');
  const filteredCards = $derived(
    selectedStatus ? cards.filter((card) => card.status === selectedStatus) : cards
  );

  function formatStatus(value: string): string {
    return value.replace(/_/g, ' ');
  }
</script>

<CatalogOpening active={kind} {title} {description} {summary} eyebrow="Public trust catalog" />

<section class="io-catalog-collection" aria-labelledby={`${kind}-collection-title`}>
  <div class="collection-inner">
    <header class="collection-heading">
      <div>
        <p>Inspect the boundary</p>
        <h2 id={`${kind}-collection-title`}>{cards.length} public {itemLabel}</h2>
      </div>
      <span>{filteredCards.length} shown</span>
    </header>

    <div class="filter-row" aria-label={`Filter ${itemLabel} by publication status`}>
      <button
        type="button"
        class="filter-chip"
        class:active={selectedStatus === null}
        aria-pressed={selectedStatus === null}
        onclick={() => (selectedStatus = null)}
      >
        All ({cards.length})
      </button>
      {#each statuses as status}
        <button
          type="button"
          class="filter-chip"
          class:active={selectedStatus === status}
          aria-pressed={selectedStatus === status}
          onclick={() => (selectedStatus = status)}
        >
          {formatStatus(status)} ({cards.filter((card) => card.status === status).length})
        </button>
      {/each}
    </div>

    {#if filteredCards.length > 0}
      <div class="trust-grid">
        {#each filteredCards as card}
          <a class="trust-card" href={`/${kind}/${card.slug}`}>
            <div class="card-header">
              <span class="status-badge">{formatStatus(card.status)}</span>
              <span class="access-badge">{formatStatus(card.accessModel)}</span>
            </div>
            <h3>{card.name}</h3>
            <p>{card.description}</p>
            <div class="metrics">
              <span>{card.toolCount} tools</span>
              <span>{card.authModel}{kind === 'mcp' ? ' auth' : ''}</span>
              <span>Eval {card.evalStatus}</span>
            </div>
            <strong>View trust card</strong>
          </a>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No public {itemLabel} match this status.</p>
        <button type="button" onclick={() => (selectedStatus = null)}>Show all</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .io-catalog-collection {
    padding: clamp(2rem, 5vw, 4rem) 1.5rem clamp(4rem, 8vw, 6rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .collection-inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  .collection-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-performance-md);
  }

  .collection-heading div {
    display: grid;
    gap: 0.35rem;
  }

  .collection-heading p,
  .collection-heading h2 {
    margin: 0;
  }

  .collection-heading p,
  .collection-heading > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .collection-heading h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }

  .filter-chip {
    padding: var(--space-performance-xs) var(--space-performance-sm);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-full);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    text-transform: capitalize;
  }

  .filter-chip:hover,
  .filter-chip.active {
    border-color: var(--color-performance-border-strong);
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  .trust-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .trust-card {
    display: flex;
    min-height: 17rem;
    flex-direction: column;
    gap: var(--space-performance-sm);
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .trust-card:hover {
    border-color: var(--color-performance-border-strong);
    transform: translateY(-2px);
  }

  .card-header,
  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
  }

  .status-badge,
  .access-badge,
  .metrics span {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-performance-scale-sm);
    font-size: var(--text-performance-caption);
  }

  .status-badge,
  .metrics span {
    background: var(--color-performance-bg-subtle);
  }

  .access-badge {
    background: var(--color-performance-info-muted);
    color: var(--color-performance-info);
  }

  .trust-card h3,
  .trust-card p {
    margin: 0;
  }

  .trust-card h3 {
    font-size: var(--text-performance-h3);
  }

  .trust-card p {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .metrics {
    margin-top: auto;
    color: var(--color-performance-fg-muted);
  }

  .trust-card strong {
    font-size: var(--text-performance-body-sm);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-md);
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .empty-state p {
    margin: 0;
    color: var(--color-performance-fg-secondary);
  }

  .empty-state button {
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .trust-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .io-catalog-collection {
      padding-inline: 1.25rem;
    }

    .collection-heading,
    .empty-state {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .trust-card {
      transition: none;
    }

    .trust-card:hover {
      transform: none;
    }
  }
</style>
