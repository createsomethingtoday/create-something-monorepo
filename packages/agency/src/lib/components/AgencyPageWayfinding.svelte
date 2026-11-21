<script lang="ts">
  import type { AgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  let { foundation }: { foundation: AgencyPageFoundation } = $props();
</script>
<details class="editorial-page-contents">
  <summary>On this page</summary>
  <nav aria-label="On this page">{#each foundation.chapters as chapter}<a href={'#' + chapter.id}>{chapter.label}</a>{/each}</nav>
</details>
<style>
  .editorial-page-contents { max-width:1152px; margin:0 auto; padding-inline:1rem; color:var(--color-performance-muted); font-size:.85rem; }
  summary { display:list-item; width:fit-content; min-height:44px; padding-block:.75rem; cursor:pointer; }
  nav { display:flex; flex-wrap:wrap; column-gap:1.5rem; padding-block:.5rem; }
  a { display:inline-flex; align-items:center; min-height:44px; color:var(--color-performance-ink); text-underline-offset:.2em; }
</style>
