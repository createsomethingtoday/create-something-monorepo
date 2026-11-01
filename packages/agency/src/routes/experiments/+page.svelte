<script lang="ts">
  import { PerformanceCampaignOpening, SEO } from '@create-something/canon';
  import { IO_EXPERIMENTS_URL, IO_PAPERS_URL } from '$lib/data/ioResearchLinks';
</script>

<SEO title="Experiments and research" description="Explore CREATE SOMETHING experiments, research papers, evidence and limits on .io." propertyName="agency" noindex={true} breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Experiments', url: '/experiments' }]} />

<PerformanceCampaignOpening
  eyebrow="Research on .io"
  expression="editorial"
  title="See what was built and tested."
  lede="Our research lives on .io. Explore the experiments, evidence and limits."
  density="compact"
  media={{src:'/images/performance-lab/pressure-boundary-natural.webp',mobileSrc:'/images/performance-lab/pressure-boundary-natural-mobile.webp',alt:'Black-and-white engineered boundary holding pressure between two surfaces'}}
  proof={[{label:'Research home',value:'.io'},{label:'Claims',value:'Inspectable'},{label:'Limits',value:'Visible'}]}
>
  {#snippet actions()}
    <nav class="research-links" aria-label="Research destinations">
      <a href={IO_EXPERIMENTS_URL}>Browse experiments on .io <span aria-hidden="true">↗</span></a>
      <a href={IO_PAPERS_URL}>Read research papers on .io <span aria-hidden="true">↗</span></a>
    </nav>
  {/snippet}
</PerformanceCampaignOpening>

<style>
  .research-links{display:flex;flex-wrap:wrap;gap:var(--space-performance-md)}
  .research-links a{display:inline-flex;align-items:center;gap:var(--space-performance-sm);min-height:44px;padding:var(--space-performance-sm) var(--space-performance-md);border:1px solid currentColor;color:inherit;text-underline-offset:0.25em}
  .research-links a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
</style>
