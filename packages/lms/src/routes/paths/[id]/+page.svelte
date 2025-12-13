<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { path } = data;
</script>

<svelte:head>
  <title>{path.title} — CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
  <!-- Path Header -->
  <div class="mb-12">
    <div class="flex items-center gap-3 mb-4">
      <div class="path-dot {path.color}"></div>
      <span class="lesson-count">{path.lessons.length} lessons</span>
    </div>

    <h1 class="path-title">{path.title}</h1>
    <p class="path-subtitle">{path.subtitle}</p>
    <p class="path-description">{path.description}</p>

    <!-- Principle -->
    <div class="principle-box">
      <div class="principle-label">Guiding Principle</div>
      <div class="principle-text">{path.principle}</div>
    </div>

    <!-- Prerequisites -->
    {#if path.prerequisites && path.prerequisites.length > 0}
      <div class="prerequisites">
        <span class="prerequisites-label">Prerequisites:</span>
        <span class="prerequisites-list">{path.prerequisites.join(', ')}</span>
      </div>
    {/if}

    <!-- Start Button -->
    <div class="flex gap-4 mt-8">
      <a href="/paths/{path.id}/{path.lessons[0].id}" class="btn-primary">
        Start Path
      </a>
      <a href="/paths" class="btn-secondary">
        Back to Paths
      </a>
    </div>
  </div>

  <!-- Lessons List -->
  <section>
    <h2 class="section-title">Lessons</h2>

    <div class="flex flex-col gap-4">
      {#each path.lessons as lesson, index}
        <a href="/paths/{path.id}/{lesson.id}" class="lesson-card">
          <!-- Lesson Number -->
          <div class="lesson-number">{index + 1}</div>

          <!-- Lesson Content -->
          <div class="flex-1">
            <h3 class="lesson-title">{lesson.title}</h3>
            <p class="lesson-description">{lesson.description}</p>

            <div class="flex items-center gap-4 mt-2">
              <span class="lesson-meta">{lesson.duration}</span>
              {#if lesson.praxis}
                <span class="praxis-badge">Includes Praxis Exercise</span>
              {/if}
            </div>
          </div>

          <!-- Arrow -->
          <div class="lesson-arrow">→</div>
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
    font-weight: 300;
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
    line-height: 1.6;
  }

  .principle-box {
    margin-top: var(--space-lg);
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
  }

  .principle-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .principle-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    font-style: italic;
  }

  .prerequisites {
    margin-top: var(--space-md);
    font-size: var(--text-body-sm);
  }

  .prerequisites-label {
    color: var(--color-fg-muted);
  }

  .prerequisites-list {
    color: var(--color-fg-tertiary);
  }

  .btn-primary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: 500;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  .btn-secondary {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .btn-secondary:hover {
    border-color: var(--color-border-strong);
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
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .lesson-card:hover {
    border-color: var(--color-border-emphasis);
  }

  .lesson-card:hover .lesson-arrow {
    transform: translateX(0.25rem);
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
    font-weight: 500;
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

  .praxis-badge {
    font-size: var(--text-caption);
    color: var(--color-data-1);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(96, 165, 250, 0.1);
  }

  .lesson-arrow {
    font-size: var(--text-h3);
    color: var(--color-fg-muted);
    transition: transform var(--duration-micro) var(--ease-standard);
  }
</style>
