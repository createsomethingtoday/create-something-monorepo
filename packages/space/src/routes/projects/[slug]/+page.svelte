<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import '$lib/workshop/workshop.css';
  let { data }: { data: PageData } = $props();
</script>

<SEO
  title={`${data.project.name} | CREATE SOMETHING .space`}
  description={data.project.summary}
  propertyName="space"
  ogImage={data.project.image}
/>
<article class="workshop">
  <header class="wrap section">
    <a class="text-link" href="/projects">← All projects</a>
    <p class="eyebrow category">{data.project.kind} / {data.project.distribution}</p>
    <h1>{data.project.name}</h1>
    <p class="lead summary">{data.project.summary}</p>
  </header>
  <section class="wrap detail" aria-label="Project overview">
    <figure>
      <img
        src={data.project.image}
        alt="A material study of reusable ivory and machined-metal instruments."
        width="1536"
        height="1024"
      />
      <figcaption>Conceptual material study. See the source for the working software.</figcaption>
    </figure>
    <div class="instructions">
      <p class="eyebrow">Put it to work</p>
      <h2>Start here.</h2>
      <p class="lead">{data.project.usage}</p>
      <div class="actions">
        <a class="primary" href={data.project.install ?? data.project.source}
          >{data.project.install ? 'Installation & releases' : 'Source & instructions'} ↗</a
        >{#if data.project.install}<a class="text-link" href={data.project.source}>View source ↗</a
          >{/if}
      </div>
      <div class="limit">
        <h3>Before you begin</h3>
        <p>{data.project.limit}</p>
        <p>
          Source access does not include hosted operation or managed support. Refer to the
          repository for its license and current requirements.
        </p>
      </div>
    </div>
  </section>
  <footer class="wrap section continuation">
    <div>
      <p class="eyebrow">Keep exploring</p>
      <h2>Follow the connections.</h2>
    </div>
    <div>
      {#each data.related as project}<a href={`/projects/${project.slug}`}>{project.name} ↗</a
        >{/each}<a href="/projects">Browse the whole collection ↗</a><a
        href="https://createsomething.io">Read the research ↗</a
      >
    </div>
  </footer>
</article>

<style>
  .category {
    margin: 2.5rem 0 1.25rem;
  }
  .summary {
    margin-top: 1.5rem;
  }
  .detail {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 3rem;
    align-items: start;
  }
  figure {
    margin: 0;
  }
  img {
    width: 100%;
    height: auto;
  }
  figcaption {
    font-size: 0.75rem;
    color: var(--color-performance-fg-secondary);
    margin-top: 0.75rem;
  }
  h2 {
    margin: 1rem 0;
  }
  .limit {
    margin-top: 2.5rem;
    border-top: 1px solid #b8b8b0;
    padding-top: 1.5rem;
  }
  .limit h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  .limit p {
    font-size: 0.9rem;
    margin-top: 0.75rem;
  }
  .continuation {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
  .continuation a {
    display: block;
    padding: 1rem 0;
    border-bottom: 1px solid #b8b8b0;
  }
  @media (max-width: 800px) {
    .detail,
    .continuation {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
</style>
