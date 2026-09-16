<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { filterProjects, projectKinds } from '$lib/workshop/catalog';
  import '$lib/workshop/workshop.css';
  const query = $derived($page.url.searchParams.get('q') ?? '');
  const kind = $derived($page.url.searchParams.get('type') ?? '');
  const results = $derived(filterProjects(query, kind));
  function update(key: string, value: string) {
    const url = new URL($page.url);
    value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

<SEO
  title="Projects | CREATE SOMETHING .space"
  description="Browse tools, workflows, skills, plugins, and reusable code from the CREATE SOMETHING public workshop."
  propertyName="space"
  ogImage="/images/workshop/open-workshop.webp"
/>
<div class="workshop">
  <header class="section wrap">
    <p class="eyebrow">The collection</p>
    <h1>Find your<br />next useful thing.</h1>
    <p class="lead">
      Complete tools and small parts worth reusing. Each entry links to its source, instructions,
      and boundaries.
    </p>
  </header>
  <section class="wrap collection" aria-label="Project collection">
    <form action="/projects" method="GET" class="filters">
      <label
        >Search projects<input
          name="q"
          type="search"
          placeholder="Try verification, workflow, or design"
          value={query}
          oninput={(event) => update('q', event.currentTarget.value)}
        /></label
      ><label
        >Type<select
          name="type"
          value={kind}
          onchange={(event) => update('type', event.currentTarget.value)}
          ><option value="">All types</option>{#each projectKinds as type}<option value={type}
              >{type === 'Building block'
                ? 'Building blocks'
                : type === 'Skill'
                  ? 'Skills'
                  : type === 'Plugin'
                    ? 'Plugins'
                    : type}</option
            >{/each}</select
        ></label
      ><button class="primary" type="submit">Search</button>
    </form>
    <div class="result-meta">
      <p role="status" aria-live="polite">
        {results.length}
        {results.length === 1 ? 'result' : 'results'}
      </p>
      {#if query || kind}<a class="text-link" href="/projects">Clear filters</a>{/if}
    </div>
    <div class="results">
      {#each results as project}<a class="result" href={`/projects/${project.slug}`}
          ><span class="eyebrow">{project.kind}</span><span
            ><h2>{project.name}</h2>
            <p>{project.summary}</p></span
          ><span class="distribution">{project.distribution} <span aria-hidden="true">↗</span></span
          ></a
        >{:else}<div class="empty">
          <h2>No matching projects.</h2>
          <p>Try a broader word or clear the type filter.</p>
          <a class="text-link" href="/projects">Show all projects</a>
        </div>{/each}
    </div>
    <p class="boundary">
      Package links lead to installation instructions. Source entries are code to inspect and adapt;
      they may need additional dependencies or configuration.
    </p>
  </section>
  <aside class="wrap section">
    <p class="lead">Looking for the Playground, Motion Lab, or data tools?</p>
    <a class="text-link" href="/workbench">Open the Workbench ↗</a>
  </aside>
</div>

<style>
  header h1 {
    margin: 1.5rem 0;
  }
  .filters {
    display: flex;
    align-items: end;
    gap: 1rem;
  }
  label {
    display: grid;
    gap: 0.6rem;
    font-size: 0.8rem;
  }
  label:first-child {
    flex: 1;
  }
  input,
  select {
    width: 100%;
    min-height: 3.2rem;
    border: 1px solid #a5a59f;
    background: transparent;
    padding: 0.85rem;
    border-radius: 0;
    font-size: 1rem;
    color: inherit;
  }
  select {
    min-width: 12rem;
  }
  button {
    min-height: 3.2rem;
    border: 0;
    cursor: pointer;
  }
  .result-meta {
    display: flex;
    justify-content: space-between;
    margin: 1.5rem 0;
    font-size: 0.8rem;
  }
  .result {
    display: grid;
    grid-template-columns: 10rem 1fr 6rem;
    align-items: baseline;
    gap: 2rem;
    border-top: 1px solid #b8b8b0;
    padding: 1.75rem 0;
    text-decoration: none;
  }
  .result h2 {
    font-size: clamp(1.5rem, 3vw, 2.1rem);
    letter-spacing: -0.035em;
  }
  .result p {
    margin-top: 0.5rem;
    color: var(--color-performance-fg-secondary);
  }
  .result:hover h2 {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .distribution {
    font-size: 0.75rem;
    text-align: right;
    white-space: nowrap;
  }
  .empty {
    padding: 3rem 0;
  }
  .empty p {
    margin: 1rem 0;
  }
  .boundary {
    font-size: 0.85rem;
    margin-top: 2rem;
    max-width: 55rem;
  }
  @media (max-width: 640px) {
    .filters {
      flex-wrap: wrap;
    }
    label:first-child {
      flex-basis: 100%;
    }
    label:nth-child(2) {
      flex: 1;
    }
    .result {
      grid-template-columns: 1fr auto;
      gap: 0.7rem;
    }
    .result > .eyebrow {
      grid-column: 1 / -1;
    }
  }
</style>
