<!--
  PageLayout

  Standard page wrapper providing consistent structure.
  Heideggerian: The layout recedes, content emerges.

  @usage
  <PageLayout>
    <YourContent />
  </PageLayout>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<main class="page-layout {className}">
  {@render children()}
</main>

<style>
  .page-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
