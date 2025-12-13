<script lang="ts">
  import { PATHS } from '$content/paths';
  import { BookOpen, Hammer, MessageCircle, ArrowRight, RotateCcw } from 'lucide-svelte';
</script>

<svelte:head>
  <title>CREATE SOMETHING LMS</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-6 py-16">
  <!-- Hero -->
  <section class="text-center mb-20">
    <h1 class="hero-title">Learn the Ethos</h1>
    <p class="hero-subtitle">Creation is the discipline of removing what obscures.</p>
    <p class="hero-description">Six paths. One philosophy. Understanding through practice.</p>
  </section>

  <!-- Paths Grid -->
  <section class="mb-20">
    <h2 class="section-title">Learning Paths</h2>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each PATHS as path}
        <a href="/paths/{path.id}" class="path-card {path.color}">
          <!-- Path indicator -->
          <div class="flex items-center gap-3 mb-4">
            <div class="path-dot"></div>
            <span class="lesson-count">{path.lessons.length} lessons</span>
          </div>

          <!-- Title -->
          <h3 class="path-title">{path.title}</h3>
          <p class="path-subtitle">{path.subtitle}</p>

          <!-- Description -->
          <p class="path-description">{path.description}</p>

          <!-- Prerequisites -->
          {#if path.prerequisites && path.prerequisites.length > 0}
            <div class="prerequisites">
              <span>Requires: {path.prerequisites.join(', ')}</span>
            </div>
          {/if}
        </a>
      {/each}
    </div>
  </section>

  <!-- Philosophy -->
  <section class="philosophy-section">
    <h2 class="section-title center">The Hermeneutic Spiral</h2>
    <p class="philosophy-text">
      Learning is not linear. Each return to a concept deepens understanding.
      Read, practice, reflect—then return with new eyes.
    </p>

    <div class="spiral-steps">
      <div class="spiral-step">
        <div class="spiral-icon"><BookOpen size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Read</div>
      </div>
      <div class="spiral-arrow"><ArrowRight size={24} /></div>
      <div class="spiral-step">
        <div class="spiral-icon"><Hammer size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Practice</div>
      </div>
      <div class="spiral-arrow"><ArrowRight size={24} /></div>
      <div class="spiral-step">
        <div class="spiral-icon"><MessageCircle size={32} strokeWidth={1.5} /></div>
        <div class="spiral-label">Reflect</div>
      </div>
      <div class="spiral-arrow"><RotateCcw size={24} /></div>
    </div>
  </section>
</div>

<style>
  .hero-title {
    font-size: var(--text-display);
    font-weight: 300;
    margin-bottom: var(--space-md);
  }

  .hero-subtitle {
    color: var(--color-fg-secondary);
    font-size: var(--text-h3);
    max-width: 42rem;
    margin: 0 auto var(--space-sm);
  }

  .hero-description {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-lg);
    max-width: 36rem;
    margin: 0 auto;
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-lg);
  }

  .section-title.center {
    text-align: center;
    margin-bottom: var(--space-md);
  }

  .path-card {
    display: block;
    padding: var(--space-md);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .path-card:hover {
    border-color: var(--color-border-emphasis);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
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
    font-size: var(--text-h3);
    margin-bottom: 0.25rem;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .path-card:hover .path-title {
    color: var(--color-fg-primary);
  }

  .path-subtitle {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-sm);
  }

  .path-description {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prerequisites {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .philosophy-section {
    text-align: center;
    padding: var(--space-xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .philosophy-text {
    color: var(--color-fg-secondary);
    max-width: 42rem;
    margin: 0 auto var(--space-lg);
  }

  .spiral-steps {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-lg);
    color: var(--color-fg-tertiary);
  }

  .spiral-step {
    text-align: center;
  }

  .spiral-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.5rem;
    color: var(--color-fg-secondary);
  }

  .spiral-label {
    font-size: var(--text-body-sm);
  }

  .spiral-arrow {
    font-size: var(--text-h3);
  }
</style>
