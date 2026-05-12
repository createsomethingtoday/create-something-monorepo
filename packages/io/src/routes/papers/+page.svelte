<script lang="ts">
  import {
    PropertyArchiveControls,
    PropertyArchiveHero,
    PropertyArchivePagination,
    PropertyArtifactGrid,
    SEO,
    type PropertyArtifact
  } from '@create-something/canon';

  let { data } = $props();
  const papers = $derived(data.papers);

  let searchQuery = $state('');
  let sortValue = $state('newest');
  let categoryFilter = $state('all');
  let currentPage = $state(1);

  const itemsPerPage = 12;

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'research', label: 'Research' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'methodology', label: 'Methodology' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'reading-time', label: 'Quick Reads' }
  ];

  const archiveActions = [
    { href: '/experiments', label: 'Browse Experiments', variant: 'secondary' as const },
    { href: '/methodology', label: 'See Methodology', variant: 'secondary' as const }
  ];

  function matchesSearch(paper: (typeof papers)[number]): boolean {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const title = (paper.title || '').toLowerCase();
    const description = (paper.description || '').toLowerCase();
    const subtitle = (paper.subtitle || '').toLowerCase();
    const keywords =
      paper.keywords?.map((keyword: string) => keyword.toLowerCase()).join(' ') || '';

    return (
      title.includes(query) ||
      description.includes(query) ||
      subtitle.includes(query) ||
      keywords.includes(query)
    );
  }

  function matchesCategory(paper: (typeof papers)[number]): boolean {
    if (categoryFilter === 'all') return true;
    return paper.category === categoryFilter;
  }

  const filteredAndSortedPapers = $derived.by(() => {
    const filtered = papers.filter((paper) => matchesSearch(paper) && matchesCategory(paper));

    return [...filtered].sort((left, right) => {
      if (sortValue === 'reading-time') {
        return (left.readingTime || 0) - (right.readingTime || 0);
      }

      const leftDate = new Date(left.date || 0).getTime();
      const rightDate = new Date(right.date || 0).getTime();
      return sortValue === 'oldest' ? leftDate - rightDate : rightDate - leftDate;
    });
  });

  const resultCount = $derived(filteredAndSortedPapers.length);
  const isFiltered = $derived(searchQuery.trim() !== '' || categoryFilter !== 'all');
  const totalPages = $derived(Math.max(1, Math.ceil(resultCount / itemsPerPage)));
  const paginatedPapers = $derived.by(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPapers.slice(
      startIndex,
      startIndex + itemsPerPage
    ) as PropertyArtifact[];
  });
  const heroMetrics = $derived([
    { value: `${papers.length}`, label: 'published papers' },
    { value: `${filterOptions.length - 1}`, label: 'research categories' },
    { value: `${resultCount}`, label: isFiltered ? 'matching results' : 'available to inspect' },
    { value: '3', label: 'database / automation / judgment frame' }
  ]);
  const resultLabel = $derived(
    isFiltered
      ? `${resultCount} of ${papers.length} papers`
      : `${papers.length} papers / methodology, data, and conclusions you can verify`
  );

  $effect(() => {
    searchQuery;
    categoryFilter;
    sortValue;
    currentPage = 1;
  });
</script>

<SEO
  title={data.meta.title}
  description={data.meta.description}
  keywords="research papers, AI-native development, Claude Code, experiments, methodology, systems thinking"
  canonical="https://createsomething.io/papers"
  propertyName="io"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io' },
    { name: 'Papers', url: 'https://createsomething.io/papers' }
  ]}
/>

<PropertyArchiveHero
  kicker="CREATE SOMETHING .io / Papers"
  title="Papers for operating decisions that need evidence."
  description="The paper archive collects the methodology, data, and conclusions behind CREATE SOMETHING research so a pattern can move from observation into implementation with a trail."
  {resultLabel}
  metrics={heroMetrics}
  actions={archiveActions}
/>

<PropertyArchiveControls
  bind:searchQuery
  searchLabel="Search papers"
  searchPlaceholder="Search papers..."
  bind:filterValue={categoryFilter}
  filterLabel="Category"
  {filterOptions}
  bind:sortValue
  sortLabel="Sort"
  {sortOptions}
/>

<PropertyArtifactGrid
  artifacts={paginatedPapers}
  basePath="/papers"
  kind="paper"
  actionLabel="Read paper"
  emptyTitle="No papers match your filters"
  emptyText="Clear the search or choose another category."
/>

<PropertyArchivePagination
  bind:currentPage
  {totalPages}
  itemCount={paginatedPapers.length}
  totalCount={resultCount}
  noun="papers"
/>
