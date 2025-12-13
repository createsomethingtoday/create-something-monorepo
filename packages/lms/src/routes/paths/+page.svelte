<script lang="ts">
  import { PATHS } from '$content/paths';
</script>

<svelte:head>
  <title>Learning Paths | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-12">
  <h1 class="page-title">Learning Paths</h1>
  <p class="page-subtitle">
    Six interconnected paths teaching the CREATE SOMETHING ethos.
    Each path follows the hermeneutic spiral: Read → Practice → Reflect.
  </p>

  <div class="paths-list">
    {#each PATHS as path, index}
      <a href="/paths/{path.id}" class="path-row {path.color}">
        <div class="flex items-start gap-6">
          <!-- Number -->
          <div class="path-number">
            {String(index + 1).padStart(2, '0')}
          </div>

          <!-- Content -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <div class="path-dot"></div>
              <h2 class="path-title">{path.title}</h2>
              <span class="path-subtitle-inline">— {path.subtitle}</span>
            </div>

            <p class="path-description">{path.description}</p>

            <div class="path-meta">
              <span>{path.lessons.length} lessons</span>
              {#if path.prerequisites && path.prerequisites.length > 0}
                <span>Requires: {path.prerequisites.join(', ')}</span>
              {/if}
            </div>

            <!-- Principle -->
            <blockquote class="path-principle">"{path.principle}"</blockquote>
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    margin-bottom: var(--space-sm);
  }

  .page-subtitle {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xl);
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .path-row {
    display: block;
    padding: var(--space-lg);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .path-row:hover {
    border-color: var(--color-border-emphasis);
  }

  .path-number {
    font-size: var(--text-h1);
    font-weight: 300;
    color: var(--color-fg-muted);
    width: 3rem;
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .path-title {
    font-size: var(--text-h3);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .path-row:hover .path-title {
    color: var(--color-fg-primary);
  }

  .path-subtitle-inline {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .path-description {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }

  .path-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .path-principle {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
    font-style: italic;
    color: var(--color-fg-muted);
  }
</style>
