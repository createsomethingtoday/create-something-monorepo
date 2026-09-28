<script lang="ts">
  import { SEO } from '@create-something/canon';
  import ProjectCard from '$lib/workshop/ProjectCard.svelte';
  import { projects, workbenchTools } from '$lib/workshop/catalog';
  import '$lib/workshop/workshop.css';
</script>

<SEO
  title="The Public Workshop | CREATE SOMETHING .space"
  description="Tools, workflows, skills, and building blocks from CREATE SOMETHING. Find something useful, inspect the source, and make it your own."
  ogImage="/images/workshop/open-workshop.webp"
  propertyName="space"
/>
<div class="workshop">
  <section data-mobile-search-boundary class="opening" aria-labelledby="workshop-title">
    <div class="opening__copy">
      <p class="eyebrow">CREATE SOMETHING / The public workshop</p>
      <h1 id="workshop-title">Useful tools.<br />Shared openly.</h1>
      <p class="lead">
        Workflows, systems, skills, and plugins shaped by the work we do. Find something useful.
        Make it your own.
      </p>
      <div class="actions">
        <a class="primary" href="/projects">Explore projects ↗</a><a
          class="text-link"
          href="/workbench">Open the Workbench</a
        >
      </div>
    </div>
  </section>
  <section class="section wrap" aria-labelledby="selected-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">01 / Selected work</p>
        <h2 id="selected-title">A few good places<br />to begin.</h2>
      </div>
      <a class="text-link" href="/projects">All {projects.length} projects and building blocks ↗</a>
    </div>
    <div class="project-grid">
      {#each projects.filter((project) => project.featured) as project, index}<ProjectCard
          {project}
          {index}
        />{/each}
    </div>
    <figure class="material-study">
      <img src="/images/workshop/open-workshop.webp" alt="Ivory modules lift from a machined docking rail, a material study of tools made for reuse." width="1536" height="1024" loading="lazy" />
      <figcaption class="eyebrow">Study 01 / Made to be taken apart</figcaption>
    </figure>
  </section>
  <section class="workbench section" aria-labelledby="workbench-title">
    <div class="wrap workbench__grid">
      <div>
        <p class="eyebrow">02 / The Workbench</p>
        <h2 id="workbench-title">Try it.<br />See what happens.</h2>
        <p class="lead">
          The playground, labs, and data tools are still here. Open a familiar tool or follow your
          curiosity somewhere new.
        </p>
        <div class="actions">
          <a class="primary" href="/workbench">Open the Workbench ↗</a>
        </div>
      </div>
      <div class="tool-list">
        {#each workbenchTools as tool}<a href={tool.href}
            ><span><strong>{tool.name}</strong><small>{tool.description}</small></span><span
              aria-hidden="true">↗</span
            ></a
          >{/each}
      </div>
    </div>
  </section>
  <section class="section wrap closing" aria-labelledby="closing-title">
    <p class="eyebrow">03 / In good company</p>
    <h2 id="closing-title">Use the work.<br />Help it get better.</h2>
    <p class="lead">
      Read the source, report what breaks, or share what you build. The project repositories are
      where the work continues.
    </p>
    <div class="actions">
      <a class="primary" href="https://github.com/createsomethingtoday">Find us on GitHub ↗</a><a
        class="text-link"
        href="/about">About the workshop</a
      >
    </div>
  </section>
</div>

<style>
  .opening {
    display: block;
    padding: 0;
    border-bottom: 1px solid var(--color-performance-line);
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
  }
  .opening__copy {
    width: min(1280px, calc(100% - 2 * var(--space-performance-lg)));
    margin-inline: auto;
    padding: clamp(1.75rem, 4vw, 3rem) 0;
  }
  .opening .eyebrow {
    color: var(--color-performance-muted);
    margin-bottom: 0.75rem;
  }
  .opening .lead {
    margin-top: 1rem;
    color: var(--color-performance-muted);
    max-width: 42rem;
  }
  .opening .primary {
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .material-study {
    position: relative;
    min-width: 0;
    margin: 1.5rem 0 0;
    max-width: 38rem;
  }
  .material-study img {
    width: 100%;
    height: auto;
    max-height: 15rem;
    object-fit: cover;
    border-radius: 8px;
  }
  figcaption {
    position: absolute;
    bottom: 1.5rem;
    left: 1.5rem;
    background: var(--color-performance-paper);
    padding: 0.5rem 0.75rem;
    margin: 0 !important;
  }
  .workbench {
    background: var(--color-performance-court, #e6e6e0);
  }
  .workbench__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-performance-xl);
  }
  .workbench h2,
  .closing h2 {
    margin-block: 1.5rem;
  }
  .tool-list a {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: var(--space-performance-sm);
    border-bottom: 1px solid var(--color-performance-line-strong);
    text-decoration: none;
  }
  .tool-list a:hover {
    background: var(--color-performance-paper);
  }
  .tool-list a:first-child {
    border-top: 1px solid var(--color-performance-line-strong);
  }
  .tool-list strong {
    font-size: 1.25rem;
    font-weight: 500;
  }
  .tool-list small {
    display: block;
    margin-top: 0.4rem;
    color: var(--color-performance-fg-secondary);
    font-size: 0.9rem;
  }
  .closing {
    max-width: 1280px;
  }
  @media (max-width: 900px) {
    .opening__copy {
      width: calc(100% - 2 * var(--space-performance-sm));
      padding: 1.5rem 0;
    }
    .workbench__grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
</style>
