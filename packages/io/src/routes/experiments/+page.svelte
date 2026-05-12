<script lang="ts">
  import type { PageData } from './$types';
  import {
    PropertyArchiveControls,
    PropertyArchiveHero,
    PropertyArtifactGrid,
    SEO,
    type PropertyArtifact
  } from '@create-something/canon';

  let { data }: { data: PageData } = $props();
  const papers = $derived(data.papers);

  let searchQuery = $state('');
  let masterFilter = $state('all');
  let sortValue = $state('newest');

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'rams', label: 'Minimalism', title: 'Dieter Rams - Less, but better' },
    { value: 'heidegger', label: 'Tool Design', title: 'Tool transparency in use' },
    { value: 'tufte', label: 'Data Viz', title: 'Edward Tufte - evidence display' },
    { value: 'ive', label: 'Motion', title: 'Purposeful motion and feedback' },
    { value: 'canon', label: 'Canon', title: 'CREATE SOMETHING canonical patterns' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'featured', label: 'Featured' }
  ];

  const archiveActions = [
    { href: '/papers', label: 'Read Papers', variant: 'secondary' as const },
    { href: '/methodology', label: 'See Methodology', variant: 'secondary' as const }
  ];

  const masterPrefixes: Record<string, string[]> = {
    rams: ['rams-principle'],
    heidegger: ['heidegger-'],
    tufte: ['tufte-'],
    ive: ['ive-motion', 'ive-'],
    canon: ['subtractive-triad', 'hermeneutic-workflow', 'being-modes']
  };

  function getTestsPrinciples(experiment: unknown): string[] {
    if (typeof experiment !== 'object' || experiment === null) return [];
    const principles = (experiment as { tests_principles?: unknown }).tests_principles;
    return Array.isArray(principles)
      ? principles.filter((principle): principle is string => typeof principle === 'string')
      : [];
  }

  function matchesMasterFilter(experiment: (typeof papers)[number]): boolean {
    if (masterFilter === 'all') return true;

    const principles = getTestsPrinciples(experiment);
    const prefixes = masterPrefixes[masterFilter] ?? [];
    return principles.some((principle) => prefixes.some((prefix) => principle.startsWith(prefix)));
  }

  function matchesSearch(experiment: (typeof papers)[number]): boolean {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const title = (experiment.title || '').toLowerCase();
    const description = (experiment.description || '').toLowerCase();
    const tags = Array.isArray(experiment.tags)
      ? experiment.tags
          .map((tag: string | { name: string }) =>
            typeof tag === 'string' ? tag.toLowerCase() : tag.name.toLowerCase()
          )
          .join(' ')
      : '';

    return title.includes(query) || description.includes(query) || tags.includes(query);
  }

  const filteredAndSortedPapers = $derived.by(() => {
    const filtered = papers.filter(
      (experiment: (typeof papers)[number]) =>
        matchesMasterFilter(experiment) && matchesSearch(experiment)
    );

    return [...filtered].sort((left, right) => {
      if (sortValue === 'featured') {
        const leftFeatured = left.featured ?? 0;
        const rightFeatured = right.featured ?? 0;
        if (rightFeatured !== leftFeatured) return rightFeatured - leftFeatured;
      }

      const leftDate = new Date(left.published_at || left.created_at || 0).getTime();
      const rightDate = new Date(right.published_at || right.created_at || 0).getTime();
      return sortValue === 'oldest' ? leftDate - rightDate : rightDate - leftDate;
    }) as PropertyArtifact[];
  });

  const resultCount = $derived(filteredAndSortedPapers.length);
  const isFiltered = $derived(searchQuery.trim() !== '' || masterFilter !== 'all');
  const heroMetrics = $derived([
    { value: `${papers.length}`, label: 'tracked experiments' },
    { value: `${filterOptions.length - 1}`, label: 'canon lenses' },
    { value: `${resultCount}`, label: isFiltered ? 'matching results' : 'available to inspect' },
    { value: '3', label: 'database / automation / judgment frame' }
  ]);
  const resultLabel = $derived(
    isFiltered
      ? `${resultCount} of ${papers.length} experiments`
      : `${papers.length} tracked experiments / time, cost, errors, and learnings`
  );
</script>

<SEO
  title="All Experiments"
  description="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
  keywords="experiments, AI-native development, Claude Code, tracked experiments, production systems"
  canonical="https://createsomething.io/experiments"
  propertyName="io"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io' },
    { name: 'Experiments', url: 'https://createsomething.io/experiments' }
  ]}
/>

<PropertyArchiveHero
  kicker="CREATE SOMETHING .io / Experiments"
  title="Experiments that turn workflow friction into evidence."
  description="The experiment archive tracks what was tried, what held up, and what should move forward into papers, patterns, or delivery artifacts."
  {resultLabel}
  metrics={heroMetrics}
  actions={archiveActions}
/>

<PropertyArchiveControls
  bind:searchQuery
  searchLabel="Search experiments"
  searchPlaceholder="Search experiments..."
  bind:filterValue={masterFilter}
  filterLabel="Canon lens"
  {filterOptions}
  bind:sortValue
  sortLabel="Sort"
  {sortOptions}
/>

<PropertyArtifactGrid
  artifacts={filteredAndSortedPapers}
  basePath="/experiments"
  kind="experiment"
  actionLabel="Open experiment"
  emptyTitle="No experiments match your filters"
  emptyText="Clear the search or choose another canon lens."
/>
