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

<div class="max-w-4xl mx-auto px-6 py-16">
  <div class="mb-12">
    <div class="flex items-center gap-3 mb-4">
      <div class="path-dot {path.color}"></div>
      <span class="lesson-count">{path.lessons.length} lessons</span>
    </div>

    <h1 class="path-title">{path.title}</h1>
    <p class="path-subtitle">{path.subtitle}</p>
    <p class="path-description">{path.description}</p>

    <div class="flex gap-4 mt-8">
      <a href="/paths/{path.id}/{path.lessons[0].id}" class="btn-primary">Start Lesson 1</a>
      <a href="/paths" class="btn-secondary">Back to Course</a>
    </div>
  </div>

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
  .path-dot {
    width: 1rem;
    height: 1rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .lesson-count {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .path-title {
    font-size: var(--text-display);
    font-weight: var(--font-light);
    margin-bottom: var(--space-sm);
  }

  .path-subtitle {
    font-size: var(--text-h3);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .path-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-tertiary);
    line-height: var(--leading-relaxed);
  }

  .btn-primary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: var(--font-medium);
  }

  .btn-secondary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-lg);
  }

  .lesson-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
  }

  .lesson-number {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-full);
    background: var(--color-bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    font-weight: var(--font-medium);
  }

  .lesson-title {
    font-size: var(--text-h3);
    margin-bottom: 0.25rem;
  }

  .lesson-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .lesson-meta {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .lesson-arrow {
    display: flex;
    align-items: center;
    color: var(--color-fg-muted);
  }
</style>
