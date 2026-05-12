<script lang="ts">
  interface Props {
    currentPage?: number;
    totalPages: number;
    itemCount: number;
    totalCount: number;
    noun?: string;
  }

  let {
    currentPage = $bindable(1),
    totalPages,
    itemCount,
    totalCount,
    noun = 'items'
  }: Props = $props();

  const pageNumbers = $derived(Array.from({ length: totalPages }, (_, index) => index + 1));

  function shouldShowPage(page: number): boolean {
    return (
      page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)
    );
  }

  function shouldShowEllipsis(page: number): boolean {
    return page === currentPage - 2 || page === currentPage + 2;
  }
</script>

{#if totalPages > 1}
  <nav class="property-archive-pagination" aria-label="Archive pagination">
    <div class="property-archive-pagination__controls">
      <button
        type="button"
        disabled={currentPage === 1}
        onclick={() => (currentPage = Math.max(1, currentPage - 1))}
      >
        Previous
      </button>

      <div class="property-archive-pagination__pages">
        {#each pageNumbers as page}
          {#if shouldShowPage(page)}
            <button
              type="button"
              class:active={currentPage === page}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              onclick={() => (currentPage = page)}
            >
              {page}
            </button>
          {:else if shouldShowEllipsis(page)}
            <span>...</span>
          {/if}
        {/each}
      </div>

      <button
        type="button"
        disabled={currentPage === totalPages}
        onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
      >
        Next
      </button>
    </div>

    <p>Page {currentPage} of {totalPages} / showing {itemCount} of {totalCount} {noun}</p>
  </nav>
{/if}

<style>
  .property-archive-pagination {
    display: grid;
    gap: 0.85rem;
    justify-items: center;
    padding: 0 clamp(1.5rem, 4vw, 2rem) clamp(3rem, 6vw, 5rem);
  }

  .property-archive-pagination__controls,
  .property-archive-pagination__pages {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    align-items: center;
    justify-content: center;
  }

  .property-archive-pagination button,
  .property-archive-pagination__pages span {
    min-height: 2.35rem;
    padding: 0.55rem 0.78rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .property-archive-pagination button:hover:not(:disabled),
  .property-archive-pagination button.active {
    border-color: var(--color-shell-border-strong);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .property-archive-pagination button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .property-archive-pagination p {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
