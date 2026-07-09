<script lang="ts">
  import type { PageData } from './$types';
  import ImageLightbox from '$lib/components/taste/ImageLightbox.svelte';
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearMetadataRail,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearMetadataGroup
  } from '@create-something/canon';

  let { data }: { data: PageData } = $props();

  // Lightbox state
  let selectedImageIndex = $state(-1);
  let isLightboxOpen = $derived(selectedImageIndex >= 0);

  function openLightbox(index: number) {
    selectedImageIndex = index;
  }

  function closeLightbox() {
    selectedImageIndex = -1;
  }

  function navigateLightbox(index: number) {
    selectedImageIndex = index;
  }

  const sourceGroups = $derived([
    {
      label: 'CREATE SOMETHING',
      channels: data.channels.filter((channel) => channel.isPrimary)
    },
    {
      label: 'External',
      channels: data.channels.filter((channel) => !channel.isPrimary)
    }
  ]);

  // Format date for display
  function formatDate(dateValue: string | number | null): string {
    if (dateValue === null) return 'Never';
    const date =
      typeof dateValue === 'number'
        ? new Date(dateValue < 1_000_000_000_000 ? dateValue * 1000 : dateValue)
        : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  const tasteMetadataGroups = $derived<ClearMetadataGroup[]>([
    {
      title: 'Current corpus',
      items: [
        { label: 'Examples', value: String(data.stats.examples) },
        { label: 'Resources', value: String(data.stats.resources) },
        { label: 'Last sync', value: formatDate(data.stats.lastSync) }
      ]
    },
    {
      title: 'Reading path',
      items: [
        {
          label: 'Next action',
          value: 'Inspect taste pattern',
          href: '/taste/insights'
        },
        {
          label: 'Source',
          value: 'Are.na channels',
          href: 'https://www.are.na/create-something'
        }
      ]
    }
  ]);

  const tasteEvidenceGroups = $derived<ClearMetadataGroup[]>([
    {
      title: 'Observed corpus',
      items: [
        { label: 'Examples', value: String(data.stats.examples) },
        { label: 'Resources', value: String(data.stats.resources) },
        { label: 'Last sync', value: formatDate(data.stats.lastSync) }
      ]
    },
    {
      title: 'System posture',
      items: [
        { label: 'Agent context', value: 'Active', href: '/llm.txt' },
        { label: 'Context API', value: 'Active', href: '/api/taste/context' },
        { label: 'Performance Lab', value: 'Required', href: '/standards' },
        { label: 'Self healing', value: 'Partial' }
      ]
    }
  ]);

  const performanceLoopGroups: ClearMetadataGroup[] = [
    {
      title: 'Reference',
      items: [
        { label: 'House system', value: 'Performance Lab', href: '/standards' },
        { label: 'Local standard', value: 'Performance Lab UI', href: '/standards' }
      ]
    },
    {
      title: 'Review gate',
      items: [
        { label: 'Feed discovery', value: 'Proposal only' },
        { label: 'Human interface', value: 'Agent and mobile first' },
        { label: 'Copy rule', value: 'Plain, direct, outcome first' },
        { label: 'Design rule', value: 'Light, legible, proof nearby' }
      ]
    }
  ];

  const sampleTasteSystemGroups: ClearMetadataGroup[] = [
    {
      title: 'Input',
      items: [
        { label: 'Client sources', value: 'product, brand, competitors' },
        { label: 'Corpus', value: 'references and examples' }
      ]
    },
    {
      title: 'Output',
      items: [
        { label: 'Principles', value: 'decision language' },
        { label: 'Standards', value: 'AI-ready context pack' },
        { label: 'Implementation', value: 'site, product, workflow' }
      ]
    }
  ];

  const tasteSystemCards: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'folder',
      title: 'Reference corpus',
      detail: 'Gather the visual, product, and workflow examples that show what good already means.'
    },
    {
      eyebrow: '02',
      icon: 'search',
      title: 'Taste principles',
      detail: 'Read the corpus for repeatable judgment: restraint, hierarchy, pacing, and proof.'
    },
    {
      eyebrow: '03',
      icon: 'document',
      title: 'Reusable standards',
      detail: 'Turn subjective preference into artifacts an operator, designer, or agent can follow.'
    },
    {
      eyebrow: '04',
      icon: 'settings',
      title: 'Implementation direction',
      detail: 'Apply the standards to a page, product surface, content system, or automation workflow.'
    }
  ];

  const tasteEvidenceCards: ClearCardItem[] = [
    {
      eyebrow: 'Surface',
      icon: 'folder',
      title: 'Gallery informs proof',
      detail: '/taste reads synced D1 examples and resources from the arena-taste corpus.',
      href: '#source-channels'
    },
    {
      eyebrow: 'Context',
      icon: 'document',
      title: 'Corpus informs agents',
      detail: '/llm.txt and /api/taste/context expose principles, source channels, and token mappings.',
      href: '/api/taste/context'
    },
    {
      eyebrow: 'Canon',
      icon: 'settings',
      title: 'References inform standards',
      detail: 'The context maps Rams, Swiss design, motion, and minimalism into reusable design language.'
    },
    {
      eyebrow: 'Status',
      icon: 'warning',
      title: 'Self healing is partial',
      detail: 'Sync can refresh records, but canon and product standards still need operator approval.'
    }
  ];

  const performanceLoopCards: ClearCardItem[] = [
    {
      eyebrow: 'Observe',
      icon: 'search',
      title: 'Search the feed for Performance Lab signals',
      detail: 'Use Are.na discovery to propose references with literal offers, quiet surfaces, visible proof, and direct actions.'
    },
    {
      eyebrow: 'Translate',
      icon: 'settings',
      title: 'Convert patterns into Canon',
      detail: 'Use owned tokens and primitives for light surfaces, crisp borders, compact navigation, and readable hierarchy.'
    },
    {
      eyebrow: 'Audit',
      icon: 'check',
      title: 'Review from an operator phone',
      detail: 'Give the human a mobile-first approve, reject, or redirect interface while the agent carries the full context.'
    },
    {
      eyebrow: 'Improve',
      icon: 'arrow-right',
      title: 'Ship reviewed corrections',
      detail: 'Let TASTE propose design and language updates, then promote them through normal checks and operator approval.'
    }
  ];

  const principleCards: ClearCardItem[] = [
    {
      title: 'Negative Space',
      detail: 'Let elements breathe. Absence is presence.'
    },
    {
      title: 'Monochrome First',
      detail: 'Color as emphasis, not decoration.'
    },
    {
      title: 'Typography as Structure',
      detail: 'Type creates hierarchy without ornament.'
    },
    {
      title: 'Purposeful Motion',
      detail: 'Animation reveals state and guides attention.'
    }
  ];

  const businessCtaItems: ClearCtaItem[] = [
    {
      label: 'Audit',
      icon: 'search',
      title: 'Map the current taste signals',
      detail: 'Pull the strongest internal, external, and competitor references into one corpus.'
    },
    {
      label: 'System',
      icon: 'document',
      title: 'Package the standards',
      detail: 'Translate the corpus into principles, source rules, and implementation criteria.'
    },
    {
      label: 'Deploy',
      icon: 'arrow-right',
      title: 'Use it where money moves',
      detail: 'Apply the taste system to web, product, content, and AI-assisted delivery.'
    }
  ];
</script>

<SEO
  title="Taste Pattern"
  description="Visual references, source channels, and derived principles that make CREATE SOMETHING taste inspectable before it becomes a standard."
  keywords="minimalist design, visual references, design inspiration, Dieter Rams, Swiss design, Canon, Are.na curation"
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Taste', url: 'https://createsomething.ltd/taste' }
  ]}
/>

<ClearPageSection
  class="taste-hero"
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Visual Reference"
  title="Make taste inspectable."
  description="Human-curated visual references from Are.na, source channels, and derived principles that show why a design decision earns its place."
>
  {#snippet actions()}
    <Button href="/taste/insights">Inspect Pattern</Button>
    <Button href="#source-channels" variant="secondary">View Sources</Button>
  {/snippet}

  {#snippet aside()}
    <ClearMetadataRail
      eyebrow="Proof rail"
      title="Taste reference state"
      description="Managed as inspectable evidence, not decoration."
      groups={tasteMetadataGroups}
      tags={['human curation', 'source channels', 'derived principles']}
      ariaLabel="Taste reference metadata"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="taste-system"
  variant="white"
  layout="split"
  eyebrow="Taste system"
  title="Turn taste into standards a team can execute."
  description="TASTE is the commercial angle for the Are.na corpus: a way to convert human curation into product standards, creative direction, and AI context that can shape revenue-generating work."
>
  {#snippet actions()}
    <Button href="https://createsomething.agency">Build This For Your Product</Button>
    <Button href="#source-channels" variant="secondary">Inspect The Corpus</Button>
  {/snippet}

  {#snippet aside()}
    <ClearMetadataRail
      eyebrow="Deliverable"
      title="Taste system report"
      description="A practical artifact for founders, teams, and agents."
      groups={sampleTasteSystemGroups}
      tags={['reference corpus', 'decision standards', 'implementation']}
      ariaLabel="Taste system deliverable metadata"
    />
  {/snippet}

  {#snippet after()}
    <ClearCardGrid
      items={tasteSystemCards}
      columns={4}
      density="compact"
      ariaLabel="Taste system workflow"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="taste-evidence"
  variant="soft"
  layout="split"
  eyebrow="Operating evidence"
  title="How TASTE informs CREATE SOMETHING today."
  description="TASTE is already feeding the public proof surface, the agent-readable context layer, and the canon vocabulary. It is not complete self-healing yet: the system can ingest and refresh references, but it does not automatically rewrite standards or deploy product changes without review."
>
  {#snippet actions()}
    <Button href="/llm.txt">Read Agent Context</Button>
    <Button href="/api/taste/context" variant="secondary">Inspect Context API</Button>
  {/snippet}

  {#snippet aside()}
    <ClearMetadataRail
      eyebrow="Observed"
      title="Current system state"
      description="Evidence from the live corpus and exposed context surfaces."
      groups={tasteEvidenceGroups}
      tags={['active context', 'partial automation', 'operator gated']}
      ariaLabel="Taste system evidence metadata"
    />
  {/snippet}

  {#snippet after()}
    <ClearCardGrid
      items={tasteEvidenceCards}
      columns={4}
      density="compact"
      ariaLabel="Taste operating evidence"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="performance-loop"
  variant="white"
  layout="split"
  eyebrow="Continuous improvement"
  title="Use TASTE to keep Performance Lab sharp."
  description="The loop is not passive inspiration. TASTE should continuously compare CREATE SOMETHING surfaces against the Performance Lab standard, translate useful references into Canon primitives, and produce reviewed design and language corrections through an agent-first, mobile-first operator interface."
>
  {#snippet actions()}
    <Button href="/standards">Read The Standard</Button>
    <Button href="/taste/insights" variant="secondary">Inspect Signals</Button>
  {/snippet}

  {#snippet aside()}
    <ClearMetadataRail
      eyebrow="Control loop"
      title="Performance Lab benchmark"
      description="A reusable review path for product, site, and agent-output improvements."
      groups={performanceLoopGroups}
      tags={['performance language', 'owned canon', 'reviewed corrections']}
      ariaLabel="Performance Lab loop metadata"
    />
  {/snippet}

  {#snippet after()}
    <ClearCardGrid
      items={performanceLoopCards}
      columns={4}
      density="compact"
      ariaLabel="Performance Lab continuous improvement loop"
    />
  {/snippet}
</ClearPageSection>

<!-- Source Channels -->
<section class="channels-section" id="source-channels">
  <div class="max-w-7xl mx-auto px-6">
    <h2 class="section-title">Source Channels</h2>

    <div class="channels-grid">
      {#each sourceGroups as group}
        <div class="channel-group">
          <h3 class="group-label">{group.label}</h3>
          {#each group.channels as channel}
          <a
            href={channel.isPrimary
              ? `https://www.are.na/create-something/${channel.slug}`
              : `https://www.are.na/search/${channel.slug}`}
            target="_blank"
            rel="noopener"
            class="channel-card"
            class:primary={channel.isPrimary}
          >
            <span class="channel-name">{channel.name}</span>
            <span class="channel-desc">{channel.description}</span>
          </a>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Visual Examples Gallery -->
{#if data.examples && data.examples.length > 0}
  <section class="gallery-section">
    <div class="max-w-7xl mx-auto px-6">
      <h2 class="section-title">Visual References</h2>
      <p class="section-subtitle">{data.examples.length} curated images from Are.na</p>

      <div class="masonry-grid">
        {#each data.examples as example, index}
          <button
            class="example-card"
            onclick={() => openLightbox(index)}
            aria-label={example.title ? `Open ${example.title} reference` : 'Open visual reference'}
          >
            {#if example.image_url}
              <img
                src={example.image_url}
                alt={example.title || 'Visual reference'}
                class="example-img"
                loading="lazy"
              />
            {/if}
            <div class="example-overlay">
              <div class="example-info">
                {#if example.title}
                  <p class="example-title">{example.title}</p>
                {/if}
                {#if example.year}
                  <p class="example-year">{example.year}</p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- Resources -->
{#if data.resources && data.resources.length > 0}
  <section class="resources-section">
    <div class="max-w-4xl mx-auto px-6">
      <h2 class="section-title">Resources</h2>
      <p class="section-subtitle">Links, articles, and references</p>

      <div class="resources-list">
        {#each data.resources as resource}
          <div class="resource-card">
            <div class="resource-content">
              {#if resource.type}
                <span class="resource-type">{resource.type}</span>
              {/if}
              <h4 class="resource-title">{resource.title}</h4>
              {#if resource.description}
                <p class="resource-desc">{resource.description}</p>
              {/if}
            </div>
            {#if resource.url}
              <a href={resource.url} target="_blank" rel="noopener" class="resource-link">
                Open source
              </a>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<ClearPageSection
  variant="soft"
  eyebrow="Derived principles"
  title="What the corpus teaches."
  description="Taste is not imitation. References reveal the aesthetic; implementations express it."
>
  {#snippet after()}
    <ClearCardGrid
      items={principleCards}
      columns={4}
      density="compact"
      ariaLabel="Derived taste principles"
    />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Taste system sprint"
  title="Build a taste system your team and agents can use."
  description="Use TASTE to turn curation into direction for pages, product surfaces, content systems, and AI-assisted delivery."
  items={businessCtaItems}
>
  {#snippet actions()}
    <Button href="https://createsomething.agency">Start With A Taste System</Button>
    <Button href="https://www.are.na/create-something" variant="secondary">Inspect The Source Channel</Button>
  {/snippet}
</ClearCtaBand>

<!-- Image Lightbox -->
{#if data.examples && data.examples.length > 0}
  <ImageLightbox
    images={data.examples}
    currentIndex={selectedImageIndex}
    isOpen={isLightboxOpen}
    onClose={closeLightbox}
    onNavigate={navigateLightbox}
  />
{/if}

<style>
  /* Channels */
  .channels-section {
    padding: var(--space-lg) 0;
    scroll-margin-top: 5.25rem;
  }

  .section-title {
    font-size: var(--text-h2);
    font-weight: 700;
    margin-bottom: var(--space-md);
  }

  .channels-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
  }

  @media (max-width: 768px) {
    .channels-grid {
      grid-template-columns: 1fr;
    }
  }

  .channel-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .group-label {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-xs);
  }

  .channel-card {
    display: flex;
    flex-direction: column;
    min-height: 5.25rem;
    padding: var(--space-sm);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
    text-decoration: none;
  }

  .channel-card:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .channel-card.primary {
    border-color: var(--color-border-emphasis);
  }

  .channel-name {
    font-size: var(--text-body);
    font-weight: 500;
    color: var(--color-fg-primary);
    overflow-wrap: anywhere;
  }

  .channel-desc {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
  }

  /* Gallery */
  .gallery-section {
    padding: var(--space-lg) 0;
  }

  .section-subtitle {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-md);
  }

  .masonry-grid {
    column-count: 2;
    column-gap: 1rem;
  }

  @media (min-width: 768px) {
    .masonry-grid {
      column-count: 3;
    }
  }

  @media (min-width: 1024px) {
    .masonry-grid {
      column-count: 4;
    }
  }

  .example-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    margin-bottom: 1rem;
    break-inside: avoid;
    /* Reset button styles */
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
    width: 100%;
    display: block;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .example-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .example-img {
    width: 100%;
    height: auto;
    display: block;
    transition: transform var(--duration-standard) var(--ease-standard);
  }

  .example-card:hover .example-img {
    transform: scale(1.05);
  }

  .example-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 14, 25, 0.68);
    opacity: 0;
    transition: opacity var(--duration-standard) var(--ease-standard);
  }

  .example-card:hover .example-overlay {
    opacity: 1;
  }

  .example-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-sm);
  }

  .example-title {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .example-year {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    margin-top: 0.25rem;
  }

  /* Resources */
  .resources-section {
    padding: var(--space-lg) 0;
  }

  .resources-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .resource-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .resource-content {
    flex: 1;
    min-width: 0;
  }

  .resource-type {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--color-fg-muted);
    display: block;
    margin-bottom: 0.25rem;
  }

  .resource-title {
    font-size: var(--text-body-lg);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: 0.25rem;
    overflow-wrap: anywhere;
  }

  .resource-desc {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    overflow-wrap: anywhere;
  }

  .resource-link {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
    text-decoration: none;
    white-space: nowrap;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .resource-link:hover {
    color: var(--color-clear-ocean, #315cff);
  }

  @media (max-width: 640px) {
    :global(.taste-hero .clear-page-section__actions) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem;
    }

    :global(.taste-hero .clear-page-section__actions .btn) {
      width: auto;
      min-width: 0;
      padding-inline: 0.65rem;
      font-size: 0.9rem;
      white-space: normal;
    }

    .channels-section,
    .gallery-section,
    .resources-section {
      padding: var(--space-md) 0;
    }

    .section-title {
      font-size: clamp(1.65rem, 11vw, var(--text-h2));
      line-height: 1.08;
    }

    .masonry-grid {
      column-count: 1;
    }

    .resource-card {
      display: grid;
      gap: var(--space-xs);
    }

    .resource-link {
      width: fit-content;
      white-space: normal;
    }
  }
</style>
