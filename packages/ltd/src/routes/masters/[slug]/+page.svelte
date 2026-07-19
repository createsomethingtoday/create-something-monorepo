<script lang="ts">
  import { PrincipleCard } from '$lib/components';
  import {
    PerformanceActionFooter,
    PerformanceNarrativeStage,
    QuoteBlock,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let masterScenes = $derived<PerformanceNarrativeScene[]>([
    {
      id: 'context',
      label: 'Context',
      summary: 'Life + legacy',
      title: 'Understand the source before borrowing the principle.',
      detail:
        'See the life and conditions behind the work—and what CREATE SOMETHING carries forward.',
      tone: 'neutral'
    },
    {
      id: 'principles',
      label: 'Principles',
      summary: `${data.principles.length} operating rules`,
      title: 'Translate the philosophy into decisions.',
      detail: 'Use each principle to guide an interface, system, or delivery decision.',
      tone: 'allow',
      receipts: [`${data.principles.length} principles`]
    },
    {
      id: 'evidence',
      label: 'Evidence',
      summary: 'Words + artifacts',
      title: 'Inspect what supports the interpretation.',
      detail: 'Check the quotes, visual references, and source links behind the interpretation.',
      tone: 'review',
      receipts: [
        `${data.quotes.length} quotes`,
        `${data.examples.length} visual references`,
        `${data.resources.length} resources`
      ]
    }
  ]);
</script>

<SEO
  title={data.master ? data.master.name : 'Master Not Found'}
  description={data.master?.tagline ||
    (data.master
      ? `Learn about ${data.master.name} and their principles.`
      : 'Master not found in the canon.')}
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Masters', url: 'https://createsomething.ltd/masters' },
    {
      name: data.master?.name || 'Not Found',
      url: data.master
        ? `https://createsomething.ltd/masters/${data.master.slug}`
        : 'https://createsomething.ltd/masters'
    }
  ]}
/>

{#if data.master}
  <section class="master-opening" aria-label={`${data.master.name} profile opening`}>
    <div>
      <a href="/masters" class="back-link">← All Masters</a>
      {#if data.master.discipline}
        <p class="eyebrow">{data.master.discipline}</p>
      {/if}
      <h1>{data.master.name}</h1>
      {#if data.master.birth_year}
        <p class="years">
          {data.master.birth_year}{#if data.master.death_year}
            — {data.master.death_year}{:else}
            — Present{/if}
        </p>
      {/if}
      {#if data.master.tagline}
        <p class="tagline">{data.master.tagline}</p>
      {/if}
      <p class="opening-direction">
        Read the context first. Then apply the principles and check the evidence.
      </p>
    </div>
  </section>

  <PerformanceNarrativeStage
    id="master-profile"
    eyebrow="Source profile"
    title="Context. Principles. Evidence."
    description="See what shaped the work, what it teaches, and which sources support the interpretation."
    scenes={masterScenes}
    ariaLabel={`${data.master.name} source profile`}
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <div class="master-scene-artifact">
        {#if scene.id === 'context'}
          <div class="context-grid">
            <div>
              <span class="artifact-label">Biography</span>
              {#if data.master?.biography}
                <div class="profile-prose">{@html data.master.biography ?? ''}</div>
              {:else}
                <p class="empty-copy">Biography has not been added yet.</p>
              {/if}
            </div>
            <div>
              <span class="artifact-label">Legacy</span>
              {#if data.master?.legacy}
                <div class="profile-prose">{@html data.master.legacy ?? ''}</div>
              {:else}
                <p class="empty-copy">Legacy notes have not been added yet.</p>
              {/if}
            </div>
          </div>
        {:else if scene.id === 'principles'}
          {#if data.principles.length > 0}
            <div class="principle-grid">
              {#each data.principles as principle}
                <PrincipleCard {principle} />
              {/each}
            </div>
          {:else}
            <p class="empty-copy">No principles are attached to this source yet.</p>
          {/if}
        {:else}
          <div class="evidence-stack">
            {#if data.quotes.length > 0}
              <div>
                <span class="artifact-label">Notable quotes</span>
                <div class="quote-grid">
                  {#each data.quotes as quote}
                    <QuoteBlock {quote} />
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.examples.length > 0}
              <div>
                <span class="artifact-label">Visual references</span>
                <div class="example-grid">
                  {#each data.examples as example}
                    <figure>
                      {#if example.image_url}
                        <img
                          src={example.image_url}
                          alt={example.title || 'Visual reference'}
                          loading="lazy"
                        />
                      {/if}
                      {#if example.title || example.year}
                        <figcaption>
                          {example.title || 'Untitled reference'}{#if example.year}
                            · {example.year}{/if}
                        </figcaption>
                      {/if}
                    </figure>
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.resources.length > 0}
              <div>
                <span class="artifact-label">Resources</span>
                <div class="resource-grid">
                  {#each data.resources as resource}
                    <article>
                      {#if resource.type}<span>{resource.type}</span>{/if}
                      <h4>{resource.title}</h4>
                      {#if resource.description}<p>{resource.description}</p>{/if}
                      {#if resource.url}
                        <a href={resource.url} target="_blank" rel="noopener">View source →</a>
                      {/if}
                    </article>
                  {/each}
                </div>
              </div>
            {/if}

            {#if data.quotes.length === 0 && data.examples.length === 0 && data.resources.length === 0}
              <p class="empty-copy">No supporting artifacts are attached to this source yet.</p>
            {/if}
          </div>
        {/if}
      </div>
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceActionFooter
    eyebrow="Continue the canon"
    title="Carry the source into the work."
    description="Compare these principles with another master, or return to the collection before choosing what guides your next decision."
    items={[
      { label: 'Current source', value: data.master.name },
      { label: 'Operating rules', value: `${data.principles.length} principles` }
    ]}
  >
    {#snippet actions()}
      <a class="btn btn-primary" href="/principles">Compare principles</a>
      <a class="btn btn-secondary" href="/masters">Choose another master</a>
    {/snippet}
  </PerformanceActionFooter>
{:else}
  <section class="not-found">
    <div>
      <h1>Master Not Found</h1>
      <p>This master hasn't been added to the canon yet.</p>
      <a href="/masters">← Back to Masters</a>
    </div>
  </section>
{/if}

<style>
  .master-opening,
  .not-found {
    padding: 6rem 1.5rem 4rem;
    border-bottom: 1px solid var(--color-performance-border-default);
  }

  .master-opening > div,
  .not-found > div {
    width: min(100%, 56rem);
    margin-inline: auto;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 2rem;
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
    text-decoration: none;
  }

  .eyebrow,
  .artifact-label,
  .resource-grid span {
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .master-opening h1,
  .not-found h1 {
    margin: 0.7rem 0;
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    line-height: var(--leading-performance-tight);
    letter-spacing: var(--tracking-performance-tight);
  }

  .years {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .tagline {
    max-width: 30ch;
    margin-top: 1.25rem;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-h2);
    line-height: 1.25;
  }

  .opening-direction {
    max-width: 42rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-performance-border-default);
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body);
    line-height: 1.65;
  }

  .master-scene-artifact,
  .evidence-stack {
    display: grid;
    gap: 2rem;
    min-width: 0;
  }

  .context-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    background: var(--color-performance-line, #d7d7d2);
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .context-grid > div {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    background: var(--color-performance-panel, #ffffff);
  }

  .profile-prose,
  .empty-copy {
    color: var(--color-performance-fg-secondary);
    line-height: 1.72;
  }

  .principle-grid,
  .quote-grid,
  .resource-grid,
  .example-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .principle-grid :global(.card) {
    padding: 1.2rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .quote-grid :global(.quote-block) {
    margin: 0;
    padding: 1rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .example-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .example-grid figure {
    margin: 0;
    background: var(--color-performance-panel, #ffffff);
  }

  .example-grid img {
    display: block;
    width: 100%;
    height: auto;
  }

  .example-grid figcaption {
    padding: 0.75rem;
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
  }

  .resource-grid article {
    display: grid;
    gap: 0.6rem;
    padding: 1.1rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .resource-grid h4,
  .resource-grid p {
    margin: 0;
  }

  .resource-grid p {
    color: var(--color-performance-fg-tertiary);
  }

  .resource-grid a {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-sm);
    font-weight: 600;
  }

  .not-found {
    min-height: 60vh;
    text-align: center;
  }

  .not-found p {
    margin: 1rem 0 2rem;
    color: var(--color-performance-fg-tertiary);
  }

  @media (max-width: 720px) {
    .master-opening,
    .not-found {
      padding: 4.5rem 1rem 2.75rem;
    }

    .context-grid,
    .principle-grid,
    .quote-grid,
    .resource-grid,
    .example-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
