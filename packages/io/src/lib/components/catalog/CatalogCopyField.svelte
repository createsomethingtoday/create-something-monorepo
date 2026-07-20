<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  let {
    value,
    label = 'Copy',
    language
  }: {
    value: string;
    label?: string;
    language?: string;
  } = $props();

  let enhanced = $state(false);
  let copyState = $state<'idle' | 'copied' | 'failed'>('idle');
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const buttonText = $derived(
    copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Select and copy' : 'Copy'
  );
  const buttonLabel = $derived(
    copyState === 'copied'
      ? `${label}. Copied.`
      : copyState === 'failed'
        ? `${label} failed. Select the command and copy it.`
        : label
  );

  onMount(() => {
    enhanced = true;
  });
  onDestroy(() => clearTimeout(resetTimer));

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      copyState = 'copied';
    } catch {
      copyState = 'failed';
    }

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (copyState = 'idle'), 2000);
  }
</script>

<div class="catalog-copy-field">
  <div class="catalog-copy-field__bar">
    {#if language}<span>{language}</span>{/if}
    {#if enhanced}
      <button type="button" onclick={copy} aria-label={buttonLabel} aria-live="polite">
        {buttonText}
      </button>
    {/if}
  </div>
  <pre><code>{value}</code></pre>
</div>

<style>
  .catalog-copy-field {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-subtle);
  }

  .catalog-copy-field__bar {
    display: flex;
    min-height: 2.5rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-sm);
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-performance-border-default);
  }

  .catalog-copy-field__bar:empty {
    display: none;
  }

  .catalog-copy-field__bar span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  button {
    margin-left: auto;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
  }

  button:hover {
    text-decoration: underline;
  }

  pre {
    max-width: 100%;
    margin: 0;
    padding: 0.9rem;
    overflow-x: auto;
    white-space: pre;
  }

  code {
    color: var(--color-performance-fg-primary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
  }
</style>
