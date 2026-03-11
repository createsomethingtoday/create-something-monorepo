<script lang="ts">
  import { Search as SearchIcon, X } from 'lucide-svelte';
  import { onDestroy } from 'svelte';

  interface Props {
    onSearch?: (term: string) => void;
    placeholder?: string;
    value?: string;
    ariaLabel?: string;
  }

  let {
    onSearch,
    placeholder = 'Search templates...',
    value = '',
    ariaLabel = 'Search'
  }: Props = $props();

  let draftValue = $state('');
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    draftValue = value;
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    draftValue = target.value;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      onSearch?.(draftValue);
    }, 300);
  }

  function handleClear() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    draftValue = '';
    onSearch?.('');
  }

  onDestroy(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });
</script>

<div class="search-wrapper">
  <SearchIcon class="search-icon" size={16} />
  <input
    type="search"
    class="search-input"
    {placeholder}
    value={draftValue}
    oninput={handleInput}
    autocomplete="off"
    aria-label={ariaLabel}
  />
  {#if draftValue}
    <button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear search">
      <X size={14} />
    </button>
  {/if}
</div>

<style>
  .search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    box-shadow: none;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .search-wrapper:focus-within {
    border-color: var(--color-info-border);
    box-shadow: 0 0 0 4px var(--color-info-muted);
  }

  :global(.search-icon) {
    position: absolute;
    left: 0.875rem;
    color: var(--color-fg-muted);
    pointer-events: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .search-wrapper:focus-within :global(.search-icon) {
    color: var(--color-info);
  }

  .search-input {
    width: 100%;
    height: 2.75rem;
    padding: 0.5rem 2.5rem 0.5rem 2.75rem;
    font-size: 1rem;
    color: var(--color-fg-primary);
    background: transparent;
    border: none;
    outline: none;
  }

  .search-input::placeholder {
    color: var(--color-fg-muted);
  }

  .search-input:focus {
    box-shadow: none;
  }

  .search-input:focus-visible {
    outline: none;
  }

  .clear-btn {
    position: absolute;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    color: var(--color-fg-muted);
    background: transparent;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition:
      color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .clear-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .clear-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px var(--color-info-muted);
  }

  @media (min-width: 768px) {
    .search-input {
      font-size: var(--text-body-sm);
    }
  }
</style>
