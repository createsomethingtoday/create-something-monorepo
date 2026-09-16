<script lang="ts">
  import type { WorkshopProject } from './catalog';
  let { project, index = 0 }: { project: WorkshopProject; index?: number } = $props();
</script>

<a class="project-card" href={`/projects/${project.slug}`}>
  <div class="project-card__image">
    <img src={project.image} alt="" width="1536" height="1024" loading="lazy" />
  </div>
  <div class="project-card__meta">
    <span>{String(index + 1).padStart(2, '0')} / {project.kind}</span><span
      >{project.distribution} ↗</span
    >
  </div>
  <h3>{project.name}</h3>
  <p>{project.summary}</p>
</a>

<style>
  .project-card {
    display: block;
    color: inherit;
    text-decoration: none;
  }
  .project-card__image {
    overflow: hidden;
    background: var(--color-performance-ink);
    aspect-ratio: 3 / 2;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 200ms ease;
  }
  a:hover img {
    transform: scale(1.025);
  }
  .project-card__meta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.2rem;
    font: 0.7rem var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h3 {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    letter-spacing: -0.04em;
    line-height: 1.1;
    margin: 0.75rem 0;
  }
  p {
    max-width: 36rem;
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
  }
  a:focus-visible {
    outline: 3px solid var(--color-performance-signal-blue, #2458d3);
    outline-offset: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    img {
      transition: none;
    }
    a:hover img {
      transform: none;
    }
  }
</style>
