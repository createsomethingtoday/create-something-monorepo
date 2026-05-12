<script lang="ts">
  type ArchiveOption = {
    value: string;
    label: string;
    title?: string;
  };

  interface Props {
    searchQuery?: string;
    searchLabel: string;
    searchPlaceholder: string;
    filterLabel?: string;
    filterValue?: string;
    filterOptions?: ArchiveOption[];
    sortLabel?: string;
    sortValue?: string;
    sortOptions?: ArchiveOption[];
  }

  let {
    searchQuery = $bindable(''),
    searchLabel,
    searchPlaceholder,
    filterLabel = 'Filter',
    filterValue = $bindable('all'),
    filterOptions = [],
    sortLabel = 'Sort',
    sortValue = $bindable('newest'),
    sortOptions = []
  }: Props = $props();
</script>

<section class="property-archive-controls-section" aria-label="Archive controls">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--soft property-archive-controls">
      <div class="property-archive-search">
        <label for="property-archive-search">{searchLabel}</label>
        <div class="property-archive-search__field">
          <input
            id="property-archive-search"
            type="search"
            bind:value={searchQuery}
            placeholder={searchPlaceholder}
          />
          {#if searchQuery}
            <button type="button" onclick={() => (searchQuery = '')} aria-label="Clear search">
              Clear
            </button>
          {/if}
        </div>
      </div>

      {#if filterOptions.length > 0}
        <div class="property-archive-control-group">
          <span>{filterLabel}</span>
          <div class="property-archive-chip-list">
            {#each filterOptions as option}
              <button
                type="button"
                class:active={filterValue === option.value}
                title={option.title}
                aria-pressed={filterValue === option.value}
                onclick={() => (filterValue = option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if sortOptions.length > 0}
        <div class="property-archive-control-group property-archive-sort">
          <span>{sortLabel}</span>
          <div class="property-archive-segmented">
            {#each sortOptions as option}
              <button
                type="button"
                class:active={sortValue === option.value}
                aria-pressed={sortValue === option.value}
                onclick={() => (sortValue = option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .property-archive-controls-section {
    padding-bottom: clamp(1.5rem, 4vw, 2.5rem);
  }

  .property-archive-controls {
    display: grid;
    grid-template-columns: minmax(18rem, 1fr) minmax(0, 1.1fr) auto;
    gap: 1rem;
    align-items: end;
    --product-surface-padding: clamp(1rem, 2.5vw, 1.4rem);
  }

  .property-archive-search,
  .property-archive-control-group {
    display: grid;
    gap: 0.55rem;
  }

  .property-archive-search label,
  .property-archive-control-group > span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .property-archive-search__field {
    position: relative;
  }

  .property-archive-search input {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.72rem 4.2rem 0.72rem 0.9rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 72%, transparent);
    color: var(--color-fg-primary);
    font: inherit;
  }

  .property-archive-search input::placeholder {
    color: var(--color-fg-muted);
  }

  .property-archive-search input:focus {
    outline: none;
    border-color: var(--color-brand-primary-border);
    box-shadow: 0 0 0 3px rgba(49, 92, 255, 0.12);
  }

  .property-archive-search__field button {
    position: absolute;
    top: 50%;
    right: 0.55rem;
    transform: translateY(-50%);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .property-archive-chip-list,
  .property-archive-segmented {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .property-archive-chip-list button,
  .property-archive-segmented button {
    min-height: 2.35rem;
    padding: 0.55rem 0.78rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    transition:
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .property-archive-segmented {
    padding: 0.24rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 68%, transparent);
  }

  .property-archive-segmented button {
    border-color: transparent;
    background: transparent;
  }

  .property-archive-chip-list button:hover,
  .property-archive-segmented button:hover,
  .property-archive-chip-list button.active,
  .property-archive-segmented button.active {
    border-color: var(--color-shell-border-strong);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  @media (max-width: 1080px) {
    .property-archive-controls {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
  }
</style>
