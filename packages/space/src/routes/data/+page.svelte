<script lang="ts">
  import {
    ClearCardGrid,
    ClearPageSection,
    SEO,
    type ClearCardItem
  } from '@create-something/canon';

  const datasets: ClearCardItem[] = [
    {
      eyebrow: 'Live data',
      icon: 'settings',
      title: 'NBA Live',
      href: '/data/nba',
      detail:
        'Inspect real-time NBA game data with play-by-play, box scores, shot networks, and pace analysis.',
      points: [
        'Worker-backed data with rate limiting and caching',
        'Historical snapshots for repeatable analysis',
        'Runtime surface built for inspection, not decoration'
      ]
    }
  ];
</script>

<SEO
  title="Data Studio"
  description="Live data dashboards with real-time updates. Explore NBA analytics, player synergies, and league insights."
  keywords="data studio, live dashboards, NBA analytics, real-time data, Cloudflare Workers"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Data Studio', url: 'https://createsomething.space/data' }
  ]}
/>

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Live data"
  title="Inspect the runtime data before you trust the pattern."
  description="Data Studio is the workbench surface for dashboards, historical snapshots, and derived metrics that need to stay useful under refresh and caching conditions."
>
  {#snippet after()}
    <ClearCardGrid items={datasets} columns={1} ariaLabel="Available live data surfaces" />
  {/snippet}
</ClearPageSection>
