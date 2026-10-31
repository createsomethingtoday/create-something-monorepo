<script lang="ts">
  import AgencyWayfindingSign from './AgencyWayfindingSign.svelte';
  import { PUBLIC_PRODUCT_SEQUENCE, getPublicProduct } from '$lib/data/productFamily';

  const pathRoles = { map: 'Define', build: 'Connect', control: 'Operate · includes Map' };

  let { label = 'Choose a service path' }: { label?: string } = $props();
</script>

<nav class="path-choices" aria-label={label}>
  <p>Choose the support you need. These are separate options; Control includes Map.</p>
  <ul>
    {#each PUBLIC_PRODUCT_SEQUENCE as kind}
      {@const product = getPublicProduct(kind)}
      <li><AgencyWayfindingSign {kind} label={product.shortName} detail={pathRoles[kind]} href={product.route} /></li>
    {/each}
  </ul>
</nav>

<style>
  .path-choices { color: inherit; margin-block: var(--space-performance-lg); }
  p { max-width: 65ch; margin: 0 0 var(--space-performance-sm); font-size: var(--text-performance-caption); line-height: 1.5; }
  ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-performance-sm); list-style: none; margin: 0; padding: 0; }
  li { min-width: 0; }
  li :global(.agency-sign) { height: 100%; }
  @media (max-width: 760px) { ul { grid-template-columns: 1fr; } }
</style>
