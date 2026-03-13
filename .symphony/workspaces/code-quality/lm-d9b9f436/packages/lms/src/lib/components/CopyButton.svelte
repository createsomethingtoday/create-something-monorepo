<script lang="ts">
  import { Check, Copy } from 'lucide-svelte';

  interface Props {
    text: string;
  }

  let { text }: Props = $props();
  let copied = $state(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<button 
  class="copy-button" 
  onclick={copyToClipboard}
  title={copied ? 'Copied!' : 'Copy to clipboard'}
  aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
>
  {#if copied}
    <Check size={16} />
    <span>Copied!</span>
  {:else}
    <Copy size={16} />
    <span>Copy</span>
  {/if}
</button>

<style>
  .copy-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .copy-button:hover {
    background: var(--color-bg-subtle);
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .copy-button:active {
    transform: scale(0.98);
  }
</style>
