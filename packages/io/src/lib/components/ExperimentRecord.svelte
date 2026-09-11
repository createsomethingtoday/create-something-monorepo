<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    label?: string;
  }

  let { children, label = 'Open the full research record' }: Props = $props();
</script>

<details class="record">
  <summary>{label}<span aria-hidden="true">＋</span></summary>
  <div class="record-body">{@render children()}</div>
</details>

<style>
  .record {
    max-width: 80rem;
    margin: 2rem auto;
    border-block: 1px solid var(--color-performance-border-subtle, currentColor);
  }
  summary {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 0;
    cursor: pointer;
    font-weight: 700;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .record[open] summary span {
    transform: rotate(45deg);
  }
  .record-body {
    padding-block: 1rem 3rem;
  }
</style>
