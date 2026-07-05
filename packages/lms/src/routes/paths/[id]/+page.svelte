<script lang="ts">
  import type { PageData } from './$types';
  import { ChevronRight } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const path = $derived(data.path);
</script>

<svelte:head>
  <title>{path.title} — CREATE SOMETHING Learn</title>
  <meta name="description" content={path.description} />
</svelte:head>

<div class="path-shell">
  <header class="path-hero">
    <div class="path-kicker">
      <div class="path-dot {path.color}"></div>
      <span class="lesson-count">{path.lessons.length} lessons</span>
    </div>

    <h1 class="path-title">{path.title}</h1>
    <p class="path-subtitle">{path.subtitle}</p>
    <p class="path-description">{path.description}</p>

    <div class="path-actions">
      <a href="/paths/{path.id}/{path.lessons[0].id}" class="btn-primary">Start Lesson 1</a>
      <a href="/paths" class="btn-secondary">Back to Course</a>
    </div>
  </header>

  <section>
    <h2 class="section-title">Lessons</h2>

    <div class="flex flex-col gap-4">
      {#each path.lessons as lesson, index}
        <a href="/paths/{path.id}/{lesson.id}" class="lesson-card">
          <div class="lesson-number">{index + 1}</div>

          <div class="flex-1">
            <h3 class="lesson-title">{lesson.title}</h3>
            <p class="lesson-description">{lesson.description}</p>

            <div class="flex items-center gap-4 mt-2">
              <span class="lesson-meta">{lesson.duration}</span>
            </div>
          </div>

          <div class="lesson-arrow"><ChevronRight size={24} /></div>
        </a>
      {/each}
    </div>
  </section>
</div>

<style>
  .path-shell {
    width: min(56rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding: clamp(3rem, 8vw, 5.25rem) 0 clamp(4rem, 8vw, 6rem);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .path-hero {
    display: grid;
    gap: var(--space-md);
    margin-bottom: clamp(3rem, 7vw, 5rem);
  }

  .path-kicker {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 1.9rem;
    align-items: center;
    gap: 0.55rem;
    padding: 0.36rem 0.62rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .path-dot {
    width: 0.72rem;
    height: 0.72rem;
    flex: 0 0 auto;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .lesson-count {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    line-height: 1.15;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .path-title {
    max-width: 12ch;
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: var(--text-display);
    font-weight: var(--font-medium);
    line-height: 0.98;
    letter-spacing: 0;
  }

  .path-subtitle {
    max-width: 42rem;
    margin: 0;
    font-size: var(--text-h3);
    color: var(--color-clear-onyx, #0a0e19);
    font-weight: var(--font-medium);
    line-height: var(--leading-tight);
  }

  .path-description {
    max-width: 46rem;
    margin: 0;
    font-size: var(--text-body-lg);
    color: var(--color-clear-grey, #636363);
    line-height: var(--leading-relaxed);
  }

  .path-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: var(--space-sm);
  }

  .btn-primary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-clear-sm, 4px);
    border: 1px solid var(--color-clear-onyx, #0a0e19);
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
    font-size: var(--text-body);
    font-weight: var(--font-medium);
  }

  .btn-secondary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-clear-sm, 4px);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    font-size: var(--text-body);
  }

  .section-title {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: var(--text-h2);
    font-weight: var(--font-medium);
    margin-bottom: var(--space-lg);
  }

  .lesson-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--radius-clear-md, 8px);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .lesson-card:hover {
    border-color: var(--color-clear-border-strong, #cecece);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .lesson-number {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-full);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-body-sm);
    color: var(--color-clear-grey, #636363);
    font-weight: var(--font-medium);
  }

  .lesson-title {
    font-size: var(--text-h3);
    color: var(--color-clear-onyx, #0a0e19);
    font-weight: var(--font-semibold);
    margin-bottom: 0.25rem;
  }

  .lesson-description {
    font-size: var(--text-body-sm);
    color: var(--color-clear-grey, #636363);
    line-height: var(--leading-relaxed);
  }

  .lesson-meta {
    font-size: var(--text-caption);
    color: var(--color-clear-grey-quiet, #818181);
  }

  .lesson-arrow {
    display: flex;
    align-items: center;
    color: var(--color-clear-grey, #636363);
  }

  @media (max-width: 720px) {
    .lesson-card {
      align-items: flex-start;
    }
  }
</style>
