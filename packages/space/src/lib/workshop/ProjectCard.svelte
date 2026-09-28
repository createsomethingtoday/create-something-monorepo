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
    min-width: 0;
    min-height: 10rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line);
    border-radius: 8px;
    background: var(--color-performance-panel);
    color: inherit;
    text-decoration: none;
  }
  .project-card:hover { background: var(--color-performance-court); }
  .project-card__image {
    display: none;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--duration-performance-micro) ease;
  }
  a:hover img {
    transform: scale(1.025);
  }
  .project-card__meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    flex-wrap: wrap;
    margin-top: 0;
    font: 0.7rem var(--font-performance-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h3 {
    font-size: clamp(1.1rem, 1.6vw, 1.35rem);
    letter-spacing: -0.04em;
    line-height: 1.1;
    margin: 0.65rem 0;
  }
  p {
    max-width: 36rem;
    color: var(--color-performance-fg-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  a:focus-visible {
    outline: 3px solid var(--color-performance-signal);
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
